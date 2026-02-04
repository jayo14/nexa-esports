import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import process from "node:process";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY")?.trim();

  try {
    const { account_number, account_bank } = await req.json();

    console.log(`Verifying account: ${account_number} with bank code: ${account_bank}`);

    if (!account_bank || !account_number) {
      return new Response(JSON.stringify({ error: "account_bank and account_number are required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Flutterwave account verification endpoint
    const response = await fetch(`https://api.flutterwave.com/v3/accounts/resolve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number,
        account_bank,
      }),
    });

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
