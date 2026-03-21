import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface BankingInfo {
  account_name: string;
  account_number: string;
  bank_code: string;
  bank_name?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if user is clan master or admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, banking_info')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (profile.role !== 'clan_master' && profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Unauthorized - Only clan masters can cash out earnings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (!profile.banking_info) {
      return new Response(JSON.stringify({ error: "Banking information not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get total earnings - Since this is for clan masters, they manage all clan finances
    // The earnings table is a global table tracking all clan revenue
    const { data: earnings, error: earningsError } = await supabaseClient
      .from('earnings')
      .select('amount');

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      return new Response(JSON.stringify({ error: "Failed to fetch earnings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);

    if (amount > totalEarnings) {
      return new Response(JSON.stringify({ error: "Insufficient earnings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Process the withdrawal via Paystack
    const bankingInfo = profile.banking_info as BankingInfo;
    
    // Create transfer recipient
    const recipientPayload = {
      endpoint: 'create-transfer-recipient',
      name: bankingInfo.account_name,
      account_number: bankingInfo.account_number,
      bank_code: bankingInfo.bank_code,
    };

    const recipientResponse = await supabaseClient.functions.invoke('paystack-transfer', {
      headers: {
        'Authorization': authHeader,
      },
      body: recipientPayload,
    });

    if (recipientResponse.error || !recipientResponse.data?.status) {
      console.error('Error creating transfer recipient:', recipientResponse.error);
      return new Response(JSON.stringify({ error: "Failed to create transfer recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Initiate transfer
    const idempotencyKey = `earnings-cashout-${user.id}-${Date.now()}`;
    const transferPayload = {
      endpoint: 'initiate-transfer',
      amount,
      recipient_code: recipientResponse.data.data.recipient_code,
      idempotency_key: idempotencyKey,
      reason: 'Earnings cashout',
    };

    const transferResponse = await supabaseClient.functions.invoke('paystack-transfer', {
      headers: {
        'Authorization': authHeader,
      },
      body: transferPayload,
    });

    if (transferResponse.error || !transferResponse.data?.status) {
      console.error('Error initiating transfer:', transferResponse.error);
      return new Response(JSON.stringify({ error: "Failed to initiate transfer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Cashout initiated successfully",
      transfer: transferResponse.data,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error processing cashout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
