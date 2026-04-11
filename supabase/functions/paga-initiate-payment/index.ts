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

    // Prefer server-side PAGA_CALLBACK_URL env var (required for non-HTTPS/localhost origins).
    // Fall back to the redirect_url supplied by the client only when it is a valid HTTPS URL.
    // Paga rejects callback URLs that are not publicly accessible HTTPS addresses.
    let callbackUrl: string;
    if (PAGA_CALLBACK_URL) {
      callbackUrl = PAGA_CALLBACK_URL;
    } else if (redirect_url && redirect_url.startsWith("https://")) {
      callbackUrl = redirect_url;
    } else {
      return new Response(
        JSON.stringify({
          error:
            "Payment cannot be initiated: no valid HTTPS callback URL is available. " +
            "Set the PAGA_CALLBACK_URL environment variable to your production URL " +
            "(e.g. https://your-domain.com/payment-success).",
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Use Paga Checkout Link — no server-side hash or IP whitelisting required for collection
    const CHECKOUT_BASE = PAGA_IS_SANDBOX
      ? "https://beta.mypaga.com/paga-webservices/m/collect"
      : "https://www.mypaga.com/paga-webservices/m/collect";

    const nameParts = (customer.name || "Nexa User").split(" ");
    const params = new URLSearchParams({
      merchantKey: PAGA_PUBLIC_KEY,
      referenceNumber,
      amount: String(amount),
      currency: "NGN",
      callbackUrl,
      customerEmail: customer.email,
      customerFirstName: nameParts[0],
      customerLastName: nameParts.slice(1).join(" ") || "User",
      customerPhoneNumber: customer.phone || "",
      paymentContextDescription: "Wallet Funding",
      displayName: "NeXa Esports",
      isMerchantPayment: "false",
    });

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
