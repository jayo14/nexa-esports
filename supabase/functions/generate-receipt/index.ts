import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'https://nexa-esports.vercel.app',
];

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || origin.includes('lovable.app');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
);

Deno.serve(async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'Transaction ID is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Fetch the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        wallets(user_id)
      `)
      .eq('id', transaction_id)
      .single();

    if (transactionError || !transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Ensure the transaction belongs to the authenticated user
    if (transaction.wallets?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: Transaction does not belong to user' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    let sender = null;
    let recipient = null;

    // Enrich with sender/recipient for transfers
    if (transaction.type === 'transfer_in' || transaction.type === 'transfer_out') {
      const match = transaction.reference.match(/transfer_(from|to)_(.+)_\d/);
      if (match) {
        const direction = match[1];
        const ign = match[2];

        // Fetch profile for IGN
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('ign, status')
          .eq('ign', ign)
          .single();

        if (!profileError && profileData) {
          const prefix = profileData.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';
          if (direction === 'from') {
            sender = `${prefix}${profileData.ign}`;
            // The current user is the recipient
            const { data: currentUserProfile, error: currentUserProfileError } = await supabase
              .from('profiles')
              .select('ign, status')
              .eq('id', user.id)
              .single();
            if (!currentUserProfileError && currentUserProfile) {
              const recipientPrefix = currentUserProfile.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';
              recipient = `${recipientPrefix}${currentUserProfile.ign}`;
            }
          } else { // direction === 'to'
            recipient = `${prefix}${profileData.ign}`;
            // The current user is the sender
            const { data: currentUserProfile, error: currentUserProfileError } = await supabase
              .from('profiles')
              .select('ign, status')
              .eq('id', user.id)
              .single();
            if (!currentUserProfileError && currentUserProfile) {
              const senderPrefix = currentUserProfile.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';
              sender = `${senderPrefix}${currentUserProfile.ign}`;
            }
          }
        }
      }
    }

    const receipt = {
      transaction_id: transaction.id,
      date: new Date(transaction.created_at).toLocaleString(),
      type: transaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format type
      amount: Number(transaction.amount).toFixed(2),
      currency: transaction.currency || 'NGN', // Default to NGN if not set
      status: transaction.status.replace(/\b\w/g, l => l.toUpperCase()), // Format status
      reference: transaction.reference,
      sender: sender,
      recipient: recipient,
      // Add any other relevant details
    };

    return new Response(JSON.stringify(receipt), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
