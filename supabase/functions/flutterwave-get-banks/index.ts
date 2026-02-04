import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { flutterwaveAuthenticatedFetch } from "../_shared/flutterwaveAuth.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLW_CLIENT_ID = Deno.env.get("FLW_CLIENT_ID")?.trim();
  const FLW_CLIENT_SECRET = Deno.env.get("FLW_CLIENT_SECRET")?.trim();

  try {
    // Validate required environment variables
    if (!FLW_CLIENT_ID || !FLW_CLIENT_SECRET) {
      console.error("Flutterwave v4 credentials not configured");
      return new Response(JSON.stringify({ error: "Bank service not configured: FLW_CLIENT_ID and FLW_CLIENT_SECRET required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Determine base URL based on environment
    const isDevelopment = Deno.env.get("ENVIRONMENT") !== "production";
    const FLW_BASE_URL = isDevelopment 
      ? "https://developersandbox-api.flutterwave.com" 
      : "https://f4bexperience.flutterwave.com";

    // Flutterwave v4 endpoint to get list of banks
    const flutterwaveUrl = `${FLW_BASE_URL}/banks/NG`; // NG for Nigeria
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