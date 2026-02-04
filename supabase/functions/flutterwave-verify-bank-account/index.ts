import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { flutterwaveAuthenticatedFetch } from "../_shared/flutterwaveAuth.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLW_CLIENT_ID = Deno.env.get("FLW_CLIENT_ID")?.trim();
  const FLW_CLIENT_SECRET = Deno.env.get("FLW_CLIENT_SECRET")?.trim();

  try {
    const { account_number, account_bank } = await req.json();

    console.log(`Verifying account: ${account_number} with bank code: ${account_bank}`);

    if (!account_bank || !account_number) {
      return new Response(JSON.stringify({ error: "account_bank and account_number are required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!FLW_CLIENT_ID || !FLW_CLIENT_SECRET) {
      console.error("Flutterwave v4 credentials not configured");
      return new Response(JSON.stringify({ 
        error: "Account verification service not configured: FLW_CLIENT_ID and FLW_CLIENT_SECRET required",
        status: 'error'
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Determine base URL based on environment
    const isDevelopment = Deno.env.get("ENVIRONMENT") !== "production";
    const FLW_BASE_URL = isDevelopment 
      ? "https://developersandbox-api.flutterwave.com" 
      : "https://f4bexperience.flutterwave.com";

    // Flutterwave v4 account verification endpoint
    const response = await flutterwaveAuthenticatedFetch(
      `${FLW_BASE_URL}/accounts/resolve`,
      {
        method: "POST",
        body: JSON.stringify({
          account_number,
          account_bank,
        }),
      }
    );

    if (response.status === 401) {
      console.error("Flutterwave Authorization Failed resolving account: Invalid Secret Key");
      return new Response(JSON.stringify({ 
        error: "Account resolution failed: Authorization error with payment provider.",
        status: 'error'
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    const data = await response.json();

    if (data.status !== "success") {
      return new Response(JSON.stringify({ status: false, message: data.message }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Transform Flutterwave response to match expected format
    // Flutterwave returns: { status: "success", message: "...", data: { account_number, account_name } }
    return new Response(JSON.stringify({ 
      status: true, 
      data: {
        account_number: data.data.account_number,
        account_name: data.data.account_name,
      }
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('Error in verify-bank-account:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
