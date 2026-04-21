import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash } from "../_shared/pagaAuth.ts";

type ProviderState = "success" | "failed" | "processing";

function mapProviderState(payload: Record<string, unknown>): ProviderState {
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

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();

  if (!PAGA_HASH_KEY || !PAGA_PUBLIC_KEY) {
    console.error("Paga credentials not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const referenceNumber = String(payload.referenceNumber || payload.transactionId || "");
  if (!referenceNumber) {
    return new Response("Missing reference", { status: 400 });
  }

  const amount = payload.amount ? Number(payload.amount).toFixed(2) : "";
  const statusCode = String(payload.statusCode || payload.responseCode || "");

  const expectedHash = await generatePagaBusinessHash([referenceNumber, amount, statusCode], PAGA_HASH_KEY);
  const receivedHash = req.headers.get("hash") || req.headers.get("x-paga-hash") || String(payload.hash || "");

  const IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  const signatureValid = IS_SANDBOX && !receivedHash ? true : Boolean(receivedHash && receivedHash === expectedHash);

  if (!signatureValid) {
    console.error("Invalid webhook signature", { referenceNumber });
    return new Response("Invalid signature", { status: 401 });
  }

  const providerEventId =
    String(payload.eventId || payload.id || payload.notificationId || "") || null;

  await supabaseAdmin.rpc("wallet_store_webhook_event", {
    p_provider: "paga",
    p_provider_event_id: providerEventId,
    p_provider_reference: referenceNumber,
    p_signature_valid: signatureValid,
    p_payload: payload,
  });

  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("reference", referenceNumber)
    .maybeSingle();

  if (tx?.id) {
    await supabaseAdmin.rpc("wallet_record_provider_operation", {
      p_transaction_id: tx.id,
      p_operation_type: "webhook_event",
      p_operation_key: providerEventId ? `webhook:${providerEventId}` : `webhook:${referenceNumber}:${Date.now()}`,
      p_provider_request: null,
      p_provider_response: payload,
      p_provider_status_code: String(payload.responseCode || payload.statusCode || ""),
      p_signature_valid: signatureValid,
    });
  }

  await supabaseAdmin.rpc("wallet_enqueue_settlement", {
    p_transaction_id: tx?.id || null,
    p_provider_reference: referenceNumber,
    p_decision_hint: mapProviderState(payload),
    p_evidence: { source: "webhook", payload },
    p_source: "paga_webhook",
    p_delay_seconds: 0,
  });

  await supabaseAdmin.rpc("wallet_process_settlement_jobs", { p_limit: 10 });

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
