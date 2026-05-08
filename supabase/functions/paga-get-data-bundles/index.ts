import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

// Paga operator UUIDs
const OPERATOR_UUIDS: Record<string, string> = {
  'MTN': '42419156-DD57-4737-8373-20678CD9AA29',
  'GLO': 'B6780465-FEC4-4743-ACDE-9101E2991806',
  'AIRTEL': 'ACCF5E64-8FB2-47FF-9833-39EF482A6747',
  '9MOBILE': '8FCC90BA-D339-4EA8-811F-55F1651A9FAB',
};

interface DataBundle {
  id: string;
  name: string;
  amount: number;
  volume: string;
  validity: string;
}

// Simple in-memory cache with 1 hour TTL
const bundleCache: Map<string, { data: DataBundle[], timestamp: number }> = new Map();
const CACHE_TTL = 3600000; // 1 hour

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_SECRET_KEY = Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  const PAGA_BASE_URL = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status,
    });

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_SECRET_KEY || !PAGA_HASH_KEY) {
      console.error("Paga credentials not configured");
      return respond({ error: "Payment service not configured" }, 500);
    }

    const { network_provider } = await req.json();

    if (!network_provider || !OPERATOR_UUIDS[network_provider]) {
      return respond({ error: `Invalid network provider: ${network_provider}` }, 400);
    }

    // Check cache
    if (bundleCache.has(network_provider)) {
      const cached = bundleCache.get(network_provider);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return respond({ bundles: cached.data }, 200);
      }
    }

    // Call Paga Business API: getDataBundleByOperator
    const referenceNumber = generateReferenceNumber("BUNDLE");
    const operatorPublicId = OPERATOR_UUIDS[network_provider];

    const hash = await generatePagaBusinessHash(
      [referenceNumber, operatorPublicId],
      PAGA_HASH_KEY
    );

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/getDataBundleByOperator`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_SECRET_KEY, hash),
      body: JSON.stringify({
        referenceNumber,
        operatorPublicId,
      }),
    });

    const pagaData = await pagaResponse.json();

    if (pagaData.responseCode !== 0 && String(pagaData.responseCode) !== "0") {
      console.error("Paga API error:", pagaData);
      return respond({
        error: pagaData.responseMessage || "Failed to fetch data bundles",
      }, 400);
    }

    // Extract and map bundles
    const bundles = (pagaData.bundles || []).map((bundle: Record<string, unknown>) => ({
      id: String(bundle.serviceId || bundle.id || ""),
      name: String(bundle.displayName || bundle.name || ""),
      amount: Number(bundle.amount || 0),
      volume: String(bundle.volume || bundle.data || ""),
      validity: String(bundle.validity || ""),
    }));

    // Cache the result
    bundleCache.set(network_provider, { data: bundles, timestamp: Date.now() });

    return respond({ bundles }, 200);

  } catch (error) {
    console.error("Data bundles error:", error);
    return respond({
      error: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
});
