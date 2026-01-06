import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
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
