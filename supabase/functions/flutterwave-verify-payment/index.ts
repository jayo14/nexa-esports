import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || Deno.env.get("SECRET_KEY");

  try {
    const { transaction_id, tx_ref: provided_tx_ref } = await req.json();

    if (!transaction_id && !provided_tx_ref) {
      return new Response(JSON.stringify({ error: "transaction_id or tx_ref is required" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set");
      return new Response(JSON.stringify({ error: "Server configuration error: FLUTTERWAVE_SECRET_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

  

      // Verify transaction with Flutterwave

      let flutterwaveUrl = "";

      if (transaction_id) {

        flutterwaveUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;

      } else {

        flutterwaveUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${provided_tx_ref}`;

      }

  

      console.log(`Verifying with Flutterwave: ${flutterwaveUrl}`);

      

      const flutterwaveResponse = await fetch(flutterwaveUrl, {

        headers: {

          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,

          "Content-Type": "application/json",

        },

      });

  

      if (!flutterwaveResponse.ok) {

        const errorText = await flutterwaveResponse.text();

        console.error(`Flutterwave verification failed with status ${flutterwaveResponse.status}:`, errorText);

        

        // If verification by ID failed, try by reference if we have it

        if (transaction_id && provided_tx_ref && flutterwaveResponse.status !== 401) {

          console.log(`Retrying verification with tx_ref: ${provided_tx_ref}`);

          const retryUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${provided_tx_ref}`;

          const retryResponse = await fetch(retryUrl, {

            headers: {

              Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,

              "Content-Type": "application/json",

            },

          });

          

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

  

      return new Response(JSON.stringify(flutterwaveData), {

        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },

      });

  }

  
