import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash } from "../_shared/pagaAuth.ts";
import { mapPagaProviderState } from "../_shared/walletSettlement.ts";

serve(async (req) => {
  // 1. Reject non-POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }

  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

  try {
    // 2. Read raw body as text (needed for hash)
    const rawBody = await req.text();

    // 3. Parse JSON from raw body
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ received: true, ignored: true, reason: "invalid_json" }), { status: 200 });
    }

    // 4. Extract referenceNumber from payload
    const referenceNumber = String(payload.referenceNumber || payload.transactionId || payload.paymentReference || "");

    // 5. If no referenceNumber -> ignore
    if (!referenceNumber) {
      return new Response(JSON.stringify({ received: true, ignored: true, reason: "no_reference" }), { status: 200 });
    }

    // 6. Validate Paga signature
    const receivedHash = req.headers.get("hash") || req.headers.get("x-paga-hash") || String(payload.hash || "");
    const amount = payload.amount ? Number(payload.amount).toFixed(2) : "";
    const statusCode = String(payload.statusCode || payload.responseCode || "");

    let signatureValid = false;
    if (IS_SANDBOX && !receivedHash) {
      signatureValid = true;
    } else if (receivedHash && PAGA_HASH_KEY) {
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

    // 7. If signature invalid AND not sandbox -> ignore
    if (!signatureValid && !IS_SANDBOX) {
      console.warn("Invalid webhook signature", { referenceNumber, receivedHash });
      return new Response(JSON.stringify({ received: true, ignored: true, reason: "invalid_signature" }), { status: 200 });
    }

    // 8. Compute payload_hash = SHA-256 of raw body
    const encoder = new TextEncoder();
    const data = encoder.encode(rawBody);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const payloadHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const providerEventId = String(payload.eventId || payload.id || payload.notificationId || "") || null;

    // 9. INSERT into wallet_webhook_events (ON CONFLICT DO NOTHING)
    const { data: insertedEvent, error: insertError } = await supabaseAdmin
      .from("wallet_webhook_events")
      .insert({
        provider: "paga",
        provider_event_id: providerEventId,
        provider_reference: referenceNumber,
        signature_valid: signatureValid,
        payload: payload,
        payload_hash: payloadHash,
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
      }
      console.error("Failed to store webhook event:", insertError);
      return new Response(JSON.stringify({ received: true, error: true }), { status: 200 });
    }

    if (!insertedEvent) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // 10. Map provider state
    const providerState = mapPagaProviderState(payload);

    // 11. Call wallet_enqueue_settlement RPC
    await supabaseAdmin.rpc("wallet_enqueue_settlement", {
      p_transaction_id: null,
      p_provider_reference: referenceNumber,
      p_decision_hint: providerState,
      p_evidence: { source: "paga_webhook", provider: payload },
      p_source: "paga_webhook",
      p_delay_seconds: 0
    });

    // 12. Return 200
    return new Response(JSON.stringify({ received: true, queued: true, state: providerState }), { status: 200 });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ received: true, error: true }), { status: 200 });
  }
});
