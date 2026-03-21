import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const { amount, customer, redirect_url, metadata } = await req.json();

    if (!PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Paystack secret key not set" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Amount in kobo
    const amountInKobo = Math.floor(amount * 100);

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInKobo,
        email: customer.email,
        callback_url: redirect_url,
        metadata: {
          ...metadata,
          custom_fields: [
            {
              display_name: "Customer Name",
              variable_name: "customer_name",
              value: customer.name,
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return new Response(JSON.stringify({ error: data.message }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      data: {
        link: data.data.authorization_url,
        reference: data.data.reference
      } 
    }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});
