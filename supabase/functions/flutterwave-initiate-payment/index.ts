import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { flutterwaveAuthenticatedFetch } from "../_shared/flutterwaveAuth.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")?.trim();

  // Diagnostic logging (safe)
  console.log("Flutterwave v3 Configuration Check:");
  console.log("- FLW_SECRET_KEY found:", !!FLW_SECRET_KEY);
  if (FLW_SECRET_KEY) console.log("- FLW_SECRET_KEY prefix:", FLW_SECRET_KEY.substring(0, 5) + "...");

  try {
    // Validate required environment variables for v3
    if (!FLW_SECRET_KEY) {
      console.error("Missing Flutterwave v3 credentials: FLW_SECRET_KEY");
      
      return new Response(JSON.stringify({ 
        error: "Payment service not configured: FLW_SECRET_KEY is required",
        missing_vars: ["FLW_SECRET_KEY"]
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
        reference: tx_ref, // v4 often uses 'reference' instead of 'tx_ref'
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

      // Flutterwave v3 API base URL
      const FLW_BASE_URL = "https://api.flutterwave.com";

      console.log(`Initiating Flutterwave v3 payment via ${FLW_BASE_URL}...`);
  
      // Call Flutterwave v3 API to initialize payment
      const flutterwaveResponse = await flutterwaveAuthenticatedFetch(
        `${FLW_BASE_URL}/v3/payments`,
        {
          method: "POST",
          body: JSON.stringify(paymentPayload),
        }
      );
    const responseText = await flutterwaveResponse.text();
    let flutterwaveData: any;
    try {
      flutterwaveData = JSON.parse(responseText);
    } catch (e) {
      console.error("Flutterwave v4 response was not valid JSON:", responseText);
      return new Response(JSON.stringify({ 
        error: "Invalid response from payment provider", 
        details: responseText.substring(0, 200),
        status: flutterwaveResponse.status
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }
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

    if (!flutterwaveResponse.ok || (flutterwaveData.status !== "success" && flutterwaveData.status !== "successful")) {
      console.error("Flutterwave payment initialization failed:", flutterwaveData);
      return new Response(JSON.stringify({ 
        error: "Payment initialization failed", 
        details: flutterwaveData.message || flutterwaveData.error_description || "Unknown error",
        flutterwave_message: flutterwaveData.message,
        raw_response: flutterwaveData,
        status_code: flutterwaveResponse.status
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
