import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePagaBusinessHash, pagaHeaders } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

type ProviderState = "success" | "failed" | "processing";

function mapProviderState(payload: Record<string, unknown> | undefined): ProviderState {
  if (!payload) return "processing";

  const responseCode = payload.responseCode;
  const statusText = String(
    payload.transactionStatus || payload.status || payload.responseMessage || payload.message || ""
  ).toUpperCase();

  if (responseCode === 0 || responseCode === "0") return "success";
  if (statusText.includes("SUCCESS")) return "success";

  const failedSignals = ["FAILED", "FAIL", "ERROR", "DECLINED", "REJECT", "REVERSED", "CANCEL"];
  if (failedSignals.some((signal) => statusText.includes(signal))) return "failed";

  return "processing";
}

async function checkPagaTransactionStatus(
  reference: string,
  baseUrl: string,
  publicKey: string,
  apiPassword: string,
  hashKey: string
): Promise<{ state: ProviderState; raw?: Record<string, unknown> }> {
  try {
    const hash = await generatePagaBusinessHash([reference], hashKey);
    const response = await fetch(`${baseUrl}/transactionStatus`, {
      method: "POST",
      headers: pagaHeaders(publicKey, apiPassword, hash),
      body: JSON.stringify({ referenceNumber: reference }),
    });

    const text = await response.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return { state: "processing" };
    }

    return { state: mapProviderState(data), raw: data };
  } catch (err) {
    console.error("Paga transactionStatus error:", err);
    return { state: "processing" };
  }
}

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

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status,
    });

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      console.error("Payment service not configured", {
        hasPagaPublicKey: !!PAGA_PUBLIC_KEY,
        hasPagaHashKey: !!PAGA_HASH_KEY,
        hasPagaApiPassword: !!PAGA_API_PASSWORD,
        timestamp: new Date().toISOString(),
      });
      return respond({ error: "Payment service not configured: Paga credentials missing" }, 500);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { referenceNumber, tx_ref } = await req.json();
    const reference = referenceNumber || tx_ref;
    if (!reference) {
      console.warn("Payment verification called without reference", {
        timestamp: new Date().toISOString(),
      });
      return respond({ error: "referenceNumber or tx_ref is required" }, 400);
    }

    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("id, wallet_state, status, reference, wallet_id, amount, user_id")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tx) {
      return respond({ status: "processing", message: "Transaction not found yet. Retry shortly.", reference });
    }

    if (["success", "failed", "reversed", "expired"].includes(tx.wallet_state || tx.status)) {
      return respond({
        status: tx.wallet_state || tx.status,
        message: "Transaction already finalized",
        reference,
      });
    }

    const providerCheck = await checkPagaTransactionStatus(
      reference,
      PAGA_BASE_URL,
      PAGA_PUBLIC_KEY,
      PAGA_API_PASSWORD,
      PAGA_HASH_KEY
    );

    const decision = providerCheck.state;

    console.log("Payment verification completed", {
      reference,
      decision,
      hasTransaction: !!tx,
      timestamp: new Date().toISOString(),
    });

    await supabaseAdmin.rpc("wallet_record_provider_operation", {
      p_transaction_id: tx.id,
      p_operation_type: "status_check",
      p_operation_key: `verify:${reference}:${Date.now()}`,
      p_provider_request: { referenceNumber: reference },
      p_provider_response: providerCheck.raw ?? {},
      p_provider_status_code: String(providerCheck.raw?.responseCode ?? ""),
      p_signature_valid: null,
    });

    await supabaseAdmin.rpc("wallet_enqueue_settlement", {
      p_transaction_id: tx.id,
      p_provider_reference: reference,
      p_decision_hint: decision,
      p_evidence: { source: "verify", provider: providerCheck.raw ?? {} },
      p_source: "verify_endpoint",
      p_delay_seconds: 0,
    });

    await supabaseAdmin.rpc("wallet_process_settlement_jobs", { p_limit: 5 });

    const { data: refreshed } = await supabaseAdmin
      .from("transactions")
      .select("wallet_state, status, wallet_id")
      .eq("id", tx.id)
      .maybeSingle();

    const currentState = (refreshed?.wallet_state || refreshed?.status || "processing") as string;

    // Fetch updated wallet balance for display
    let newBalance: number | null = null;
    if (refreshed?.wallet_id && (currentState === "success")) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("balance")
        .eq("id", refreshed.wallet_id)
        .maybeSingle();
      newBalance = wallet?.balance ?? null;
    }

    return respond({
      status: currentState,
      message:
        currentState === "success"
          ? "Payment settled successfully."
          : currentState === "failed" || currentState === "reversed" || currentState === "expired"
          ? "Payment finalized with non-success status."
          : "Transaction is still processing.",
      reference,
      newBalance,
    });
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      path: '/paga-verify-payment',
    };
    console.error("Error in paga-verify-payment:", errorDetails);
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
