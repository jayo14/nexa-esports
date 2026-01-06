
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const paystackUrl = "https://api.paystack.co/bank";
  const paystackResponse = await fetch(paystackUrl, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const paystackData = await paystackResponse.json();

  return new Response(JSON.stringify(paystackData), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
});
