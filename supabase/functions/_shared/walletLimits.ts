import { supabaseAdmin } from "./supabaseAdmin.ts";

const DEFAULT_MIN_DEPOSIT_AMOUNT = 500;
const DEFAULT_MIN_WITHDRAWAL_AMOUNT = 500;

function parseAmount(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getWalletMinimums(): Promise<{
  minDepositAmount: number;
  minWithdrawalAmount: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, value")
    .in("key", ["min_deposit_amount", "min_withdrawal_amount"]);

  if (error) {
    throw error;
  }

  const settings = new Map((data ?? []).map((row) => [row.key, row.value]));

  return {
    minDepositAmount: parseAmount(settings.get("min_deposit_amount"), DEFAULT_MIN_DEPOSIT_AMOUNT),
    minWithdrawalAmount: parseAmount(settings.get("min_withdrawal_amount"), DEFAULT_MIN_WITHDRAWAL_AMOUNT),
  };
}
