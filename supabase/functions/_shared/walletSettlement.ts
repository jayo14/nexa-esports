import { supabaseAdmin } from "./supabaseAdmin.ts";
import { generatePagaBusinessHash, pagaHeaders } from "./pagaAuth.ts";

export type PagaProviderState = "success" | "failed" | "processing";
export type PagaSettlementOperationType = "initiate" | "transfer_request" | "status_check" | "webhook_event";

type TransactionRow = {
  id: string;
  wallet_id: string | null;
  wallet_state: string | null;
  status: string | null;
  reference: string | null;
  paga_reference: string | null;
};

async function getWalletBalance(walletId: string | null): Promise<number | null> {
  if (!walletId) return null;

  const { data: wallet, error } = await supabaseAdmin
    .from("wallets")
    .select("balance")
    .eq("id", walletId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return wallet?.balance ?? null;
}

export type PagaSettlementInput = {
  transactionId?: string | null;
  reference?: string | null;
  providerPayload?: Record<string, unknown> | null;
  providerRequest?: Record<string, unknown> | null;
  operationType: PagaSettlementOperationType;
  operationKey: string;
  source: string;
  providerStatusCode?: string | null;
  signatureValid?: boolean | null;
  delaySeconds?: number;
  checkRemote?: boolean;
};

export type PagaSettlementResult = {
  ok: boolean;
  state: string;
  reference: string | null;
  transactionId: string | null;
  newBalance: number | null;
  settlementResult: Record<string, unknown> | null;
  providerState: PagaProviderState;
};

function extractReference(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload) return null;
  const direct = payload.referenceNumber || payload.reference || payload.tx_ref || payload.transaction_id;
  return direct ? String(direct) : null;
}

export function mapPagaProviderState(payload: Record<string, unknown> | null | undefined): PagaProviderState {
  if (!payload) return "processing";

  const responseCode = payload.responseCode ?? payload.statusCode;
  const statusText = String(
    payload.transactionStatus || payload.status || payload.responseMessage || payload.message || ""
  ).toUpperCase();
  const normalizedValues = [statusText, String(payload.statusCode || "").toUpperCase(), String(payload.responseCode || "").toUpperCase()];

  if (responseCode === 0 || responseCode === "0" || responseCode === "00" || responseCode === "000") {
    return "success";
  }

  const successSignals = [
    "SUCCESS",
    "SUCCESSFUL",
    "COMPLETED",
    "COMPLETION",
    "APPROVED",
    "PAID",
    "SETTLED",
    "ACCEPTED",
    "ACCEPTED FOR PROCESSING",
    "DONE",
  ];
  if (normalizedValues.some((value) => successSignals.some((signal) => value.includes(signal)))) {
    return "success";
  }

  const failedSignals = ["FAILED", "FAIL", "ERROR", "DECLINED", "REJECT", "REVERSED", "CANCEL", "ABORT"];
  if (normalizedValues.some((value) => failedSignals.some((signal) => value.includes(signal)))) {
    return "failed";
  }

  return "processing";
}

async function queryPagaStatus(reference: string): Promise<{ state: PagaProviderState; raw?: Record<string, unknown> }> {
  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_BASE_URL = Deno.env.get("PAGA_IS_SANDBOX") === "true"
    ? "https://beta.mypaga.com/paga-webservices/business-rest/secured"
    : "https://www.mypaga.com/paga-webservices/business-rest/secured";

  if (!PAGA_PUBLIC_KEY || !PAGA_API_PASSWORD || !PAGA_HASH_KEY) {
    return { state: "processing" };
  }

  try {
    const hash = await generatePagaBusinessHash([reference], PAGA_HASH_KEY);
    const response = await fetch(`${PAGA_BASE_URL}/transactionStatus`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
      body: JSON.stringify({ referenceNumber: reference }),
    });

    const text = await response.text();
    try {
      const payload = JSON.parse(text) as Record<string, unknown>;
      return { state: mapPagaProviderState(payload), raw: payload };
    } catch {
      return { state: "processing" };
    }
  } catch (error) {
    console.error("Paga status lookup failed", { reference, error });
    return { state: "processing" };
  }
}

export async function settlePagaWalletTransaction(input: PagaSettlementInput): Promise<PagaSettlementResult> {
  const referenceFromPayload = extractReference(input.providerPayload);
  const resolvedReference = input.reference || referenceFromPayload || null;

  let transaction: TransactionRow | null = null;
  if (input.transactionId) {
    const { data } = await supabaseAdmin
      .from("transactions")
      .select("id, wallet_id, wallet_state, status, reference, paga_reference")
      .eq("id", input.transactionId)
      .maybeSingle();
    transaction = data as TransactionRow | null;
  } else if (resolvedReference) {
    const { data } = await supabaseAdmin
      .from("transactions")
      .select("id, wallet_id, wallet_state, status, reference, paga_reference")
      .or(`reference.eq.${resolvedReference},paga_reference.eq.${resolvedReference}`)
      .maybeSingle();
    transaction = data as TransactionRow | null;
  }

  const providerSnapshot = input.providerPayload
    ? { state: mapPagaProviderState(input.providerPayload), raw: input.providerPayload }
    : null;

  let providerState = providerSnapshot?.state ?? "processing";
  let providerRaw = providerSnapshot?.raw;

  if (input.checkRemote !== false && resolvedReference && providerState === "processing") {
    const remote = await queryPagaStatus(resolvedReference);
    providerState = remote.state;
    providerRaw = remote.raw ?? providerRaw;
  }

  const transactionId = transaction?.id || input.transactionId || null;
  const reference = transaction?.reference || transaction?.paga_reference || resolvedReference;
  const finalDecision = providerState;

  if (transactionId) {
    await supabaseAdmin.rpc("wallet_record_provider_operation", {
      p_transaction_id: transactionId,
      p_operation_type: input.operationType,
      p_operation_key: input.operationKey,
      p_provider_request: input.providerRequest ?? null,
      p_provider_response: providerRaw ?? input.providerPayload ?? {},
      p_provider_status_code: input.providerStatusCode || String((providerRaw as Record<string, unknown> | undefined)?.responseCode ?? ""),
      p_signature_valid: input.signatureValid ?? null,
    });
  }

  let directSettlementResult: Record<string, unknown> | null = null;
  if (transactionId && finalDecision !== "processing") {
    const { data, error } = await supabaseAdmin.rpc("wallet_settle_transaction", {
      p_transaction_id: transactionId,
      p_decision: finalDecision,
      p_source: input.source,
      p_evidence: {
        source: input.source,
        provider: providerRaw ?? input.providerPayload ?? {},
      },
    });

    if (error) {
      console.error("Direct settlement call failed", {
        transactionId,
        reference,
        decision: finalDecision,
        error,
      });
    } else {
      directSettlementResult = (data as Record<string, unknown> | null) ?? null;
    }
  }

  await supabaseAdmin.rpc("wallet_enqueue_settlement", {
    p_transaction_id: transactionId,
    p_provider_reference: reference,
    p_decision_hint: finalDecision,
    p_evidence: {
      source: input.source,
      provider: providerRaw ?? input.providerPayload ?? {},
    },
    p_source: input.source,
    p_delay_seconds: input.delaySeconds ?? 0,
  });

  const settlement = await supabaseAdmin.rpc("wallet_process_settlement_jobs", { p_limit: 5 });

  let refreshedTransaction: TransactionRow | null = transaction;
  if (transactionId) {
    const { data } = await supabaseAdmin
      .from("transactions")
      .select("id, wallet_id, wallet_state, status, reference, paga_reference")
      .eq("id", transactionId)
      .maybeSingle();
    refreshedTransaction = data as TransactionRow | null;
  }

  const newBalance = await getWalletBalance(refreshedTransaction?.wallet_id ?? transaction?.wallet_id ?? null);

  const settledState = refreshedTransaction?.wallet_state || refreshedTransaction?.status || finalDecision;

  return {
    ok: true,
    state: settledState || "processing",
    reference,
    transactionId: refreshedTransaction?.id || transactionId,
    newBalance,
    settlementResult: directSettlementResult ?? (settlement.data as Record<string, unknown> | null) ?? null,
    providerState,
  };
}
