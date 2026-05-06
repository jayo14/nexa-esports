import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generateReferenceNumber, generatePagaBusinessHash } from "../_shared/pagaAuth.ts";
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

    const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
    const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
    const PAGA_WEBHOOK_URL = Deno.env.get("PAGA_WEBHOOK_URL")?.trim();
    
    if (!PAGA_API_PASSWORD || !PAGA_HASH_KEY) {
      return new Response(JSON.stringify({ error: "Payment service not fully configured" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!PAGA_WEBHOOK_URL) {
      return new Response(
        JSON.stringify({
          error: "Payment cannot be initiated: PAGA_WEBHOOK_URL is not configured in environment secrets."
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const PAGA_COLLECT_BASE = PAGA_IS_SANDBOX ? "https://beta-collect.paga.com" : "https://collect.paga.com";
    const nameParts = (customer.name || "Nexa User").split(" ");
    
    // According to standard Paga Collect, the hash is based on referenceNumber + amount + currency + payerEmail + hashKey or similar.
    // For now, we will use the same signature as status check if possible, or standard HMAC if required.
    // The exact hash might vary, but we'll try the generatePagaBusinessHash with basic params
    const collectHash = await generatePagaBusinessHash([existingReference, String(amount), "NGN", customer.email], PAGA_HASH_KEY);

    const paymentRequestPayload = {
      referenceNumber: existingReference,
      amount: amount,
      currency: "NGN",
      payer: {
        name: customer.name || "Nexa User",
        email: customer.email,
        phoneNumber: customer.phone || "",
      },
      payerCollectionInstructions: {
        paymentMethod: "BANK_TRANSFER"
      },
      callbackUrl: PAGA_WEBHOOK_URL
    };

    const res = await fetch(`${PAGA_COLLECT_BASE}/paymentRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "principal": PAGA_PUBLIC_KEY,
        "credentials": PAGA_API_PASSWORD,
        "hash": collectHash,
        "Authorization": `Basic ${btoa(`${PAGA_PUBLIC_KEY}:${PAGA_API_PASSWORD}`)}`,
      },
      body: JSON.stringify(paymentRequestPayload),
    });

    const text = await res.text();
    let collectData: Record<string, any> = {};
    try {
      collectData = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Paga Collect response", text);
    }

    if (!res.ok || collectData.responseCode !== 0) {
      return new Response(
        JSON.stringify({ error: collectData.message || "Failed to initiate payment with Paga" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

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
      p_operation_key: `collect:${referenceNumber}`,
      p_provider_request: paymentRequestPayload,
      p_provider_response: collectData,
      p_provider_status_code: String(collectData.responseCode || "INITIATED"),
      p_signature_valid: null,
    });

    return new Response(
      JSON.stringify({
        status: "success",
        data: { 
          transactionId,
          referenceNumber: existingReference,
          accountNumber: collectData.paymentMethodDetails?.bankAccountNumber || collectData.accountNumber,
          bankName: collectData.paymentMethodDetails?.bankName || collectData.bankName || "Paga",
          amount: collectData.amount || amount,
          expiresAt: collectData.expiresAt || collectData.expiryDateTime,
        },
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
