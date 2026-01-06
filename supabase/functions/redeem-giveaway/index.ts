import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
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

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: result, error } = await supabaseClient.rpc('redeem_giveaway_code', {
      p_code: code.trim().toUpperCase(),
    });

    if (error) {
      console.error("Error redeeming code:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!result.success) {
      // Enrich common failure responses with extra context when possible
      const payload: any = { success: false, message: result.message };

      // Handle cooldown message
      if (result.message === 'Cooldown active' && result.cooldown_seconds) {
        payload.cooldown_seconds = result.cooldown_seconds;
        return new Response(JSON.stringify(payload), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 429, // Too Many Requests
        });
      }

      // Handle invalid code
      if (result.message === 'Invalid code') {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Code does not exist' 
        }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 404,
        });
      }

      // Handle already redeemed code with extra context
      if (result.message === 'Code already redeemed') {
        try {
          const { data: codeRow } = await supabaseClient
            .from('giveaway_codes')
            .select('redeemed_by, redeemed_at')
            .eq('code', code.trim().toUpperCase())
            .maybeSingle();

          if (codeRow) {
            payload.redeemed_by = codeRow.redeemed_by;
            payload.redeemed_at = codeRow.redeemed_at;
          }
        } catch (e) {
          console.warn('Failed to fetch code redemption context:', e);
        }
      }

      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Unexpected error in redeem-giveaway:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
