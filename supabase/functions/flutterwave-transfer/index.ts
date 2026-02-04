import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import process from "node:process";

// Helper to generate unique idempotency key
function generateIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY")?.trim();

  // Create a Supabase client with the user's auth token
  const supabaseClient = createClient(
    process.env.SUPABASE_URL || Deno.env.get('SUPABASE_URL') || '',
    process.env.SUPABASE_ANON_KEY || Deno.env.get('SUPABASE_ANON_KEY') || '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 401,
    });
  }

  // Check for missing or placeholder key
  if (!FLUTTERWAVE_SECRET_KEY || FLUTTERWAVE_SECRET_KEY === "your_flutterwave_secret_key_here") {
    console.error("FLUTTERWAVE_SECRET_KEY is not set or is still a placeholder");
    return new Response(JSON.stringify({ error: "Transfer service not configured: FLUTTERWAVE_SECRET_KEY is invalid or missing" }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }

  const { endpoint, account_bank, account_number, amount, narration, beneficiary_name } = await req.json();

  // Allow clients to check whether withdrawals are allowed for their region (server-side) without initiating a transfer
  if (endpoint === 'check-withdrawal-availability') {
    try {
      // Also check global withdrawal setting
      const { data: withdrawalSetting } = await supabaseAdmin
        .from('clan_settings')
        .select('value')
        .eq('key', 'withdrawals_enabled')
        .maybeSingle();

      const globalAllowed = withdrawalSetting ? withdrawalSetting.value !== false : true;

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

      const isSunday = weekday === 'Sunday';
      const allowed = globalAllowed && !isSunday;

      return new Response(JSON.stringify({ 
        allowed, 
        weekday, 
        timezone: resolvedTz,
        global_enabled: globalAllowed,
        reason: !globalAllowed ? 'Withdrawals are currently disabled by the clan master.' : (isSunday ? 'Withdrawals are not allowed on Sundays.' : null)
      }), {
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

  if (endpoint === "initiate-transfer") {
    console.log(`Initiating transfer for user ${user.id} of amount ${amount}`);

    try {
      // Check if withdrawals are enabled in clan_settings
      const { data: withdrawalSetting } = await supabaseAdmin
        .from('clan_settings')
        .select('value')
        .eq('key', 'withdrawals_enabled')
        .maybeSingle();

      if (withdrawalSetting && withdrawalSetting.value === false) {
        return new Response(JSON.stringify({ 
          error: 'withdrawals_disabled', 
          message: 'Withdrawals are currently disabled by the clan master.' 
        }), {
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      // Determine user's timezone from profile
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

      // Check if today is Sunday in user's timezone
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

      // 2. Initiate Flutterwave transfer
      const flutterwaveUrl = "https://api.flutterwave.com/v3/transfers";
      const idempotencyKey = generateIdempotencyKey(`transfer_${user.id}`);
      
      const transferPayload = {
        account_bank,
        account_number,
        amount: Math.round(netAmount), // Round to nearest whole number to avoid precision loss
        narration: narration || "Wallet withdrawal",
        currency: "NGN",
        beneficiary_name,
        reference: `withdrawal_${user.id}_${Date.now()}`,
      };

      console.log("Flutterwave transfer payload:", transferPayload);

      // Build headers with optional X-Scenario-Key for testing
      const headers: Record<string, string> = {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      };

      // Add X-Scenario-Key for testing ONLY in development/test environments
      const scenarioKey = req.headers.get("X-Scenario-Key");
      const isDevelopment = Deno.env.get("ENVIRONMENT") !== "production";
      if (scenarioKey && isDevelopment) {
        headers["X-Scenario-Key"] = scenarioKey;
        console.log("Using test scenario:", scenarioKey);
      } else if (scenarioKey && !isDevelopment) {
        console.warn("X-Scenario-Key header ignored in production environment");
      }

      const response = await fetch(flutterwaveUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(transferPayload),
      });

      const result = await response.json();
      console.log("Flutterwave transfer response:", result);

      if (response.status === 401) {
        console.error("Flutterwave Authorization Failed during transfer: Invalid Secret Key");
        return new Response(JSON.stringify({ 
          error: "Transfer failed: Authorization error with payment provider. Please contact support.",
          status: 'error'
        }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 500,
        });
      }

      if (!response.ok || result.status !== 'success') {
        const msg = result.message || JSON.stringify(result);
        const errorType = result.error_type || result.error || 'unknown';
        console.warn('Flutterwave transfer failed:', msg, 'Error type:', errorType);

        // Map Flutterwave error types to user-friendly messages
        const errorMapping: Record<string, { code: string; message: string }> = {
          insufficient_balance: {
            code: 'insufficient_flutterwave_balance',
            message: 'Transfer service is temporarily unavailable. Please try again later.'
          },
          invalid_currency: {
            code: 'invalid_currency',
            message: 'Invalid currency specified for this transfer.'
          },
          invalid_amount: {
            code: 'invalid_amount',
            message: 'The transfer amount is invalid.'
          },
          amount_below_limit_error: {
            code: 'amount_below_limit',
            message: 'Transfer amount is below the minimum limit.'
          },
          amount_exceed_limit_error: {
            code: 'amount_exceed_limit',
            message: 'Transfer amount exceeds the maximum limit.'
          },
          account_resolved_failed: {
            code: 'account_not_found',
            message: 'Could not verify the bank account. Please check the account details.'
          },
          no_account_found: {
            code: 'account_not_found',
            message: 'Bank account not found. Please verify the account number.'
          },
          blocked_bank: {
            code: 'blocked_bank',
            message: 'Transfers to this bank are currently unavailable.'
          },
          disabled_transfer: {
            code: 'disabled_transfer',
            message: 'Transfer service is temporarily disabled. Please try again later.'
          },
          duplicate_reference: {
            code: 'duplicate_transfer',
            message: 'This transfer has already been processed.'
          },
          day_limit_error: {
            code: 'daily_limit_exceeded',
            message: 'You have exceeded your daily transfer limit.'
          },
          day_transfer_limit_exceeded: {
            code: 'daily_limit_exceeded',
            message: 'Daily transfer limit has been exceeded.'
          },
          month_limit_error: {
            code: 'monthly_limit_exceeded',
            message: 'You have exceeded your monthly transfer limit.'
          },
          month_transfer_limit_exceeded: {
            code: 'monthly_limit_exceeded',
            message: 'Monthly transfer limit has been exceeded.'
          },
          unavailable_transfer_option: {
            code: 'unavailable_transfer',
            message: 'This transfer option is currently unavailable.'
          },
        };

        // Check if we have a mapped error
        const mappedError = errorMapping[errorType];
        if (mappedError) {
          return new Response(JSON.stringify({ 
            error: mappedError.code, 
            message: mappedError.message,
            raw_error: errorType 
          }), {
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Generic error response
        return new Response(JSON.stringify({ 
          error: 'flutterwave_transfer_failed', 
          message: msg || 'Transfer failed. Please try again.', 
          details: result 
        }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 3. Deduct from wallet and create transaction record
      const newBalance = Number((Number(wallet.balance) - Number(totalDeduction)).toFixed(2));
      const txAmount = Number(Number(totalDeduction).toFixed(2));
      const txReference = result?.data?.reference || `withdrawal_${user.id}_${Date.now()}`;

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
        console.error('Error updating wallet (RPC failure):', updateError);

        const errorPayload: any = {
          error: 'failed_to_update_wallet',
          message: 'Failed to update wallet after successful transfer. This has been recorded for manual review.',
          rpc_error: updateError?.message || updateError,
        };

        if (txReference) errorPayload.transfer_reference = txReference;

        return new Response(JSON.stringify(errorPayload), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 500,
        });
      }
      
      // 4. Log the fee in the earnings table
      const transactionId = transactionData;
      if (transactionId) {
        const { error: feeError } = await supabaseAdmin
          .from('earnings')
          .insert({ transaction_id: transactionId, amount: fee, source: 'withdrawal_fee' });

        if (feeError) {
          console.error("Error logging transaction fee:", feeError);
        }
      }

      return new Response(JSON.stringify({ status: true, data: result.data }), {
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
