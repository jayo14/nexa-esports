import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLUTTERWAVE_SECRET_KEY = (Deno.env.get("FLUTTERWAVE_SECRET_KEY") || Deno.env.get("SECRET_KEY"))?.trim();

  if (!FLUTTERWAVE_SECRET_KEY || FLUTTERWAVE_SECRET_KEY === "your_flutterwave_secret_key_here") {
    console.error("FLUTTERWAVE_SECRET_KEY is not set or is still a placeholder");
    return new Response(JSON.stringify({ error: "Bank service not configured: FLUTTERWAVE_SECRET_KEY missing" }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }

  // Flutterwave endpoint to get list of banks
  const flutterwaveUrl = "https://api.flutterwave.com/v3/banks/NG"; // NG for Nigeria
  const flutterwaveResponse = await fetch(flutterwaveUrl, {
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const flutterwaveData = await flutterwaveResponse.json();

  // Transform Flutterwave response to match expected format
  // Flutterwave returns: { status: "success", message: "...", data: [ { id, code, name } ] }
  // We need to ensure compatibility with existing code that expects: { status: true, data: [ { code, name } ] }
  
  if (flutterwaveData.status === "success" && flutterwaveData.data) {
    return new Response(JSON.stringify({ 
      status: true, 
      data: flutterwaveData.data 
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(flutterwaveData), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
