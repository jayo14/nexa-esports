import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { flutterwaveAuthenticatedFetch } from "../_shared/flutterwaveAuth.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")?.trim();

  try {
    // Validate required environment variables
    if (!FLW_SECRET_KEY) {
      console.error("Flutterwave v3 credentials not configured");
      return new Response(JSON.stringify({ error: "Bank service not configured: FLW_SECRET_KEY required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Flutterwave v3 API base URL
    const FLW_BASE_URL = "https://api.flutterwave.com";

    // Flutterwave endpoint to get list of banks
    const flutterwaveUrl = `${FLW_BASE_URL}/v3/banks/NG`; // NG for Nigeria
    const flutterwaveResponse = await flutterwaveAuthenticatedFetch(flutterwaveUrl);

    if (flutterwaveResponse.status === 401) {
      console.error("Flutterwave Authorization Failed fetching banks: Invalid Secret Key");
      return new Response(JSON.stringify({
        error: "Failed to fetch banks: Authorization error with payment provider.",
        status: 'error'
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    const flutterwaveData = await flutterwaveResponse.json();

    // Transform Flutterwave response to match expected format
    // Flutterwave returns: { status: "success", message: "...", data: [ { id, code, name } ] }
    if (flutterwaveData.status === "success" && flutterwaveData.data) {
      return new Response(JSON.stringify({ 
        status: true, 
        data: flutterwaveData.data 
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify(flutterwaveData), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: flutterwaveResponse.status,
    });
  } catch (error) {
    console.error("Error in flutterwave-get-banks:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});