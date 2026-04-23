import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

// Paga operator UUIDs
const OPERATOR_UUIDS: Record<string, string> = {
  'MTN': '42419156-DD57-4737-8373-20678CD9AA29',
  'GLO': 'B6780465-FEC4-4743-ACDE-9101E2991806',
  'AIRTEL': 'ACCF5E64-8FB2-47FF-9833-39EF482A6747',
  '9MOBILE': '8FCC90BA-D339-4EA8-811F-55F1651A9FAB',
};

interface DataRequest {
  phone_number: string;
  network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
  amount: number;
  service_id: string;  // Paga data bundle service ID
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
      console.error("Paga credentials not configured");
      return respond({ error: "Payment service not configured" }, 500);
    }

    // Authenticate user via JWT
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { phone_number, network_provider, amount, service_id }: DataRequest = await req.json();

    // Validate input
    if (!phone_number || !network_provider || !amount || !service_id) {
      return respond({ error: "Missing required fields: phone_number, network_provider, amount, service_id" }, 400);
    }

    if (!OPERATOR_UUIDS[network_provider]) {
      return respond({ error: `Invalid network provider: ${network_provider}` }, 400);
    }

    if (amount < 100 || amount > 50000) {
      return respond({ error: "Amount must be between ₦100 and ₦50,000" }, 400);
    }

    // Validate phone number
    const phoneRegex = /^234\d{10}$|^0\d{10}$/;
    const normalizedPhone = phone_number.startsWith("0") 
      ? "234" + phone_number.slice(1) 
      : phone_number;
    
    if (!phoneRegex.test(normalizedPhone)) {
      return respond({ error: "Invalid Nigerian phone number" }, 400);
    }

    // Get or create wallet
    let { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .eq("wallet_type", "clan")
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .insert({ user_id: user.id, wallet_type: "clan", balance: 0 })
        .select("id, balance")
        .single();

      if (walletError || !newWallet) {
        console.error("Failed to create wallet:", walletError);
        return respond({ error: "Failed to access wallet" }, 500);
      }
      wallet = newWallet;
    }

    // Check sufficient balance
    if (wallet.balance < amount) {
      return respond({ 
        error: `Insufficient balance. Need ₦${amount}, have ₦${wallet.balance}` 
      }, 400);
    }

    const referenceNumber = generateReferenceNumber("DATA");

    // Create transaction record (pending)
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        wallet_id: wallet.id,
        user_id: user.id,
        wallet_type: "clan",
        type: "data_purchase",
        amount,
        status: "pending",
        reference: referenceNumber,
        description: `Data purchase for ${phone_number} on ${network_provider}`,
        metadata: { phone_number, network_provider, service_id, operator_uuid: OPERATOR_UUIDS[network_provider] },
      })
      .select("id")
      .single();

    if (txError || !transaction) {
      console.error("Failed to create transaction:", txError);
      return respond({ error: "Failed to create transaction" }, 500);
    }

    // Call wallet_debit to lock funds
    try {
      await supabaseAdmin.rpc("wallet_debit", {
        p_transaction_id: transaction.id,
        p_wallet_id: wallet.id,
        p_amount: amount,
      });
    } catch (debitError) {
      console.error("Debit failed:", debitError);
      return respond({ error: "Insufficient balance" }, 400);
    }

    // Call Paga Business API: airtimePurchase with isDataBundle: true
    try {
      const pagaAmount = amount.toFixed(2);
      const hash = await generatePagaBusinessHash(
        [referenceNumber, pagaAmount, normalizedPhone],
        PAGA_HASH_KEY
      );

      const pagaResponse = await fetch(`${PAGA_BASE_URL}/airtimePurchase`, {
        method: "POST",
        headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
        body: JSON.stringify({
          referenceNumber,
          amount: pagaAmount,
          currency: "NGN",
          destinationPhoneNumber: normalizedPhone,
          mobileOperatorPublicId: OPERATOR_UUIDS[network_provider],
          isDataBundle: true,
          mobileOperatorServiceId: service_id,
        }),
      });

      const pagaData = await pagaResponse.json();
      const pagaStatus = String(pagaData.responseCode ?? "");

      // Record provider operation
      await supabaseAdmin.rpc("wallet_record_provider_operation", {
        p_transaction_id: transaction.id,
        p_operation_type: "data_purchase",
        p_operation_key: referenceNumber,
        p_provider_request: {
          referenceNumber,
          amount,
          phone_number: normalizedPhone,
          network_provider,
          service_id,
        },
        p_provider_response: pagaData,
        p_provider_status_code: pagaStatus,
        p_signature_valid: null,
      });

      // Handle Paga response
      if (pagaData.responseCode === 0 || String(pagaData.responseCode) === "0") {
        // SUCCESS: transaction will be credited via webhook
        await supabaseAdmin
          .from("transactions")
          .update({
            status: "processing",
            paga_status: "success",
            paga_reference: pagaData.referenceNumber,
            paga_transaction_id: pagaData.transactionReference,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.id);

        return respond({
          success: true,
          message: "Data purchase initiated. Please wait for confirmation.",
          reference: referenceNumber,
          paga_transaction_id: pagaData.transactionReference || null,
        }, 200);
      } else {
        // FAILURE: reverse the debit
        try {
          await supabaseAdmin.rpc("wallet_credit", {
            p_transaction_id: transaction.id,
            p_wallet_id: wallet.id,
            p_amount: amount,
          });
        } catch (reverseError) {
          console.error("Failed to reverse debit:", reverseError);
        }

        await supabaseAdmin
          .from("transactions")
          .update({
            status: "failed",
            paga_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.id);

        return respond({
          error: pagaData.responseMessage || "Data purchase failed",
          reference: referenceNumber,
        }, 400);
      }
    } catch (pagaError) {
      console.error("Paga API error:", pagaError);

      // Reverse debit as safety measure
      try {
        await supabaseAdmin.rpc("wallet_credit", {
          p_transaction_id: transaction.id,
          p_wallet_id: wallet.id,
          p_amount: amount,
        });
      } catch (reverseError) {
        console.error("Failed to reverse debit after error:", reverseError);
      }

      await supabaseAdmin
        .from("transactions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      return respond({
        error: "Failed to process data purchase. Your wallet has been credited.",
        reference: referenceNumber,
      }, 500);
    }

  } catch (error) {
    console.error("Data purchase error:", error);
    return respond({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
