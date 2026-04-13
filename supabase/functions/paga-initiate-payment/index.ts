import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateReferenceNumber } from "../_shared/pagaAuth.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  const PAGA_CALLBACK_URL = Deno.env.get("PAGA_CALLBACK_URL")?.trim();

  try {
    if (!PAGA_PUBLIC_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured: PAGA_PUBLIC_KEY missing" }),
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

    // ── Resolve the browser redirect URL ────────────────────────────────────
    // Priority:
    //  1. PAGA_FRONTEND_URL env var  (explicit production frontend URL)
    //  2. client-supplied redirect_url  (set to window.location.origin + /payment-success)
    //  3. PAGA_CALLBACK_URL env var  (legacy fallback — may be the webhook URL, so lowest priority)
    //
    // NOTE: PAGA_CALLBACK_URL is intentionally deprioritised because it is often
    // set to the server-side webhook endpoint, NOT to the user-facing page.
    const PAGA_FRONTEND_URL = Deno.env.get("PAGA_FRONTEND_URL")?.trim();

    let callbackUrl: string | null = null;
    if (PAGA_FRONTEND_URL) {
      callbackUrl = PAGA_FRONTEND_URL;
    } else if (redirect_url && redirect_url.startsWith("https://")) {
      callbackUrl = redirect_url;
    } else if (PAGA_CALLBACK_URL && PAGA_CALLBACK_URL.startsWith("https://")) {
      callbackUrl = PAGA_CALLBACK_URL;
    }

    if (!callbackUrl) {
      return new Response(
        JSON.stringify({
          error:
            "Payment cannot be initiated: no valid HTTPS return URL is available. " +
            "Set PAGA_FRONTEND_URL to your production frontend URL " +
            "(e.g. https://your-domain.com/payment-success).",
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Use Paga hosted checkout URL for wallet collection.
    const CHECKOUT_BASE = PAGA_IS_SANDBOX
      ? "https://beta-checkout.paga.com"
      : "https://checkout.paga.com";

    const nameParts = (customer.name || "Nexa User").split(" ");
    const params = new URLSearchParams({
      public_key: PAGA_PUBLIC_KEY,
      payment_reference: referenceNumber,
      amount: String(amount),
      currency: "NGN",
      callback_url: callbackUrl,
      email: customer.email,
      description: "Wallet Funding",
      display_name: "NeXa Esports",
      // Default to bank transfer; other methods (card, USSD, Paga account) remain available
      payment_method: "bank_transfer",
    });
    if (nameParts[0]) params.set("first_name", nameParts[0]);
    if (nameParts.slice(1).join(" ")) params.set("last_name", nameParts.slice(1).join(" "));
    if (customer.phone) params.set("phoneNumber", customer.phone);

    const checkoutUrl = `${CHECKOUT_BASE}?${params.toString()}`;

    // Pre-log pending transaction for later verification
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

    console.log("Paga checkout URL generated:", checkoutUrl);

    return new Response(
      JSON.stringify({
        status: "success",
        data: { link: checkoutUrl, tx_ref: referenceNumber, referenceNumber },
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
