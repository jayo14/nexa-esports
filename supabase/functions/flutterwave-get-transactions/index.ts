import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY")?.trim();
  const FLUTTERWAVE_CLIENT_ID = Deno.env.get("FLUTTERWAVE_CLIENT_ID")?.trim();

  try {
    // Create a Supabase client with the user's auth token
    const supabaseClient = createClient(
      process.env.SUPABASE_URL || Deno.env.get('SUPABASE_URL') || '',
      process.env.SUPABASE_ANON_KEY || Deno.env.get('SUPABASE_ANON_KEY') || '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || !user.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      console.error("FLUTTERWAVE_SECRET_KEY is not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get optional query parameters
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status") || "successful";
    
    // Construct Flutterwave URL
    let fwUrl = `https://api.flutterwave.com/v3/transactions?customer_email=${encodeURIComponent(user.email)}&status=${status}`;
    if (from) fwUrl += `&from=${from}`;
    if (to) fwUrl += `&to=${to}`;

    console.log(`Fetching transactions for ${user.email} from Flutterwave...`);

    const fwResponse = await fetch(fwUrl, {
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Secret-Key": FLUTTERWAVE_SECRET_KEY || "",
        "Client-Id": FLUTTERWAVE_CLIENT_ID || "",
        "Content-Type": "application/json",
      },
    });

    if (fwResponse.status === 401) {
      console.error("Flutterwave Authorization Failed fetching transactions: Invalid Secret Key");
      return new Response(JSON.stringify({ 
        error: "Failed to fetch transactions: Authorization error with payment provider.",
        status: 'error'
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!fwResponse.ok) {
      let errorDetails = "Unknown upstream error";
      try {
        const errorJson = await fwResponse.json();
        errorDetails = errorJson.message || errorJson.data?.message || JSON.stringify(errorJson);
      } catch {
        errorDetails = await fwResponse.text();
      }
      
      console.error(`Flutterwave API error: ${fwResponse.status}`, errorDetails);
      
      return new Response(JSON.stringify({ 
        error: "upstream_api_error", 
        message: "Failed to fetch transactions from payment provider", 
        details: errorDetails 
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: fwResponse.status, // Pass through the status code (e.g., 401, 400)
      });
    }

    const fwData = await fwResponse.json();

    return new Response(JSON.stringify(fwData), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in flutterwave-get-transactions:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
