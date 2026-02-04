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

  const FLW_CLIENT_ID = Deno.env.get("FLW_CLIENT_ID")?.trim();
  const FLW_CLIENT_SECRET = Deno.env.get("FLW_CLIENT_SECRET")?.trim();

  // Diagnostic logging (safe)
  console.log("Flutterwave v4 Configuration Check:");
  console.log("- FLW_CLIENT_ID found:", !!FLW_CLIENT_ID);
  if (FLW_CLIENT_ID) console.log("- FLW_CLIENT_ID prefix:", FLW_CLIENT_ID.substring(0, 5) + "...");
  
  console.log("- FLW_CLIENT_SECRET found:", !!FLW_CLIENT_SECRET);
  if (FLW_CLIENT_SECRET) console.log("- FLW_CLIENT_SECRET prefix:", FLW_CLIENT_SECRET.substring(0, 5) + "...");

  try {
    // Validate required environment variables for v4 OAuth
    if (!FLW_CLIENT_ID || !FLW_CLIENT_SECRET) {
      const missing = [];
      if (!FLW_CLIENT_ID) missing.push("FLW_CLIENT_ID");
      if (!FLW_CLIENT_SECRET) missing.push("FLW_CLIENT_SECRET");
      
      console.error(`Missing Flutterwave v4 credentials: ${missing.join(", ")}`);
      
      return new Response(JSON.stringify({ 
        error: `Payment service not configured: ${missing.join(" and ")} are required for v4`,
        missing_vars: missing
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

      // Flutterwave API base URL (same for sandbox and production, credentials differ)
      // Note: v4 refers to OAuth 2.0 authentication, but API endpoints still use /v3/ paths
      const FLW_BASE_URL = "https://api.flutterwave.com";

      console.log(`Initiating Flutterwave payment via ${FLW_BASE_URL}...`);
  
      // Call Flutterwave API to initialize payment with OAuth authentication
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
