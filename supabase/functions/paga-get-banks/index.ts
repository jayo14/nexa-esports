import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generatePagaHashAsync } from "../_shared/pagaAuth.ts";

const PAGA_BASE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";

// Simple in-memory cache for banks list (valid for 1 hour)
let banksCache: { data: any[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY) {
      return new Response(
        JSON.stringify({ error: "Service not configured: Paga credentials missing" }),
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

    // Paga getBanks hash: apiKey (hashKey)
    const hash = await generatePagaHashAsync([PAGA_PUBLIC_KEY], PAGA_HASH_KEY);

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/getBanks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "principal": PAGA_PUBLIC_KEY,
        "credentials": hash,
        "hash": hash,
      },
      body: JSON.stringify({}),
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
      return new Response(
        JSON.stringify({ error: "Failed to fetch banks", details: pagaData.responseMessage }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    const banks = pagaData.banks || pagaData.data || [];

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
