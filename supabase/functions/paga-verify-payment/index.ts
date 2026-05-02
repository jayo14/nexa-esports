import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { settlePagaWalletTransaction } from "../_shared/walletSettlement.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status,
    });

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      return respond({ error: "Payment service not configured: Paga credentials missing" }, 500);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const referenceNumber = String(body.referenceNumber || body.tx_ref || "");
    const pagaData = body.pagaData && typeof body.pagaData === "object" ? (body.pagaData as Record<string, unknown>) : null;

    if (!referenceNumber) {
      return respond({ error: "referenceNumber or tx_ref is required" }, 400);
    }

    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("id, wallet_state, status, reference, wallet_id, amount, user_id")
      .eq("reference", referenceNumber)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!tx) {
      return respond({ status: "processing", message: "Transaction not found yet. Retry shortly.", reference: referenceNumber });
    }

    if (["success", "failed", "reversed", "expired"].includes(String(tx.wallet_state || tx.status))) {
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

    const settled = await settlePagaWalletTransaction({
      transactionId: tx.id,
      reference: referenceNumber,
      providerPayload: pagaData,
      providerRequest: { referenceNumber },
      operationType: "status_check",
      operationKey: `verify:${referenceNumber}:${Date.now()}`,
      source: "verify_endpoint",
      delaySeconds: 0,
    });

    return respond({
      status: settled.state,
      message:
        settled.state === "success"
          ? "Payment settled successfully."
          : settled.state === "failed" || settled.state === "reversed" || settled.state === "expired"
          ? "Payment finalized with non-success status."
          : "Transaction is still processing.",
      reference: settled.reference || referenceNumber,
      newBalance: settled.newBalance,
    });
  } catch (error) {
    console.error("Error in paga-verify-payment:", error);
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
