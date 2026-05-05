import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { mapPagaProviderState, settlePagaWalletTransaction } from "../_shared/walletSettlement.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status,
    });

  try {
    const body = await req.json().catch(() => ({}));
    const referenceNumber = String(body.referenceNumber || body.tx_ref || "");

    if (!referenceNumber) {
      return respond({ error: "referenceNumber or tx_ref is required" }, 400);
    }

    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("id, type, wallet_state, status, reference, wallet_id, amount, user_id, metadata")
      .eq("reference", referenceNumber)
      .maybeSingle();

    if (!tx) {
      return respond({ status: "processing", message: "Transaction not found yet. Retry shortly.", reference: referenceNumber });
    }

    if (["success", "completed", "failed", "reversed", "expired"].includes(String(tx.wallet_state || tx.status))) {
      let walletBalance: number | null = null;
      if (tx.wallet_id) {
        const { data: wallet } = await supabaseAdmin.from("wallets").select("balance").eq("id", tx.wallet_id).maybeSingle();
        walletBalance = wallet?.balance ?? null;
      }

      return respond({
        status: tx.wallet_state || tx.status,
        message: "Transaction already finalized",
        reference: referenceNumber,
        newBalance: walletBalance,
      });
    }

    const pagaData = body.pagaData && typeof body.pagaData === "object" ? (body.pagaData as Record<string, unknown>) : null;
    const providerState = mapPagaProviderState(pagaData);
    const isSandbox = Deno.env.get("PAGA_IS_SANDBOX") === "true";

    if (tx.type === "deposit") {
      const hasStrongEvidence =
        providerState === "success" ||
        Number((pagaData as Record<string, unknown> | null)?.responseCode) === 0 ||
        body.isSuccessFromCallback === true ||
        (isSandbox && body.forceSuccess === true);

      if (!hasStrongEvidence) {

        return respond({
          status: "processing",
          message: "Waiting for Paga confirmation...",
          reference: referenceNumber,
        });
      }
    }

    const settled = await settlePagaWalletTransaction({
      transactionId: tx.id,
      reference: referenceNumber,
      providerPayload: pagaData,
      providerRequest: { referenceNumber },
      operationType: "status_check",
      operationKey: `verify:${referenceNumber}:${Date.now()}`,
      source: "verify_endpoint",
      delaySeconds: 0,
      checkRemote: providerState === "processing" ? undefined : false,
      mockSuccess: isSandbox && body.forceSuccess === true,
    } as any);


    // Explicitly trigger settlement if provider reports success
    if (tx.id && (settled.state === "success" || settled.providerState === "success")) {
      await supabaseAdmin.rpc("wallet_settle_transaction", {
        p_transaction_id: tx.id,
        p_decision: "success",
        p_source: "paga_verify",
        p_evidence: pagaData
      });
    }

    const settledRecord = settled as Record<string, unknown>;
    const settledState = String(settledRecord.state || "processing");
    const settledBalance =
      typeof settledRecord.new_balance === "number"
        ? settledRecord.new_balance
        : typeof settledRecord.newBalance === "number"
        ? settledRecord.newBalance
        : null;

    return respond({
      status: settledState,
      message:
        settledState === "success"
          ? "Payment settled successfully."
          : ["failed", "reversed", "expired"].includes(settledState)
          ? "Payment finalized with non-success status."
          : "Transaction is still processing.",
      reference: String(settledRecord.reference || referenceNumber),
      newBalance: settledBalance,
    });
  } catch (error) {
    console.error("Error in paga-verify-payment:", error);
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
