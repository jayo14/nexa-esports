import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash, pagaHeaders } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

  const PAGA_BASE_URL = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured: Paga credentials missing" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const { referenceNumber, tx_ref } = await req.json();
    const reference = referenceNumber || tx_ref;

    if (!reference) {
      return new Response(JSON.stringify({ error: "referenceNumber or tx_ref is required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Idempotency: check if already processed
    const { data: existingTx } = await supabaseAdmin
      .from("transactions")
      .select("id, status, amount, user_id")
      .eq("reference", reference)
      .maybeSingle();

    if (existingTx && existingTx.status === "success") {
      return new Response(
        JSON.stringify({ message: "Transaction already processed", status: "success" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Paga transaction status hash: referenceNumber + salt
    const hash = await generatePagaBusinessHash([reference], PAGA_HASH_KEY);

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/getMerchantTransactionDetails`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
      body: JSON.stringify({ referenceNumber: reference }),
    });

    const responseText = await pagaResponse.text();
    let pagaData: any;
    try {
      pagaData = JSON.parse(responseText);
    } catch {
      console.error("Paga verify response not valid JSON:", responseText);
      return new Response(
        JSON.stringify({ error: "Invalid response from payment provider" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Paga verify response:", JSON.stringify(pagaData));

    const isSuccess =
      pagaData.responseCode === 0 ||
      pagaData.responseCode === "0" ||
      pagaData.status === "SUCCESS" ||
      pagaData.transactionStatus === "SUCCESS";

    if (!isSuccess) {
      return new Response(
        JSON.stringify({ error: "Payment not successful", data: pagaData }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Extract user from the pending transaction or from Paga metadata
    let userId = existingTx?.user_id || pagaData.metadata?.userId;
    const amount = pagaData.amount || pagaData.transactionAmount || existingTx?.amount;

    if (!userId) {
      // Try to look up by reference in metadata
      const { data: pendingTx } = await supabaseAdmin
        .from("transactions")
        .select("user_id, amount")
        .eq("reference", reference)
        .maybeSingle();
      userId = pendingTx?.user_id;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID not found. Cannot credit wallet." }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Credit wallet using RPC (idempotent)
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc("credit_wallet", {
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_currency: "NGN",
    });

    if (creditError) {
      console.error("Error crediting wallet:", creditError);
      return new Response(
        JSON.stringify({ error: "Error crediting wallet", details: creditError }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ status: "success", message: "Payment verified and wallet credited", newBalance }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error verifying Paga payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
