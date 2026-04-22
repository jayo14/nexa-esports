import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

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

    const { amount, customer, redirect_url, wallet_type, idempotency_key, client_reference } = await req.json();
    const walletType = wallet_type === "marketplace" ? "marketplace" : "clan";

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

    const { data: depositIntent, error: intentError } = await supabaseAdmin.rpc("wallet_create_deposit_intent", {
      p_user_id: user.id,
      p_amount: amount,
      p_currency: "NGN",
      p_wallet_type: walletType,
      p_idempotency_key: idempotency_key || null,
      p_client_reference: client_reference || null,
      p_metadata: { source: "paga", email: customer.email },
    });

    if (intentError || !depositIntent?.transaction_id || !depositIntent?.reference) {
      const errorDetails = {
        intentError,
        depositIntent,
        timestamp: new Date().toISOString(),
        userId: user.id,
      };
      console.error("Failed to create deposit intent:", errorDetails);
      return new Response(
        JSON.stringify({ error: "Unable to create payment intent" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const transactionId = String(depositIntent.transaction_id);
    const referenceNumber = String(depositIntent.reference);

    const PAGA_FRONTEND_URL = Deno.env.get("PAGA_FRONTEND_URL")?.trim();
    const normalizeRedirectUrl = (candidate?: string | null): string | null => {
      if (!candidate || !candidate.startsWith("https://")) return null;
      try {
        const parsed = new URL(candidate);
        if (!parsed.pathname || parsed.pathname === "/") {
          parsed.pathname = "/payment-success";
        }
        return parsed.toString();
      } catch {
        return null;
      }
    };

    const callbackUrl =
      normalizeRedirectUrl(redirect_url) ||
      normalizeRedirectUrl(PAGA_FRONTEND_URL) ||
      normalizeRedirectUrl(PAGA_CALLBACK_URL);

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

    const CHECKOUT_BASE = PAGA_IS_SANDBOX ? "https://beta-checkout.paga.com" : "https://checkout.paga.com";

    const nameParts = (customer.name || "Nexa User").split(" ");
    const params = new URLSearchParams({
      public_key: PAGA_PUBLIC_KEY,
      payment_reference: referenceNumber,
      amount: String(amount),
      currency: "NGN",
      callback_url: callbackUrl,
      redirect_url: callbackUrl,
      return_url: callbackUrl,
      email: customer.email,
      description: "Wallet Funding",
      display_name: "NeXa Esports",
      payment_method: "bank_transfer",
    });

    if (nameParts[0]) params.set("first_name", nameParts[0]);
    if (nameParts.slice(1).join(" ")) params.set("last_name", nameParts.slice(1).join(" "));
    if (customer.phone) params.set("phoneNumber", customer.phone);

    const checkoutUrl = `${CHECKOUT_BASE}?${params.toString()}`;

    await supabaseAdmin
      .from("transactions")
      .update({
        wallet_state: "processing",
        status: "processing",
        paga_status: "processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .in("wallet_state", ["pending", "processing"]);

    await supabaseAdmin.rpc("wallet_record_provider_operation", {
      p_transaction_id: transactionId,
      p_operation_type: "initiate",
      p_operation_key: `checkout:${referenceNumber}`,
      p_provider_request: {
        amount,
        currency: "NGN",
        customer,
        callbackUrl,
        walletType,
      },
      p_provider_response: { checkoutUrl },
      p_provider_status_code: "INITIATED",
      p_signature_valid: null,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: { link: checkoutUrl, tx_ref: referenceNumber, referenceNumber },
      }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      path: '/paga-initiate-payment',
      userAgent: req.headers.get('user-agent'),
    };
    console.error("Error initiating Paga payment:", errorDetails);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
