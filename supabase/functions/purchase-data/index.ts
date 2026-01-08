import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataRequest {
  phone_number: string;
  variation_code: string;
  network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
  amount: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { phone_number, variation_code, network_provider, amount }: DataRequest = await req.json();

    // Validate input
    if (!phone_number || !variation_code || !network_provider || !amount) {
      throw new Error('Missing required fields');
    }

    if (amount < 100) {
      throw new Error('Amount must be at least ₦100');
    }

    // Get user wallet balance
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (walletError || !wallet) {
      throw new Error('Failed to fetch user wallet');
    }

    const currentBalance = Number(wallet.balance);

    // Check if user has sufficient balance
    if (currentBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('data_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'purchase',
        amount: amount,
        phone_number: phone_number,
        network_provider: network_provider,
        variation_code: variation_code,
        status: 'pending',
        wallet_balance_before: currentBalance,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      throw new Error('Failed to create transaction record');
    }

    try {
      // Map network provider to VTPASS service IDs
      const serviceIdMap: Record<string, string> = {
        'MTN': 'mtn-data',
        'GLO': 'glo-data',
        'AIRTEL': 'airtel-data',
        '9MOBILE': 'etisalat-data',
      };

      const serviceId = serviceIdMap[network_provider];

      // Prepare VTPASS API request
      const vtpassApiKey = Deno.env.get('VTPASS_API_KEY');
      const vtpassSecretKey = Deno.env.get('VTPASS_SECRET_KEY');
      const vtpassPublicKey = Deno.env.get('VTPASS_PUBLIC_KEY');

      if (!vtpassApiKey || !vtpassSecretKey || !vtpassPublicKey) {
        throw new Error('VTPASS credentials not configured');
      }

      // Generate request ID with proper date format (YYYYMMDD)
      const today = new Date();
      const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const requestId = `${datePrefix}_DATA_${transaction.id}_${Date.now()}`;

      // Call VTPASS API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let vtpassResponse;
      let vtpassData;

      try {
        vtpassResponse = await fetch('https://vtpass.com/api/pay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': vtpassApiKey,
            'secret-key': vtpassSecretKey,
            'public-key': vtpassPublicKey,
          },
          body: JSON.stringify({
            request_id: requestId,
            serviceID: serviceId,
            billersCode: phone_number,
            variation_code: variation_code,
            amount: amount,
            phone: phone_number,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        vtpassData = await vtpassResponse.json();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          // Timeout - treat as pending
          await supabaseClient
            .from('data_transactions')
            .update({
              status: 'processing',
              vtpass_request_id: requestId,
              error_message: 'Transaction is processing. Please wait for confirmation.',
            })
            .eq('id', transaction.id);
          
          throw new Error('Transaction is processing. Please check back in a moment.');
        }
        throw fetchError;
      }

      // Handle VTPass response with comprehensive error codes
      const responseCode = vtpassData.code;
      const transactionStatus = vtpassData.content?.transactions?.status;

      // User-friendly error messages
      const getErrorMessage = (code: string): string => {
        const errorMessages: Record<string, string> = {
          '010': 'Invalid data plan selected. Please choose a different plan.',
          '011': 'Invalid request. Please check your input and try again.',
          '012': 'Service not available. Please try a different network.',
          '013': 'Amount is below minimum allowed. Please increase the amount.',
          '014': 'This transaction was already processed. Please check your history.',
          '017': 'Amount exceeds maximum allowed. Please reduce the amount.',
          '018': 'Insufficient funds in payment wallet. Please contact support.',
          '019': 'Please wait 30 seconds before making another purchase to this number.',
          '021': 'Your account is locked. Please contact support.',
          '022': 'Your account is suspended. Please contact support.',
          '023': 'API access not enabled. Please contact support.',
          '024': 'Your account is inactive. Please contact support.',
          '027': 'Service configuration error. Please contact support.',
          '028': 'Service not available for your account. Please contact support.',
          '030': 'Service provider temporarily unavailable. Please try again later.',
          '034': 'Service temporarily suspended. Please try again later.',
          '035': 'Service currently unavailable. Please try again later.',
          '083': 'System error occurred. Please try again or contact support.',
          '087': 'Authentication failed. Please contact support.',
          '089': 'Previous request still processing. Please wait before trying again.',
        };
        return errorMessages[code] || vtpassData.response_description || 'Transaction failed. Please try again.';
      };

      // Check if transaction is successful
      if (responseCode === '000' && transactionStatus === 'delivered') {
        // Success - deduct from wallet and update transaction
        const newBalance = currentBalance - amount;

        // Update wallet balance
        const { error: walletUpdateError } = await supabaseClient
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);

        if (walletUpdateError) {
          throw new Error('Failed to update wallet balance');
        }

        // Update transaction status
        await supabaseClient
          .from('data_transactions')
          .update({
            status: 'completed',
            vtpass_request_id: requestId,
            vtpass_transaction_id: vtpassData.content?.transactions?.transactionId,
            vtpass_response: vtpassData,
            wallet_balance_after: newBalance,
            completed_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        // Log transaction in wallet_transactions
        await supabaseClient
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'Data Purchase',
            amount: -amount,
            description: `Data purchase: ₦${amount} ${network_provider} to ${phone_number}`,
            status: 'completed',
            balance_after: newBalance,
          });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Data purchased successfully',
            transaction: {
              id: transaction.id,
              amount: amount,
              phone_number: phone_number,
              network_provider: network_provider,
              variation_code: variation_code,
              status: 'completed',
              new_balance: newBalance,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else if (responseCode === '000' && (transactionStatus === 'pending' || transactionStatus === 'initiated')) {
        // Transaction is pending - needs requery later
        await supabaseClient
          .from('data_transactions')
          .update({
            status: 'processing',
            vtpass_request_id: requestId,
            vtpass_transaction_id: vtpassData.content?.transactions?.transactionId,
            vtpass_response: vtpassData,
          })
          .eq('id', transaction.id);

        return new Response(
          JSON.stringify({
            success: false,
            error: 'Transaction is being processed. You will be notified once it completes.',
            status: 'processing',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 202, // Accepted but processing
          }
        );
      } else if (responseCode === '099') {
        // Transaction is processing
        await supabaseClient
          .from('data_transactions')
          .update({
            status: 'processing',
            vtpass_request_id: requestId,
            vtpass_response: vtpassData,
          })
          .eq('id', transaction.id);

        throw new Error('Transaction is processing. Please check back in a moment.');
      } else if (responseCode === '091') {
        // Transaction not processed - safe to retry
        await supabaseClient
          .from('data_transactions')
          .update({
            status: 'failed',
            vtpass_request_id: requestId,
            vtpass_response: vtpassData,
            error_message: 'Transaction not processed',
          })
          .eq('id', transaction.id);

        throw new Error('Transaction not processed. Please try again.');
      } else {
        // Failed transaction with specific error code
        const errorMessage = getErrorMessage(responseCode);
        
        await supabaseClient
          .from('data_transactions')
          .update({
            status: 'failed',
            vtpass_request_id: requestId,
            vtpass_response: vtpassData,
            error_message: errorMessage,
          })
          .eq('id', transaction.id);

        throw new Error(errorMessage);
      }
    } catch (vtpassError) {
      // Update transaction as failed
      await supabaseClient
        .from('data_transactions')
        .update({
          status: 'failed',
          error_message: vtpassError.message || 'VTPASS API error',
        })
        .eq('id', transaction.id);

      throw vtpassError;
    }
  } catch (error) {
    console.error('Error in purchase-data function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
