import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

let banksCache: { data: any[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

  const PAGA_BASE_URL = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Service not configured: Paga credentials missing (Public Key, Password, or Hash Key)" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }
    // Return cached banks if still fresh
    if (banksCache && Date.now() - banksCache.fetchedAt < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ status: "success", data: banksCache.data }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Paga getBanks hash: Typically referenceNumber + salt
    const referenceNumber = generateReferenceNumber("GB");
    const hash = await generatePagaBusinessHash([referenceNumber], PAGA_HASH_KEY);

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/getBanks`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
      body: JSON.stringify({ referenceNumber }),
    });

    const responseText = await pagaResponse.text();
    let pagaData: any;
    try {
      pagaData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid response from Paga" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!pagaResponse.ok || (pagaData.responseCode !== 0 && pagaData.responseCode !== "0")) {
      console.error("Paga getBanks error:", JSON.stringify(pagaData));
      return new Response(
        JSON.stringify({ error: "Failed to fetch banks", details: pagaData.responseMessage, paga_response: pagaData }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    const banks = pagaData.bank || pagaData.banks || pagaData.data || [];

    // Cache the result
    banksCache = { data: banks, fetchedAt: Date.now() };

    return new Response(
      JSON.stringify({ status: "success", data: banks }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error fetching Paga banks:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
