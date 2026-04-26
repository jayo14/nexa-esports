import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { PagaClient } from "../_shared/pagaClient.ts";

let banksCache: { data: any[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    // Return cached banks if still fresh
    if (banksCache && Date.now() - banksCache.fetchedAt < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ status: "success", data: banksCache.data }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    const pagaClient = new PagaClient();
    const banks = await pagaClient.getBanks();

    // Cache the result
    banksCache = { data: banks, fetchedAt: Date.now() };

    return new Response(
      JSON.stringify({ status: "success", data: banks }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error fetching Paga banks:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        status: "error"
      }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
