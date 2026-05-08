import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

async function queryPagaStatus(
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
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "processing" };
    }

    return { state: mapProviderState(payload), raw: payload };
  } catch (error) {
    console.error("Reconciliation provider query failed:", error);
    return { state: "processing" };
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const WORKER_TOKEN = Deno.env.get("WALLET_SETTLEMENT_WORKER_TOKEN")?.trim();
  const authHeader = req.headers.get("Authorization") || "";

  if (!WORKER_TOKEN || authHeader !== `Bearer ${WORKER_TOKEN}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim() || Deno.env.get("PAGA_CLIENT_ID")?.trim();
  const PAGA_SECRET_KEY = Deno.env.get("PAGA_SECRET_KEY")?.trim() 
    || Deno.env.get("PAGA_API_PASSWORD")?.trim()
    || Deno.env.get("PAGA_SECRET")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim() 
    || Deno.env.get("PAGA_HMAC")?.trim()
    || Deno.env.get("PAGA_API_KEY")?.trim();
  const PAGA_BASE_URL = Deno.env.get("PAGA_IS_SANDBOX") === "true" ? SANDBOX_URL : LIVE_URL;

  if (!PAGA_PUBLIC_KEY || !PAGA_SECRET_KEY || !PAGA_HASH_KEY) {
    return new Response(JSON.stringify({ error: "Paga credentials missing" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const runIdRes = await supabaseAdmin.rpc("wallet_start_reconciliation_run");
  if (runIdRes.error || !runIdRes.data) {
    return new Response(JSON.stringify({ error: runIdRes.error?.message || "failed_to_start_run" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  const runId = String(runIdRes.data);

  let checked = 0;
  let queued = 0;
  let findings = 0;

  try {
    const { data: pendingTx, error: pendingErr } = await supabaseAdmin
      .from("transactions")
      .select("id, reference, paga_reference, wallet_state, updated_at")
      .in("wallet_state", ["pending", "processing"])
      .eq("provider", "paga")
      .order("updated_at", { ascending: true })
      .limit(100);

    if (pendingErr) throw pendingErr;

    for (const tx of pendingTx || []) {
      const reference = tx.paga_reference || tx.reference;
      if (!reference) continue;
      checked += 1;

      const provider = await queryPagaStatus(reference, PAGA_BASE_URL, PAGA_PUBLIC_KEY, PAGA_SECRET_KEY, PAGA_HASH_KEY);

      await supabaseAdmin.rpc("wallet_record_provider_operation", {
        p_transaction_id: tx.id,
        p_operation_type: "status_check",
        p_operation_key: `recon:${reference}:${Date.now()}`,
        p_provider_request: { referenceNumber: reference },
        p_provider_response: provider.raw ?? {},
        p_provider_status_code: String((provider.raw as any)?.responseCode ?? ""),
        p_signature_valid: null,
      });

      await supabaseAdmin.rpc("wallet_enqueue_settlement", {
        p_transaction_id: tx.id,
        p_provider_reference: reference,
        p_decision_hint: provider.state,
        p_evidence: { source: "reconciliation", provider: provider.raw ?? {} },
        p_source: "wallet_reconciliation_worker",
        p_delay_seconds: 0,
      });
      queued += 1;

      if (provider.state === "failed" && tx.wallet_state === "processing") {
        findings += 1;
        await supabaseAdmin.rpc("wallet_add_reconciliation_finding", {
          p_run_id: runId,
          p_transaction_id: tx.id,
          p_severity: "high",
          p_finding_type: "terminal_state_mismatch",
          p_db_state: tx.wallet_state,
          p_provider_state: provider.state,
          p_action_state: "queued_for_settlement",
          p_details: { reference, provider: provider.raw ?? {} },
        });
      }
    }

    const settleRes = await supabaseAdmin.rpc("wallet_process_settlement_jobs", { p_limit: 100 });

    await supabaseAdmin.rpc("wallet_finish_reconciliation_run", {
      p_run_id: runId,
      p_status: "completed",
      p_summary: {
        checked,
        queued,
        findings,
        settlement_result: settleRes.data || null,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, runId, checked, queued, findings, settlement: settleRes.data || null }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    await supabaseAdmin.rpc("wallet_finish_reconciliation_run", {
      p_run_id: runId,
      p_status: "failed",
      p_summary: { checked, queued, findings, error: error instanceof Error ? error.message : String(error) },
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error), runId }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
