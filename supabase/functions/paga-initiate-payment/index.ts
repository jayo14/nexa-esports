import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

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

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check deposits enabled
    const { data: depositSetting } = await supabaseAdmin
      .from("clan_settings")
      .select("value")
      .eq("key", "deposits_enabled")
      .maybeSingle();

    if (depositSetting && depositSetting.value === false) {
      return new Response(
        JSON.stringify({ error: "Deposits are currently disabled by the clan master.", status: "error" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    const { amount, customer, redirect_url } = await req.json();

    if (!amount || amount < 500) {
      return new Response(JSON.stringify({ error: "Minimum amount is ₦500" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (amount > 50000) {
      return new Response(JSON.stringify({ error: "Maximum amount is ₦50,000" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!customer?.email) {
      return new Response(JSON.stringify({ error: "Customer email is required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const referenceNumber = generateReferenceNumber("NX");
    const callbackUrl = redirect_url || `${origin}/payment-success`;

    // Paga Collect API hash: referenceNumber + amount + currency + customerPhoneNumber + customerEmail + salt
    // Note: Use exact parameter order as per Paga docs
    const hash = await generatePagaBusinessHash(
      [referenceNumber, String(amount), "NGN", customer.phone || "", customer.email],
      PAGA_HASH_KEY
    );

    const payload = {
      referenceNumber,
      amount,
      currency: "NGN",
      callbackUrl,
      phoneNumber: customer.phone || "",
      email: customer.email,
      firstName: (customer.name || "Nexa User").split(" ")[0],
      lastName: (customer.name || "Nexa User").split(" ").slice(1).join(" ") || "User",
      paymentContextDescription: "Wallet Funding",
      isMerchantPayment: false,
      displayName: "Nexa Elite Nexus",
      allowPartialPayment: false,
      expiryDateTimeUTC: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    console.log("Initiating Paga Collect payment...");

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/collectMoney`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
      body: JSON.stringify(payload),
    });

    const responseText = await pagaResponse.text();
    let pagaData: any;
    try {
      pagaData = JSON.parse(responseText);
    } catch {
      console.error("Paga response not valid JSON:", responseText);
      return new Response(
        JSON.stringify({ error: "Invalid response from payment provider", details: responseText.substring(0, 200) }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Paga response:", JSON.stringify(pagaData));

    if (!pagaResponse.ok || (pagaData.responseCode !== 0 && pagaData.responseCode !== "0")) {
      return new Response(
        JSON.stringify({
          error: "Payment initialization failed",
          details: pagaData.responseMessage || "Unknown error",
          paga_response: pagaData,
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Store pending payment reference with userId in metadata table for later verification
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "deposit",
      status: "pending",
      amount,
      reference: referenceNumber,
      metadata: { userId: user.id, email: customer.email, source: "paga" },
    }).then(({ error }) => {
      if (error) console.warn("Could not pre-log pending transaction:", error.message);
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: {
          link: pagaData.url || pagaData.paymentUrl || pagaData.redirectUrl,
          tx_ref: referenceNumber,
          referenceNumber,
        },
      }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error initiating Paga payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
