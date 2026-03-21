
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import * as crypto from "https://deno.land/std@0.168.0/node/crypto.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req) => {
  const { endpoint, reference } = await req.json();

  if (endpoint === "verify-transaction") {
    const paystackUrl = `https://api.paystack.co/transaction/verify/${reference}`;
    const paystackResponse = await fetch(paystackUrl, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (paystackData.data.status === "success") {
      const { data: { metadata: { userId }, amount } } = paystackData.data;

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("wallet_balance")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error getting profile:", profileError);
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const newBalance = profile.wallet_balance + (amount / 100);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating wallet balance:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update wallet balance" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    return new Response(JSON.stringify(paystackData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.headers.get("x-paystack-signature")) {
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();

    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { data: { metadata: { userId }, amount } } = event;

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("wallet_balance")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error getting profile:", profileError);
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const newBalance = profile.wallet_balance + (amount / 100);

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating wallet balance:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update wallet balance" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 400,
  });
});
