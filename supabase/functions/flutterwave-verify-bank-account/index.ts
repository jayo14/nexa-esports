import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { account_number, account_bank } = await req.json();

    console.log(`Verifying account: ${account_number} with bank code: ${account_bank}`);

    if (!account_bank || !account_number) {
      return new Response(JSON.stringify({ error: "account_bank and account_number are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Flutterwave account verification endpoint
    const response = await fetch(`https://api.flutterwave.com/v3/accounts/resolve`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number,
        account_bank,
      }),
    });

    const data = await response.json();

    if (data.status !== "success") {
      return new Response(JSON.stringify({ status: false, message: data.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('Error in verify-bank-account:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
