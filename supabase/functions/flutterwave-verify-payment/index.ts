import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const { transaction_id } = await req.json();

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "transaction_id is required" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Verify transaction with Flutterwave
    const flutterwaveUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    const flutterwaveResponse = await fetch(flutterwaveUrl, {
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!flutterwaveResponse.ok) {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const flutterwaveData = await flutterwaveResponse.json();

    if (flutterwaveData.status !== 'success' || flutterwaveData.data.status !== 'successful') {
      return new Response(JSON.stringify({ error: "Payment not successful", data: flutterwaveData }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Check if transaction already processed
    const tx_ref = flutterwaveData.data.tx_ref;
    const { data: existingTransaction, error: existingTransactionError } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('reference', tx_ref)
      .maybeSingle();

    if (existingTransactionError) {
      console.error('Error checking for existing transaction:', existingTransactionError);
      return new Response(JSON.stringify({ error: 'Error checking for existing transaction' }), {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    if (existingTransaction) {
      return new Response(JSON.stringify({ message: "Transaction already processed" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Extract transaction details
    const userId = flutterwaveData.data.meta?.userId;
    const amount = flutterwaveData.data.amount;
    const currency = flutterwaveData.data.currency;

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID not found in transaction metadata. Cannot credit wallet." }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    console.log("Calling credit_wallet with:", { userId, amount, reference: tx_ref, currency });

    const { data: newBalance, error: creditWalletError } = await supabaseAdmin.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_reference: tx_ref,
      p_currency: currency,
    });

    console.log("credit_wallet response:", { newBalance, creditWalletError });

    if (creditWalletError) {
      console.error('Error crediting wallet:', creditWalletError);
      return new Response(JSON.stringify({ error: 'Error crediting wallet' }), {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    console.log('New balance:', newBalance);

    return new Response(JSON.stringify(flutterwaveData), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error in verify-payment:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
