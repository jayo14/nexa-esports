import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

const OPERATOR_UUIDS: Record<string, string> = {
  'MTN': '42419156-DD57-4737-8373-20678CD9AA29',
  'GLO': 'B6780465-FEC4-4743-ACDE-9101E2991806',
  'AIRTEL': 'ACCF5E64-8FB2-47FF-9833-39EF482A6747',
  '9MOBILE': '8FCC90BA-D339-4EA8-811F-55F1651A9FAB',
};

interface AirtimeRequest {
  phone_number: string;
  amount: number;
  network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
}

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  const PAGA_BASE_URL = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status,
    });

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_API_PASSWORD || !PAGA_HASH_KEY) {
      return respond({ error: "Payment service not configured" }, 500);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return respond({ error: "Unauthorized" }, 401);

    const { phone_number, amount, network_provider }: AirtimeRequest = await req.json();

    if (!phone_number || !amount || !network_provider) {
      return respond({ error: "Missing required fields" }, 400);
    }

    const normalizedPhone = phone_number.startsWith("0") ? "234" + phone_number.slice(1) : phone_number;
    const referenceNumber = generateReferenceNumber("AIRT");

    let { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .eq("wallet_type", "clan")
      .maybeSingle();

    if (!wallet) return respond({ error: "Wallet not found" }, 404);
    if (wallet.balance < amount) return respond({ error: "Insufficient balance" }, 400);

    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        wallet_type: "clan",
        type: "airtime_purchase",
        amount,
        status: "pending",
        wallet_state: "pending",
        reference: referenceNumber,
        description: `Airtime purchase for ${phone_number} on ${network_provider}`,
        metadata: { phone_number, network_provider },
      })
      .select("id")
      .single();

    if (txError || !transaction) return respond({ error: "Failed to create transaction" }, 500);

    try {
      await supabaseAdmin.rpc("wallet_debit", {
        p_transaction_id: transaction.id,
        p_wallet_id: wallet.id,
        p_amount: amount,
      });
    } catch (debitError) {
      return respond({ error: "Debit failed" }, 400);
    }

    try {
      const pagaAmount = amount.toFixed(2);
      const hash = await generatePagaBusinessHash([referenceNumber, pagaAmount, normalizedPhone], PAGA_HASH_KEY);

      const pagaResponse = await fetch(`${PAGA_BASE_URL}/airtimePurchase`, {
        method: "POST",
        headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
        body: JSON.stringify({
          referenceNumber,
          amount: pagaAmount,
          currency: "NGN",
          destinationPhoneNumber: normalizedPhone,
          mobileOperatorPublicId: OPERATOR_UUIDS[network_provider],
          isDataBundle: false,
        }),
      });

      const pagaData = await pagaResponse.json();
      const pagaStatus = String(pagaData.responseCode ?? "");

      await supabaseAdmin.rpc("wallet_record_provider_operation", {
        p_transaction_id: transaction.id,
        p_operation_type: "airtime_purchase",
        p_operation_key: referenceNumber,
        p_provider_request: { referenceNumber, amount, phone_number: normalizedPhone, network_provider },
        p_provider_response: pagaData,
        p_provider_status_code: pagaStatus,
      });

      const isSuccess = pagaStatus === "0" || (pagaData.responseMessage && pagaData.responseMessage.toUpperCase().includes("SUCCESS"));

      if (isSuccess) {
        await supabaseAdmin
          .from("transactions")
          .update({
            status: "processing",
            paga_status: "success",
            paga_reference: pagaData.referenceNumber || referenceNumber,
            paga_transaction_id: pagaData.transactionReference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.id);

        // Enqueue settlement immediately
        await supabaseAdmin.rpc("wallet_enqueue_settlement", {
          p_transaction_id: transaction.id,
          p_provider_reference: referenceNumber,
          p_decision_hint: "success",
          p_source: "purchase_airtime_success",
        });

        await supabaseAdmin.rpc("wallet_process_settlement_jobs", { p_limit: 1 });

        return respond({
          success: true,
          message: "Airtime purchase initiated.",
          reference: referenceNumber,
        });
      } else {
        // Definite failure - reverse
        await supabaseAdmin.rpc("wallet_credit", {
          p_transaction_id: transaction.id,
          p_wallet_id: wallet.id,
          p_amount: amount,
        });

        await supabaseAdmin
          .from("transactions")
          .update({ status: "failed", paga_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", transaction.id);

        return respond({ error: pagaData.responseMessage || "Airtime purchase failed", reference: referenceNumber }, 400);
      }
    } catch (pagaError) {
      console.error("Paga API error:", pagaError);

      // On error, we MOVE TO PROCESSING instead of reversing, to avoid double-spend if Paga actually succeeded
      await supabaseAdmin
        .from("transactions")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);

      await supabaseAdmin.rpc("wallet_enqueue_settlement", {
        p_transaction_id: transaction.id,
        p_provider_reference: referenceNumber,
        p_decision_hint: "processing",
        p_source: "purchase_airtime_exception",
      });

      return respond({
        success: true, // We return success/processing to the UI to avoid scaring the user
        message: "Airtime purchase is being processed. Please check your balance in a moment.",
        reference: referenceNumber,
      }, 202); // 202 Accepted
    }

  } catch (error) {
    console.error("Airtime purchase error:", error);
    return respond({ error: "Unknown error" }, 500);
  }
});
