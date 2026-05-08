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

function unwrapPagaPayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | undefined {
  if (!payload) return undefined;

  const candidates: unknown[] = [
    payload,
    payload.data,
    payload.result,
    payload.response,
    payload.transaction,
    payload.transactions,
    payload.history,
    payload.records,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      const match = candidate.find((item) => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        const ref = extractReference(row);
        return !ref || ref === extractReference(payload);
      });
      if (match && typeof match === "object") return match as Record<string, unknown>;
    }

    if (candidate && typeof candidate === "object") {
      return candidate as Record<string, unknown>;
    }
  }

  return payload;
}

function collectPagaSignals(value: unknown, signals: string[] = [], depth = 0): string[] {
  if (depth > 4 || value == null) return signals;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    signals.push(String(value).toUpperCase());
    return signals;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPagaSignals(item, signals, depth + 1);
    }
    return signals;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectPagaSignals(item, signals, depth + 1);
    }
  }

  return signals;
}

export function mapPagaProviderState(payload: Record<string, unknown> | null | undefined): PagaProviderState {
  const record = unwrapPagaPayload(payload);
  if (!record) return "processing";

  const responseCode = record.responseCode ?? record.statusCode;
  const normalizedValues = collectPagaSignals({
    status: record.status,
    event: record.event,         // "PAYMENT_COMPLETE" — Paga Collect callback event
    state: record.state,         // "CONSUMED" — Paga Collect state for a fulfilled payment
    transactionStatus: record.transactionStatus,
    responseMessage: record.responseMessage,
    message: record.message,
    responseCode: record.responseCode,
    statusCode: record.statusCode,
    paymentDetails: record.paymentDetails,
    data: record.data,
    result: record.result,
    response: record.response,
  });

  if (responseCode === 0 || responseCode === "0" || responseCode === "00" || responseCode === "000") {
    return "success";
  }

  const successSignals = [
    "SUCCESS",
    "SUCCESSFUL",
    "COMPLETED",
    "COMPLETION",
    "CONSUMED",           // Paga Collect: state value when a payment is fully fulfilled
    "PAYMENT_COMPLETE",   // Paga Collect: event value in the payment request callback
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

  if (!PAGA_PUBLIC_KEY || !PAGA_API_PASSWORD || !PAGA_HASH_KEY) {
    return { state: "processing" };
  }

  const PAGA_COLLECT_BASE = Deno.env.get("PAGA_IS_SANDBOX") === "true"
    ? "https://beta-collect.paga.com"
    : "https://collect.paga.com";

  const collectHash = await generatePagaBusinessHash([reference], PAGA_HASH_KEY);
  try {
    const res = await fetch(`${PAGA_COLLECT_BASE}/status`, {
      method: "POST",
      headers: {
        ...pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, collectHash),
        "Authorization": `Basic ${btoa(`${PAGA_PUBLIC_KEY}:${PAGA_API_PASSWORD}`)}`,
      },
      body: JSON.stringify({ referenceNumber: reference }),
    });
    const text = await res.text();
    const payload = JSON.parse(text) as Record<string, unknown>;
    const state = mapPagaProviderState(payload);
    if (state !== "processing") return { state, raw: payload };
  } catch (e) {
    console.error("Paga Collect status check failed", e);
  }

  const PAGA_BASE_URL = Deno.env.get("PAGA_IS_SANDBOX") === "true"
    ? "https://beta.mypaga.com/paga-webservices/business-rest/secured"
    : "https://www.mypaga.com/paga-webservices/business-rest/secured";

  const endpoints = [
    "transactionHistory",
    "transactionStatus",
  ];

  const requestBodies = [
    { referenceNumber: reference },
    { reference },
    { transactionReference: reference },
    { paymentReference: reference },
  ];

  for (const endpoint of endpoints) {
    for (const body of requestBodies) {
      try {
        const hash = await generatePagaBusinessHash([reference], PAGA_HASH_KEY);
        const response = await fetch(`${PAGA_BASE_URL}/${endpoint}`, {
          method: "POST",
          headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
          body: JSON.stringify(body),
        });

        const text = await response.text();
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(text) as Record<string, unknown>;
        } catch {
          continue;
        }

        const state = mapPagaProviderState(payload);
        if (state !== "processing") {
          return { state, raw: payload };
        }
      } catch (error) {
        console.error("Paga status lookup failed", { reference, endpoint, body, error });
      }
    }
  }

  return { state: "processing" };
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

  const isSandbox = Deno.env.get("PAGA_IS_SANDBOX") === "true";
  if (isSandbox && (input as any).mockSuccess === true) {
    providerState = "success";
    providerRaw = { ...(providerRaw || {}), mock: true, note: "Forced success in sandbox" };
  }

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