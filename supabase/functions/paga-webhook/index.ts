import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash } from "../_shared/pagaAuth.ts";

type ProviderState = "success" | "failed" | "processing";

function mapProviderState(payload: Record<string, unknown>): ProviderState {
  const responseCode = payload.responseCode ?? payload.statusCode;
  const statusText = String(
    payload.transactionStatus || payload.status || payload.responseMessage || payload.message || ""
  ).toUpperCase();
  const normalized = [statusText, String(payload.statusCode || "").toUpperCase()];

  if (responseCode === 0 || responseCode === "0" || responseCode === "SUCCESS") return "success";
  if (normalized.some((value) => ["SUCCESS", "SUCCESSFUL", "COMPLETED", "APPROVED", "PAID"].some((signal) => value.includes(signal)))) return "success";

  const failedSignals = ["FAILED", "FAIL", "ERROR", "DECLINED", "REJECT", "REVERSED", "CANCEL"];
  if (normalized.some((value) => failedSignals.some((signal) => value.includes(signal)))) return "failed";

  return "processing";
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();

  if (!PAGA_HASH_KEY || !PAGA_PUBLIC_KEY) {
    console.error("Paga credentials not configured");
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  try {
    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
    }

    const referenceNumber = String(payload.referenceNumber || payload.transactionId || payload.paymentReference || "");
    if (!referenceNumber) {
      console.error("No reference number found in payload:", payload);
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
    }

    const amount = payload.amount ? Number(payload.amount).toFixed(2) : "";
    const statusCode = String(payload.statusCode || payload.responseCode || "");

    // Paga webhook hash verification
    const receivedHash = req.headers.get("hash") || req.headers.get("x-paga-hash") || String(payload.hash || "");
    const IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

    let signatureValid = false;
    if (IS_SANDBOX && !receivedHash) {
      signatureValid = true;
    } else if (receivedHash) {
      // Attempt common webhook hash variants
      const variants = [
        [referenceNumber, amount, statusCode],
        [referenceNumber, amount],
        [referenceNumber],
      ];

      for (const variant of variants) {
        const expectedHash = await generatePagaBusinessHash(variant, PAGA_HASH_KEY);
        if (receivedHash.toLowerCase() === expectedHash.toLowerCase()) {
          signatureValid = true;
          break;
        }
      }
    }

    if (!signatureValid) {
      console.error("Invalid webhook signature", { referenceNumber, receivedHash, isSandbox: IS_SANDBOX });
      return new Response(JSON.stringify({ received: true, ignored: true, reason: "invalid_signature" }), { status: 200 });
    }

    const providerEventId = String(payload.eventId || payload.id || payload.notificationId || "") || null;

    const { data: existingEvent } = await supabaseAdmin
      .from("wallet_webhook_events")
      .select("id, handled")
      .eq("provider", "paga")
      .eq("provider_reference", referenceNumber)
      .maybeSingle();

    if (existingEvent?.handled) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    await supabaseAdmin.rpc("wallet_store_webhook_event", {
      p_provider: "paga",
      p_provider_event_id: providerEventId,
      p_provider_reference: referenceNumber,
      p_signature_valid: signatureValid,
      p_payload: payload,
    });

    // Lookup transaction by reference OR paga_reference
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .or(`reference.eq.${referenceNumber},paga_reference.eq.${referenceNumber}`)
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

    const settlementResult = await supabaseAdmin.rpc("wallet_process_settlement_jobs", { p_limit: 10 });

    console.log("Webhook processed successfully", {
      referenceNumber,
      status: mapProviderState(payload),
      transactionId: tx?.id,
      settlementResult,
    });

    return new Response(JSON.stringify({ received: true, settled: true }), { status: 200 });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }
});
