import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash, pagaHeaders } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

type ProviderState = "success" | "failed" | "processing";

function mapProviderState(payload: Record<string, unknown> | undefined): ProviderState {
  if (!payload) return "processing";

  const responseCode = payload.responseCode;
  const statusText = String(
    payload.transactionStatus || payload.status || payload.responseMessage || payload.message || ""
  ).toUpperCase();

  if (responseCode === 0 || responseCode === "0") return "success";
  if (statusText.includes("SUCCESS")) return "success";

  const failedSignals = ["FAILED", "FAIL", "ERROR", "DECLINED", "REJECT", "REVERSED", "CANCEL"];
  if (failedSignals.some((signal) => statusText.includes(signal))) return "failed";

  const processingSignals = ["PENDING", "PROCESS", "IN_PROGRESS", "QUEUED", "ACCEPTED", "INITIATED"];
  if (processingSignals.some((signal) => statusText.includes(signal))) return "processing";

  return "processing";
}

/**
 * Attempts Paga's transactionStatus API.
 */
async function checkPagaTransactionStatus(
  reference: string,
  baseUrl: string,
  publicKey: string,
  apiPassword: string,
  hashKey: string
): Promise<{ state: ProviderState; amount?: number; raw?: Record<string, unknown> }> {
  try {
    const hash = await generatePagaBusinessHash([reference], hashKey);
    const response = await fetch(`${baseUrl}/transactionStatus`, {
      method: "POST",
      headers: pagaHeaders(publicKey, apiPassword, hash),
      body: JSON.stringify({ referenceNumber: reference }),
    });

    const text = await response.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch { return { state: "processing" }; }

    console.log("Paga transactionStatus raw:", JSON.stringify(data));

    const state = mapProviderState(data);

    const amount =
      (data.amount as number) ||
      (data.transactionAmount as number) ||
      undefined;

    return { state, amount, raw: data };
  } catch (err) {
    console.error("Paga transactionStatus error:", err);
    return { state: "processing" };
  }
}

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY  = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY    = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_IS_SANDBOX  = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  const PAGA_BASE_URL    = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status,
    });

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      return respond({ error: "Payment service not configured: Paga credentials missing" }, 500);
    }

    const { referenceNumber, tx_ref, pagaData: clientPagaData } = await req.json();
    const reference = referenceNumber || tx_ref;

    if (!reference) {
      return respond({ error: "referenceNumber or tx_ref is required" }, 400);
    }

    // ── Step 1: Idempotency check ─────────────────────────────────────────────
    // If our DB already shows success (webhook fired), return immediately.
    const { data: existingTx, error: txLookupErr } = await supabaseAdmin
      .from("transactions")
      .select("id, status, amount, user_id, wallet_id, metadata")
      .eq("reference", reference)
      .maybeSingle();

    if (txLookupErr) console.warn("Transaction lookup error:", txLookupErr.message);

    if (existingTx?.status === "success") {
      // Fetch updated wallet balance to return to client
      let newBalance: number | null = null;
      const walletQuery = existingTx.user_id
        ? supabaseAdmin.from("wallets").select("balance").eq("user_id", existingTx.user_id).maybeSingle()
        : existingTx.wallet_id
        ? supabaseAdmin.from("wallets").select("balance").eq("id", existingTx.wallet_id).maybeSingle()
        : Promise.resolve({ data: null });

      const { data: wallet } = await walletQuery;
      newBalance = wallet ? Number((wallet as any).balance) : null;
      console.log("Transaction already processed (idempotent):", reference);
      return respond({ message: "Transaction already processed", status: "success", newBalance });
    }

    // ── Step 2: Try Paga transactionStatus API ────────────────────────────────
    const pagaCheck = await checkPagaTransactionStatus(
      reference,
      PAGA_BASE_URL,
      PAGA_PUBLIC_KEY!,
      PAGA_API_PASSWORD!,
      PAGA_HASH_KEY!
    );

    // ── Step 3: Determine amount to credit ───────────────────────────────────
    // Prefer Paga's verified amount → DB pre-logged amount → client-sent Paga data amount
    const clientAmount =
      clientPagaData?.paymentDetails?.amount ||
      clientPagaData?.paymentDetails?.total;

    const amountToCredit =
      pagaCheck.amount ||
      (existingTx?.amount ? Number(existingTx.amount) : null) ||
      (clientAmount ? Number(clientAmount) : null);

    if (pagaCheck.state === "success" && !amountToCredit) {
      console.error("No amount available for reference:", reference);
      return respond({ error: "Cannot determine payment amount. Contact support." }, 400);
    }

    // ── Step 4: Resolve user_id ───────────────────────────────────────────────
    // Primary: from pre-logged transaction.
    // Fallback: from the authenticated user's JWT (user must still be logged in
    // when /payment-success calls this function).
    let userId: string | null = existingTx?.user_id ?? null;

    if (!userId) {
      // Try authenticating via the Authorization header from the success page
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        try {
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const anonClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
          );
          const { data: { user: authUser } } = await anonClient.auth.getUser();
          if (authUser?.id) {
            userId = authUser.id;
            console.log("Resolved user_id from JWT fallback:", userId);
          }
        } catch (authErr) {
          console.warn("JWT auth fallback failed:", authErr);
        }
      }
    }

    if (!userId) {
      console.error("user_id not found for reference:", reference);
      return respond({ error: "Session expired. Please log into the NeXa app and check your wallet — your payment may already be credited." }, 400);
    }

    if (pagaCheck.state === "processing") {
      // Keep as processing and let webhook settle it. Never credit on uncertain state.
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "processing",
          paga_reference: reference,
          paga_status: "processing",
          paga_raw_response: pagaCheck.raw ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
        .in("status", ["pending", "processing"]);

      return respond({
        status: "processing",
        message: "Payment is still processing. Wallet will update automatically once confirmed.",
        reference,
      });
    }

    if (pagaCheck.state === "failed") {
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "failed",
          paga_reference: reference,
          paga_status: "failed",
          paga_raw_response: pagaCheck.raw ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
        .in("status", ["pending", "processing"]);

      return respond({
        status: "failed",
        error: "Payment was not successful.",
        reference,
      });
    }

    console.log("Paga confirmed payment. Crediting wallet for user:", userId);

    // ── Step 5: Credit wallet via RPC (idempotent) ────────────────────────────
    const walletType = (existingTx as any)?.metadata?.walletType || "clan";
    const { data: newBalance, error: creditError } = await supabaseAdmin.rpc("credit_wallet", {
      p_user_id:   userId,
      p_amount:    amountToCredit,
      p_reference: reference,
      p_currency:  "NGN",
      p_wallet_type: walletType,
    });

    if (creditError) {
      console.error("Error crediting wallet:", creditError);
      return respond({ error: "Error crediting wallet", details: creditError.message }, 500);
    }

    await supabaseAdmin
      .from("transactions")
      .update({
        paga_reference: reference,
        paga_status: "success",
        paga_raw_response: pagaCheck.raw ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    console.log("Wallet credited successfully:", { reference, userId, amountToCredit, newBalance });
    return respond({
      status: "success",
      message: "Payment verified and wallet credited",
      newBalance: Number(newBalance),
    });


  } catch (error) {
    console.error("Error in paga-verify-payment:", error);
    return respond(
      { error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
});
