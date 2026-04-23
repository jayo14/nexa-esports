import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
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

    const { recipient_ign, amount } = await req.json();

    if (!recipient_ign || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Rate limiting: max 5 transfers per hour
    const { data: recentTransfers, error: limitError } = await supabaseAdmin
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('type', 'transfer_out')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (limitError) {
      console.error("Error checking rate limit:", limitError);
    } else if (recentTransfers && recentTransfers.length >= 5) {
      return new Response(JSON.stringify({ error: "Transfer limit exceeded. Maximum 5 transfers per hour." }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Execute transfer via atomic RPC
    const { data: result, error } = await supabaseAdmin.rpc('execute_user_transfer', {
      sender_id: user.id,
      recipient_ign,
      amount,
    });

    if (error) {
      console.error("Error executing user transfer:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400, // Using 400 for foreseeable errors like "insufficient funds"
      });
    }

    // Send notification to recipient
    try {
      const { data: recipient } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('ign', recipient_ign)
        .maybeSingle();

      if (recipient) {
        await supabaseAdmin.rpc('send_notification', {
          p_user_id: recipient.id,
          p_title: `Transfer received from ${(await supabaseAdmin.from('profiles').select('ign').eq('id', user.id).maybeSingle()).data?.ign || 'Unknown'}`,
          p_body: `You received ₦${amount.toLocaleString('en-NG')} from a player transfer`,
          p_type: 'transfer_received',
          p_metadata: { transfer_amount: amount, from_user_id: user.id },
        });
      }
    } catch (notifError) {
      console.warn("Could not send notification:", notifError);
      // Don't fail the transfer if notification fails
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Transfer successful",
      data: result 
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Unexpected error in transfer-funds:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
