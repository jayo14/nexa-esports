
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  // Create a Supabase client with the user's auth token
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 401,
    });
  }

  const { endpoint, name, account_number, bank_code, amount, recipient_code } = await req.json();

  // Allow clients to check whether withdrawals are allowed for their region (server-side) without initiating a transfer
  if (endpoint === 'check-withdrawal-availability') {
    try {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, timezone, country')
        .eq('id', user.id)
        .maybeSingle();

      const tzFromProfile = profileData?.timezone;
      const country = (profileData?.country || '').toString();
      const DEFAULT_TZ = Deno.env.get('DEFAULT_USER_TIMEZONE') || 'Africa/Lagos';
      const countryTzMap: Record<string, string> = {
        NG: 'Africa/Lagos',
        GH: 'Africa/Accra',
        KE: 'Africa/Nairobi',
        ZA: 'Africa/Johannesburg',
        US: 'America/New_York',
        GB: 'Europe/London',
      };
      const resolvedTz = tzFromProfile || countryTzMap[country.toUpperCase()] || DEFAULT_TZ;

      let weekday = 'Unknown';
      try {
        weekday = new Intl.DateTimeFormat('en-US', { timeZone: resolvedTz, weekday: 'long' }).format(new Date());
      } catch (e) {
        weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
      }

      return new Response(JSON.stringify({ allowed: weekday !== 'Sunday', weekday, timezone: resolvedTz }), {
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (err) {
      console.error('Error checking withdrawal availability:', err);
      return new Response(JSON.stringify({ allowed: true, error: err instanceof Error ? err.message : String(err) }), {
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        status: 200,
      });
    }
  }

  if (endpoint === "create-transfer-recipient") {
    try {
      const paystackUrl = "https://api.paystack.co/transferrecipient";
      const response = await fetch(paystackUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name,
          account_number,
          bank_code,
          currency: "NGN",
        }),
      });

      const result = await response.json();
      console.log("Paystack create recipient response:", result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: response.ok ? 200 : 400,
      });
    } catch (error) {
      console.error("Error creating transfer recipient:", error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  if (endpoint === "initiate-transfer") {
    console.log(`Initiating transfer for user ${user.id} of amount ${amount}`);

    try {
      // Determine user's timezone from profile when possible so we can enforce regional rules
      // Fallback to DEFAULT_USER_TIMEZONE env or 'Africa/Lagos' if not available
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id, timezone, country')
        .eq('id', user.id)
        .maybeSingle();

      const tzFromProfile = profileData?.timezone;
      const country = (profileData?.country || '').toString();
      const DEFAULT_TZ = Deno.env.get('DEFAULT_USER_TIMEZONE') || 'Africa/Lagos';

      // Map a couple of common country codes to timezones as a fallback
      const countryTzMap: Record<string, string> = {
        NG: 'Africa/Lagos',
        GH: 'Africa/Accra',
        KE: 'Africa/Nairobi',
        ZA: 'Africa/Johannesburg',
        US: 'America/New_York',
        GB: 'Europe/London',
      };

      const resolvedTz = tzFromProfile || countryTzMap[country.toUpperCase()] || DEFAULT_TZ;

      // Compute the weekday in the user's timezone (server-side) and block Sundays
      let weekday = 'Unknown';
      try {
        weekday = new Intl.DateTimeFormat('en-US', { timeZone: resolvedTz, weekday: 'long' }).format(new Date());
      } catch (e) {
        console.warn('Failed to resolve timezone, falling back to server locale', e);
        weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
      }

      if (weekday === 'Sunday') {
        return new Response(JSON.stringify({ error: 'withdrawals_disabled_today', message: 'Withdrawals are not allowed on Sundays in your region.' }), {
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      // Validate min/max withdrawal amounts
      if (amount < 500) {
        return new Response(JSON.stringify({ error: "Minimum withdrawal amount is ₦500" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (amount > 30000) {
        return new Response(JSON.stringify({ error: "Maximum withdrawal amount is ₦30,000" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      const fee = amount * 0.04; // 4% fee
      const netAmount = amount - fee; // User receives this amount
      const totalDeduction = amount; // Deduct only the requested amount from wallet

      // 1. Verify user's wallet balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("id, balance")
        .eq("user_id", user.id)
        .single();

      if (walletError || !wallet) {
        console.error(`Wallet not found for user ${user.id}:`, walletError);
        return new Response(JSON.stringify({ error: "Wallet not found" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 404,
        });
      }

      if (wallet.balance < totalDeduction) {
        console.warn(`User ${user.id} has insufficient funds. Balance: ${wallet.balance}, Required: ${totalDeduction}`);
        return new Response(JSON.stringify({ error: "Insufficient funds for withdrawal and fee" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 2. Resolve recipient code if not provided
      let finalRecipientCode = recipient_code;
      if (!finalRecipientCode) {
        if (!account_number || !bank_code || !name) {
          return new Response(JSON.stringify({ error: "recipient_code or (account_number, bank_code, name) required" }), {
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            status: 400,
          });
        }

        console.log(`Creating recipient for account: ${account_number}`);
        const recipientResponse = await fetch("https://api.paystack.co/transferrecipient", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "nuban",
            name,
            account_number,
            bank_code,
            currency: "NGN",
          }),
        });

        const recipientResult = await recipientResponse.json();
        if (!recipientResponse.ok || !recipientResult.status) {
          return new Response(JSON.stringify({ error: "Failed to create transfer recipient", details: recipientResult }), {
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            status: 400,
          });
        }
        finalRecipientCode = recipientResult.data.recipient_code;
        
        // Optionally update profile with recipient code in background
        try {
          const updatedBankingInfo = { ...(profileData?.banking_info || {}), paystack_recipient_code: finalRecipientCode };
          await supabaseAdmin.from('profiles').update({ banking_info: updatedBankingInfo }).eq('id', user.id);
        } catch (e) {
          console.warn('Failed to update profile with recipient code:', e);
        }
      }

      // 3. Proceed with Paystack transfer for net amount (convert to kobo)
      const amountInKobo = Math.floor(netAmount * 100);
      const paystackUrl = "https://api.paystack.co/transfer";
      
      const response = await fetch(paystackUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: amountInKobo,
          recipient: finalRecipientCode,
          reason: "Wallet withdrawal",
        }),
      });

      const result = await response.json();
      console.log("Paystack transfer response:", result);

      if (!response.ok || result.status === false) {
        // Translate common Paystack errors to friendly machine-readable codes
        const msg = result.message || JSON.stringify(result);
        console.warn('Paystack transfer failed:', msg);

        if ((msg || '').toLowerCase().includes('insufficient balance')) {
          return new Response(JSON.stringify({ error: 'insufficient_paystack_balance', message: msg }), {
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({ error: 'paystack_transfer_failed', message: msg, details: result }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 3. Deduct from wallet and create transaction record
      // Ensure numeric types and fixed decimals to avoid type mismatches
      const newBalance = Number((Number(wallet.balance) - Number(totalDeduction)).toFixed(2));
      const txAmount = Number(Number(totalDeduction).toFixed(2));
      const txReference = result?.data?.reference || result?.reference || '';

      console.log('Updating wallet with:', { wallet_id: wallet.id, newBalance, txAmount, txReference });

      const { data: transactionData, error: updateError } = await supabaseAdmin.rpc(
        'update_wallet_and_create_transaction',
        {
          p_wallet_id: wallet.id,
          p_new_balance: newBalance,
          p_transaction_amount: txAmount,
          p_transaction_type: 'withdrawal' as any,
          p_transaction_status: 'success',
          p_transaction_reference: txReference,
        }
      );

      if (updateError) {
        // Log details for observability and return a structured error so the client can show a helpful message
        console.error('Error updating wallet (RPC failure):', updateError);

        // Return structured failure including the RPC error code/message where possible
        const errorPayload: any = {
          error: 'failed_to_update_wallet',
          message: 'Failed to update wallet after successful transfer. This has been recorded for manual review.',
          rpc_error: updateError?.message || updateError,
        };

        // Suggest attaching transaction reference for easier reconciliation
        if (txReference) errorPayload.transfer_reference = txReference;

        // At this stage the Paystack transfer may have gone through; do NOT automatically expose raw RPC details to end users,
        // but include them in logs/monitoring. We still return a machine-friendly payload so the frontend can detect and display a safe message.
        return new Response(JSON.stringify(errorPayload), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 500,
        });
      }
      
      // 4. Log the fee in the earnings table with source
      const transactionId = transactionData; // The RPC should return the new transaction's ID
      if (transactionId) {
        const { error: feeError } = await supabaseAdmin
          .from('earnings')
          .insert({ transaction_id: transactionId, amount: fee, source: 'withdrawal_fee' });

        if (feeError) {
          console.error("Error logging transaction fee:", feeError);
          // This is not a critical failure, but should be logged for monitoring
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error initiating transfer:", error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    status: 400,
  });
});
