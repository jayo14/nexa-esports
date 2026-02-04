import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY")?.trim();

  // Diagnostic logging (safe)
  console.log("Flutterwave Configuration Check:");
  console.log("- Secret Key present:", !!FLUTTERWAVE_SECRET_KEY);
  if (FLUTTERWAVE_SECRET_KEY) {
    console.log("- Secret Key prefix:", FLUTTERWAVE_SECRET_KEY.substring(0, 7) + "...");
  }

  try {
    // Validate required environment variables
    if (!FLUTTERWAVE_SECRET_KEY || FLUTTERWAVE_SECRET_KEY.includes("your_flutterwave_secret_key")) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set or is still a placeholder");
      return new Response(JSON.stringify({ 
        error: "Payment service not configured: FLUTTERWAVE_SECRET_KEY is invalid or missing" 
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
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
  
      // Check if deposits are enabled in clan_settings
      const { data: depositSetting } = await supabaseAdmin
        .from('clan_settings')
        .select('value')
        .eq('key', 'deposits_enabled')
        .maybeSingle();

      if (depositSetting && depositSetting.value === false) {
        return new Response(JSON.stringify({ 
          error: "Deposits are currently disabled by the clan master.",
          status: 'error' 
        }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 403,
        });
      }

      const { amount, customer, redirect_url } = await req.json();

      // Validate input
      if (!amount || amount < 500) {
        return new Response(JSON.stringify({ error: "Minimum amount is ₦500" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (amount > 50000) {
        return new Response(JSON.stringify({ error: "Maximum amount is ₦50,000" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      if (!customer?.email) {
        return new Response(JSON.stringify({ error: "Customer email is required" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Generate unique transaction reference using crypto for better uniqueness
      const randomBytes = new Uint8Array(8);
      crypto.getRandomValues(randomBytes);
      const randomStr = Array.from(randomBytes)
        .map(b => b.toString(36))
        .join('')
        .substring(0, 7);
      const tx_ref = `FLW_${Date.now()}_${randomStr}`;

      // Create payment payload for Flutterwave Standard/Inline
      const paymentPayload = {
        tx_ref,
        amount,
        currency: "NGN",
        redirect_url: redirect_url || `${origin}/payment-success`,
        payment_options: "card,mobilemoney,ussd,banktransfer",
        customer: {
          email: customer.email,
          phonenumber: customer.phone || undefined,
          name: customer.name || "Nexa User",
        },
        customizations: {
          title: "Nexa Elite Nexus",
          description: "Wallet Funding",
          logo: `${origin}/nexa-logo.jpg`,
        },
        meta: {
          userId: user.id,
        },
      };

      console.log("Initiating Flutterwave payment with payload:", JSON.stringify(paymentPayload, null, 2));
  
      // Call Flutterwave API to initialize payment
      const flutterwaveResponse = await fetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      });
    const flutterwaveData = await flutterwaveResponse.json();
    console.log("Flutterwave response status:", flutterwaveResponse.status);
    console.log("Flutterwave response body:", JSON.stringify(flutterwaveData, null, 2));

    if (flutterwaveResponse.status === 401) {
      console.error("Flutterwave Authorization Failed: Invalid Secret Key");
      return new Response(JSON.stringify({ 
        error: "Authorization failed with payment provider. Please check API configuration.",
        status: 'error'
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!flutterwaveResponse.ok || flutterwaveData.status !== "success") {
      console.error("Flutterwave payment initialization failed:", flutterwaveData);
      return new Response(JSON.stringify({ 
        error: "Payment initialization failed", 
        details: flutterwaveData.message || "Unknown error",
        flutterwave_message: flutterwaveData.message 
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Return the payment link to the client
    return new Response(JSON.stringify({
      status: "success",
      data: {
        link: flutterwaveData.data.link,
        tx_ref,
      },
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
