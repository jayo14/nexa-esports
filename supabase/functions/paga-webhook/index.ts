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

  const processingSignals = ["PENDING", "PROCESS", "IN_PROGRESS", "QUEUED", "ACCEPTED", "INITIATED"];
  if (processingSignals.some((signal) => statusText.includes(signal))) return "processing";

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

  const body = await req.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  console.log("Paga webhook received:", JSON.stringify(event));

  const referenceNumber = String(event.referenceNumber || event.transactionId || "");
  const amount = event.amount ? Number(event.amount).toFixed(2) : "";
  const statusCode = String(event.statusCode || event.responseCode || "");

  const expectedHash = await generatePagaBusinessHash([referenceNumber, amount, statusCode], PAGA_HASH_KEY);
  const receivedHash = req.headers.get("hash") || req.headers.get("x-paga-hash") || String(event.hash || "");

  const IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  if (!IS_SANDBOX || receivedHash) {
    if (!receivedHash || receivedHash !== expectedHash) {
      console.error("Invalid or missing webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  if (!referenceNumber) {
    return new Response("Missing reference", { status: 400 });
  }

  const providerState = mapProviderState(event);

  const { data: tx } = await supabaseAdmin
    .from("transactions")
    .select("id, status, type, amount, user_id, metadata")
    .eq("reference", referenceNumber)
    .maybeSingle();

  const txType = tx?.type || (referenceNumber.startsWith("NX_WD") ? "withdrawal" : "deposit");

  await supabaseAdmin
    .from("transactions")
    .update({
      paga_reference: referenceNumber,
      paga_status: providerState,
      paga_raw_response: event,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", referenceNumber);

  if (providerState === "processing") {
    await supabaseAdmin
      .from("transactions")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("reference", referenceNumber)
      .in("status", ["pending", "processing"]);

    return new Response(JSON.stringify({ received: true, state: "processing" }), { status: 200 });
  }

  if (txType === "withdrawal") {
    if (providerState === "success") {
      await supabaseAdmin.rpc("finalize_wallet_debit", {
        p_reference: referenceNumber,
        p_metadata: { paga_webhook: event },
      });
      await supabaseAdmin
        .from("transactions")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("reference", referenceNumber)
        .in("status", ["pending", "processing"]);

      return new Response(JSON.stringify({ received: true, state: "success" }), { status: 200 });
    }

    const { data: rolledBack } = await supabaseAdmin.rpc("rollback_wallet_debit", {
      p_reference: referenceNumber,
    });

    if (!rolledBack) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "reversed", updated_at: new Date().toISOString() })
        .eq("reference", referenceNumber)
        .neq("status", "success");
    }

    return new Response(JSON.stringify({ received: true, state: "failed" }), { status: 200 });
  }

  if (providerState === "failed") {
    await supabaseAdmin
      .from("transactions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("reference", referenceNumber)
      .in("status", ["pending", "processing"]);

    return new Response(JSON.stringify({ received: true, state: "failed" }), { status: 200 });
  }

  if (tx?.status === "success") {
    return new Response(JSON.stringify({ received: true, state: "success", idempotent: true }), { status: 200 });
  }

  const userId = tx?.user_id || (tx?.metadata as Record<string, unknown> | null)?.userId;
  const walletType = (tx?.metadata as Record<string, unknown> | null)?.walletType || "clan";
  const txAmount = Number(amount) || Number(tx?.amount || 0);

  if (!userId || !txAmount) {
    console.error("Cannot reconcile deposit webhook", { referenceNumber, userId, txAmount });
    return new Response(JSON.stringify({ received: true, state: "processing" }), { status: 200 });
  }

  const { error: creditError } = await supabaseAdmin.rpc("credit_wallet", {
    p_user_id: userId,
    p_amount: txAmount,
    p_reference: referenceNumber,
    p_currency: "NGN",
    p_wallet_type: walletType,
  });

  if (creditError) {
    console.error("Error crediting deposit from webhook:", creditError);
    return new Response(JSON.stringify({ received: true, state: "processing" }), { status: 200 });
  }

  await supabaseAdmin
    .from("transactions")
    .update({ status: "success", updated_at: new Date().toISOString() })
    .eq("reference", referenceNumber);

  return new Response(JSON.stringify({ received: true, state: "success" }), { status: 200 });
});
