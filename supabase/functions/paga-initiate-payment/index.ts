import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generateReferenceNumber } from "../_shared/pagaAuth.ts";
import { getWalletMinimums } from "../_shared/walletLimits.ts";
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

    const { minDepositAmount } = await getWalletMinimums();

    const { amount, fee, intended_amount, customer, redirect_url, wallet_type, idempotency_key, client_reference } = await req.json();
    const walletType = wallet_type === "marketplace" ? "marketplace" : "clan";

    if (!amount || amount < minDepositAmount) {
      return new Response(JSON.stringify({ error: `Minimum amount is ₦${minDepositAmount.toLocaleString()}` }), {
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

    const referenceNumber = generateReferenceNumber();

    let existingIntent: { id: string; reference: string | null } | null = null;
    if (idempotency_key) {
      const { data } = await supabaseAdmin
        .from("transactions")
        .select("id, reference")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      existingIntent = data ?? null;
    }

    let transactionId: string;
    let existingReference = referenceNumber;

    if (existingIntent?.id) {
      transactionId = String(existingIntent.id);
      existingReference = String(existingIntent.reference || referenceNumber);
    } else {
      let { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .eq("wallet_type", walletType)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet, error: walletError } = await supabaseAdmin
          .from("wallets")
          .insert({ user_id: user.id, wallet_type: walletType })
          .select("id")
          .single();

        if (walletError || !newWallet) {
          console.error("Failed to create wallet:", walletError);
          return new Response(
            JSON.stringify({ error: "Unable to create wallet" }),
            { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
          );
        }

        wallet = newWallet;
      }

      const { data: createdTx, error: txError } = await supabaseAdmin
        .from("transactions")
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          wallet_type: walletType,
          type: "deposit",
          amount,
          status: "pending",
          wallet_state: "pending",
          reference: referenceNumber,
          paga_reference: referenceNumber,
          paga_status: "pending",
          idempotency_key: idempotency_key || null,
          client_reference: client_reference || null,
          metadata: { 
            source: "paga", 
            email: customer.email,
            intended_amount: intended_amount || amount,
            fee: fee || 0,
            is_fee_on_top: !!intended_amount 
          },
          provider: "paga",
        })
        .select("id, reference")
        .single();

      if (txError || !createdTx?.id) {
        const errorDetails = {
          txError,
          timestamp: new Date().toISOString(),
          userId: user.id,
        };
        console.error("Failed to create deposit transaction:", errorDetails);
        return new Response(
          JSON.stringify({ error: "Unable to create payment intent" }),
          { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
        );
      }

      transactionId = String(createdTx.id);
      existingReference = String(createdTx.reference || referenceNumber);
    }

    const PAGA_FRONTEND_URL = Deno.env.get("PAGA_FRONTEND_URL")?.trim();
    const normalizeRedirectUrl = (candidate?: string | null): string | null => {
      if (!candidate) return null;
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== "https:") return null;
        if (!parsed.pathname || parsed.pathname === "/") {
          parsed.pathname = "/payment-success";
        }
        return parsed.toString();
      } catch {
        return null;
      }
    };

    const callbackUrl =
      normalizeRedirectUrl(PAGA_FRONTEND_URL) ||
      normalizeRedirectUrl(PAGA_CALLBACK_URL) ||
      normalizeRedirectUrl(redirect_url);

    if (!callbackUrl) {
      return new Response(
        JSON.stringify({
          error:
            "Payment cannot be initiated: no public HTTPS return URL is available. " +
            "Set PAGA_FRONTEND_URL or PAGA_CALLBACK_URL to your production frontend URL " +
            "(e.g. https://your-domain.com/payment-success).",
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const CHECKOUT_BASE = PAGA_IS_SANDBOX ? "https://beta-checkout.paga.com" : "https://checkout.paga.com";

    const nameParts = (customer.name || "Nexa User").split(" ");
    const params = new URLSearchParams({
      public_key: PAGA_PUBLIC_KEY,
      payment_reference: existingReference,
      amount: String(amount),
      currency: "NGN",
      callback_url: callbackUrl,
      redirect_url: callbackUrl,
      return_url: callbackUrl,
      email: customer.email,
      description: "Wallet Funding",
      display_name: "NeXa Esports",
      funding_sources: "CARD,TRANSFER,PAGA,USSD",
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
      .in("wallet_state", ["pending", "processing", "credited"]);

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
        data: { link: checkoutUrl, referenceNumber: existingReference, transactionId },
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
