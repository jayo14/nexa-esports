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

    const referenceNumber = String(payload.referenceNumber || payload.externalReferenceNumber || payload.transactionId || payload.paymentReference || "");
    if (!referenceNumber) {
      console.error("No reference number found in payload:", payload);
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
    }

    const amount = payload.amount ? Number(payload.amount).toFixed(2) : "";
    const statusCode = String(payload.statusCode || payload.responseCode || "");

    const receivedHash = req.headers.get("hash") || req.headers.get("x-paga-hash") || String(payload.hash || "");
    const hashParamsHeader = req.headers.get("x-paga-hash-parameters");
    const IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

    let signatureValid = false;
    if (IS_SANDBOX && !receivedHash) {
      signatureValid = true;
    } else if (receivedHash) {
      // If x-paga-hash-parameters is present, use it to determine the order
      if (hashParamsHeader) {
        const paramKeys = hashParamsHeader.split(",").map(k => k.trim());
        const hashParts = paramKeys.map(key => {
          if (key === "hashKey") return PAGA_HASH_KEY;
          return String(payload[key] || "");
        });
        // If hashKey wasn't in the header list (some docs say it should be, some don't), append it
        if (!paramKeys.includes("hashKey")) {
          hashParts.push(PAGA_HASH_KEY);
        }
        const expectedHash = await generateSHA512Hash(hashParts);
        if (receivedHash.toLowerCase() === expectedHash.toLowerCase()) {
          signatureValid = true;
        }
      }
      
      // Fallback/Alternative variants if header-based failed or missing
      if (!signatureValid) {
        const variants = [
          [referenceNumber, amount, statusCode],
          [referenceNumber, amount],
          [referenceNumber],
          [payload.transactionReference || referenceNumber, payload.accountNumber || "", payload.amount || "", PAGA_HASH_KEY],
        ];

        for (const variant of variants) {
          const expectedHash = variant.includes(PAGA_HASH_KEY) 
            ? await generateSHA512Hash(variant)
            : await generatePagaBusinessHash(variant, PAGA_HASH_KEY);
            
          if (receivedHash.toLowerCase() === expectedHash.toLowerCase()) {
            signatureValid = true;
            break;
          }
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
