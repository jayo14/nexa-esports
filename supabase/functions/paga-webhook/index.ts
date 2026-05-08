import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash, generateSHA512Hash } from "../_shared/pagaAuth.ts";
import { settlePagaWalletTransaction } from "../_shared/walletSettlement.ts";

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

    // For Dynamic Payment Identifier callbacks Paga sends externalReferenceNumber, NOT referenceNumber
    const referenceNumber = String(
      payload.externalReferenceNumber ||
      payload.referenceNumber ||
      payload.transactionReference ||
      payload.paymentReference ||
      ""
    );
    if (!referenceNumber) {
      console.error("No reference number found in payload:", payload);
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
    }

    const statusCode = String(payload.statusCode || payload.responseCode || "");
    const receivedHash = req.headers.get("hash") || req.headers.get("x-paga-hash") || String(payload.hash || "");
    const IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

    let signatureValid = false;
    if (IS_SANDBOX && !receivedHash) {
      // Sandbox may not send a hash — allow through
      signatureValid = true;
    } else if (receivedHash) {
      // Paga Collect payment request callback hash spec:
      // notificationId + statusCode + externalReferenceNumber + state + outstandingBalance + hashKey
      // outstandingBalance is OMITTED from concat entirely if null/missing.
      // When present it must be formatted as "#.00" (two decimal places, no commas).
      const notificationId = String(payload.notificationId || "");
      const state = String(payload.state || "");
      const outstandingBalanceRaw = payload.outstandingBalance;
      const outstandingBalance =
        outstandingBalanceRaw != null && outstandingBalanceRaw !== ""
          ? Number(outstandingBalanceRaw).toFixed(2)
          : null;

      const hashVariants: (string | null)[][] = [
        // Full spec with outstandingBalance present
        ...(outstandingBalance !== null
          ? [[notificationId, statusCode, referenceNumber, state, outstandingBalance]]
          : []),
        // Without outstandingBalance (null or missing)
        [notificationId, statusCode, referenceNumber, state],
        // Fallback: some sandbox payloads omit notificationId
        [statusCode, referenceNumber, state],
      ];

      for (const variant of hashVariants) {
        const expectedHash = await generateSHA512Hash([...variant, PAGA_HASH_KEY]);
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

    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("id")
      .or(`reference.eq.${referenceNumber},paga_reference.eq.${referenceNumber}`)
      .maybeSingle();

    const settled = await settlePagaWalletTransaction({
      transactionId: tx?.id || null,
      reference: referenceNumber,
      providerPayload: payload,
      providerRequest: null,
      operationType: "webhook_event",
      operationKey: providerEventId ? `webhook:${providerEventId}` : `webhook:${referenceNumber}:${Date.now()}`,
      source: "paga_webhook",
      signatureValid,
      delaySeconds: 0,
      checkRemote: false,
    });

    // Explicitly trigger settlement if provider reports success
    const isSuccessful =
      settled.state === "success" ||
      settled.providerState === "success" ||
      payload.event === "PAYMENT_COMPLETE" ||
      payload.state === "CONSUMED" ||
      statusCode === "0" ||
      statusCode === "00";

    if (tx?.id && isSuccessful) {
      await supabaseAdmin.rpc("wallet_settle_transaction", {
        p_transaction_id: tx.id,
        p_decision: "success",
        p_source: "paga_webhook",
        p_evidence: payload
      });
    }

    console.log("Webhook processed successfully", {
      referenceNumber,
      state: settled.state,
      transactionId: tx?.id,
    });

    return new Response(JSON.stringify({ received: true, settled: true, state: settled.state }), { status: 200 });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
  }
});