import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Parse webhook payload
    const payload = await req.json();
    console.log('VTPass webhook received:', payload);

    const webhookType = payload.type;
    const webhookData = payload.data;

    if (webhookType === 'transaction_update') {
      // Handle transaction status update
      const {
        request_id,
        transaction_id,
        status,
        amount,
        phone,
      } = webhookData;

      // Determine which table to update based on request_id prefix
      let tableName = 'airtime_transactions';
      if (request_id && request_id.includes('_DATA_')) {
        tableName = 'data_transactions';
      }

      // Find the transaction by vtpass_request_id
      const { data: existingTransaction, error: findError } = await supabaseClient
        .from(tableName)
        .select('*')
        .eq('vtpass_request_id', request_id)
        .maybeSingle();

      if (findError || !existingTransaction) {
        console.error('Transaction not found:', request_id);
        // Still return success to prevent webhook retries
        return new Response(
          JSON.stringify({ response: 'success' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      // Only update if transaction is not already completed
      if (existingTransaction.status !== 'completed') {
        const updateData: any = {
          vtpass_transaction_id: transaction_id,
          webhook_received_at: new Date().toISOString(),
        };

        // Map VTPass status to our status
        if (status === 'delivered' || status === 'successful') {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();

          // If transaction was pending and now delivered, deduct from wallet
          if (existingTransaction.status === 'pending' || existingTransaction.status === 'processing') {
            const userId = existingTransaction.user_id;
            const transactionAmount = existingTransaction.amount;

            // Get current wallet balance
            const { data: wallet, error: walletError } = await supabaseClient
              .from('wallets')
              .select('balance')
              .eq('user_id', userId)
              .maybeSingle();

            if (!walletError && wallet) {
              const newBalance = Number(wallet.balance) - transactionAmount;

              // Update wallet
              await supabaseClient
                .from('wallets')
                .update({ balance: newBalance })
                .eq('user_id', userId);

              updateData.wallet_balance_after = newBalance;

              // Log wallet transaction
              const transactionType = tableName === 'data_transactions' ? 'Data Purchase' : 'Airtime Purchase';
              const networkProvider = existingTransaction.network_provider;
              
              await supabaseClient
                .from('wallet_transactions')
                .insert({
                  user_id: userId,
                  transaction_type: transactionType,
                  amount: -transactionAmount,
                  description: `${transactionType}: ₦${transactionAmount} ${networkProvider} to ${phone}`,
                  status: 'completed',
                  balance_after: newBalance,
                });
            }
          }
        } else if (status === 'pending' || status === 'initiated') {
          updateData.status = 'processing';
        } else if (status === 'failed' || status === 'reversed') {
          updateData.status = 'failed';
          updateData.error_message = `Transaction ${status} by provider`;
        }

        // Update transaction
        const { error: updateError } = await supabaseClient
          .from(tableName)
          .update(updateData)
          .eq('id', existingTransaction.id);

        if (updateError) {
          console.error('Failed to update transaction:', updateError);
        } else {
          console.log('Transaction updated successfully:', request_id, updateData.status);
        }
      }
    } else if (webhookType === 'variation_codes_update') {
      // Handle variation codes update
      // This can be used to update available data plans
      console.log('Variation codes update received:', webhookData);
      // TODO: Implement variation codes update logic if needed
    } else {
      console.log('Unknown webhook type:', webhookType);
    }

    // Always return success response to VTPass
    return new Response(
      JSON.stringify({ response: 'success' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing VTPass webhook:', error);
    
    // Still return success to prevent infinite retries
    // Log the error for manual investigation
    return new Response(
      JSON.stringify({ response: 'success' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
