import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirtimeRequest {
  phone_number: string;
  amount: number;
  network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
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
    const { phone_number, amount, network_provider }: AirtimeRequest = await req.json();

    // Validate input
    if (!phone_number || !amount || !network_provider) {
      throw new Error('Missing required fields');
    }

    if (amount < 50 || amount > 10000) {
      throw new Error('Amount must be between ₦50 and ₦10,000');
    }

    // Get user profile and wallet balance
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('wallet_balance')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to fetch user profile');
    }

    // Check if user has sufficient balance
    if (profile.wallet_balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('airtime_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'purchase',
        amount: amount,
        phone_number: phone_number,
        network_provider: network_provider,
        status: 'pending',
        wallet_balance_before: profile.wallet_balance,
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      throw new Error('Failed to create transaction record');
    }

    try {
      // Map network provider to VTPASS service IDs
      const serviceIdMap: Record<string, string> = {
        'MTN': 'mtn',
        'GLO': 'glo',
        'AIRTEL': 'airtel',
        '9MOBILE': 'etisalat', // VTPASS uses 'etisalat' for 9mobile
      };

      const serviceId = serviceIdMap[network_provider];

      // Prepare VTPASS API request
      const vtpassApiKey = Deno.env.get('VTPASS_API_KEY');
      const vtpassSecretKey = Deno.env.get('VTPASS_SECRET_KEY');
      const vtpassPublicKey = Deno.env.get('VTPASS_PUBLIC_KEY');

      if (!vtpassApiKey || !vtpassSecretKey || !vtpassPublicKey) {
        throw new Error('VTPASS credentials not configured');
      }

      const requestId = `AIRTIME_${transaction.id}_${Date.now()}`;

      // Call VTPASS API
      const vtpassResponse = await fetch('https://vtpass.com/api/pay', {
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
          amount: amount,
          phone: phone_number,
        }),
      });

      const vtpassData = await vtpassResponse.json();

      // Update transaction with VTPASS response
      if (vtpassData.code === '000' || vtpassData.content?.transactions?.status === 'delivered') {
        // Success - deduct from wallet and update transaction
        const newBalance = profile.wallet_balance - amount;

        // Update wallet balance
        const { error: walletError } = await supabaseClient
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', user.id);

        if (walletError) {
          throw new Error('Failed to update wallet balance');
        }

        // Update transaction status
        await supabaseClient
          .from('airtime_transactions')
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
            transaction_type: 'Airtime Purchase',
            amount: -amount,
            description: `Airtime purchase: ₦${amount} ${network_provider} to ${phone_number}`,
            status: 'completed',
            balance_after: newBalance,
          });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Airtime purchased successfully',
            transaction: {
              id: transaction.id,
              amount: amount,
              phone_number: phone_number,
              network_provider: network_provider,
              status: 'completed',
              new_balance: newBalance,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        // Failed transaction
        await supabaseClient
          .from('airtime_transactions')
          .update({
            status: 'failed',
            vtpass_request_id: requestId,
            vtpass_response: vtpassData,
            error_message: vtpassData.response_description || 'Transaction failed',
          })
          .eq('id', transaction.id);

        throw new Error(vtpassData.response_description || 'Airtime purchase failed');
      }
    } catch (vtpassError) {
      // Update transaction as failed
      await supabaseClient
        .from('airtime_transactions')
        .update({
          status: 'failed',
          error_message: vtpassError.message || 'VTPASS API error',
        })
        .eq('id', transaction.id);

      throw vtpassError;
    }
  } catch (error) {
    console.error('Error in purchase-airtime function:', error);
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
