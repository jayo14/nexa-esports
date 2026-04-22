import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { flutterwaveAuthenticatedFetch } from "../_shared/flutterwaveAuth.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")?.trim();

  try {
    const { transaction_id, tx_ref: provided_tx_ref } = await req.json();

    if (!transaction_id && !provided_tx_ref) {
      return new Response(JSON.stringify({ error: "transaction_id or tx_ref is required" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    if (!FLW_SECRET_KEY) {
      console.error("Flutterwave v3 credentials not configured");
      return new Response(JSON.stringify({ error: "Server configuration error: FLW_SECRET_KEY required" }), {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Flutterwave v3 API base URL
    const FLW_BASE_URL = "https://api.flutterwave.com";

    // Verify transaction with Flutterwave
    let flutterwaveUrl = "";

    if (transaction_id) {
      flutterwaveUrl = `${FLW_BASE_URL}/v3/transactions/${transaction_id}/verify`;
    } else {
      flutterwaveUrl = `${FLW_BASE_URL}/v3/transactions/verify_by_reference?tx_ref=${provided_tx_ref}`;
    }

    console.log(`Verifying with Flutterwave via ${FLW_BASE_URL}: ${flutterwaveUrl}`);
    
    const flutterwaveResponse = await flutterwaveAuthenticatedFetch(flutterwaveUrl);

    if (flutterwaveResponse.status === 401) {
      console.error("Flutterwave Authorization Failed during verification: Invalid Secret Key");
      return new Response(JSON.stringify({ 
        error: "Verification failed: Authorization error with payment provider.",
        status: 'error'
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!flutterwaveResponse.ok) {
      const errorText = await flutterwaveResponse.text();
      console.error(`Flutterwave verification failed with status ${flutterwaveResponse.status}:`, errorText);
      
      // If verification by ID failed, try by reference if we have it
      if (transaction_id && provided_tx_ref && flutterwaveResponse.status !== 401) {
        console.log(`Retrying verification with tx_ref: ${provided_tx_ref}`);
        const retryUrl = `${FLW_BASE_URL}/v3/transactions/verify_by_reference?tx_ref=${provided_tx_ref}`;
        const retryResponse = await flutterwaveAuthenticatedFetch(retryUrl);

        if (retryResponse.status === 401) {
          console.error("Flutterwave Authorization Failed during retry: Invalid Secret Key");
        }
        
        if (retryResponse.ok) {
           const retryData = await retryResponse.json();
           return processFlutterwaveData(retryData, origin);
        }
      }

      return new Response(JSON.stringify({ 
        error: "Payment verification failed", 
        details: errorText,
        status: flutterwaveResponse.status,
        transaction_id,
        tx_ref: provided_tx_ref
      }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const flutterwaveData = await flutterwaveResponse.json();
    return processFlutterwaveData(flutterwaveData, origin);

  } catch (err) {
    console.error("Unexpected error in verify-payment:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});

  

  async function processFlutterwaveData(flutterwaveData: any, origin: string) {

      console.log("Processing Flutterwave data:", JSON.stringify(flutterwaveData));

  

      if (flutterwaveData.status !== 'success' || (flutterwaveData.data.status !== 'successful' && flutterwaveData.data.status !== 'completed')) {

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

        return new Response(JSON.stringify({ message: "Transaction already processed", data: flutterwaveData }), {

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

  

      if (creditWalletError) {

        console.error('Error crediting wallet:', creditWalletError);

        return new Response(JSON.stringify({ error: 'Error crediting wallet', details: creditWalletError }), {

          status: 500,

          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },

        });

      }

  

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Payment verified and wallet credited',
        newBalance,
        reference: tx_ref,
        flutterwaveData,
      }), {

        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },

      });

  }

  
