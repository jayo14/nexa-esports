function mapProviderState(payload: Record<string, unknown>): ProviderState {
  const responseCode = payload.responseCode ?? payload.statusCode;
  const statusText = String(
    payload.transactionStatus || payload.status || payload.responseMessage || payload.message || ""
  ).toUpperCase();

  if (responseCode === 0 || responseCode === "0" || responseCode === "SUCCESS") return "success";
  if (statusText.includes("SUCCESS") || statusText === "COMPLETED" || statusText === "APPROVED") return "success";

  const failedSignals = ["FAILED", "FAIL", "ERROR", "DECLINED", "REJECT", "REVERSED", "CANCEL"];
  if (failedSignals.some((signal) => statusText.includes(signal))) return "failed";

  return "processing";
}
