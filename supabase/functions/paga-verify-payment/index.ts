import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

const respond = (data: any, status = 200, origin = "") => {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    status,
  });
};

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405, origin);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const referenceNumber = String(body.referenceNumber || body.reference || "");

    if (!referenceNumber) {
      return respond({ error: "referenceNumber is required" }, 400, origin);
    }

    const { data: tx, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, wallet_state, wallet_type")
      .or(`reference.eq.${referenceNumber},paga_reference.eq.${referenceNumber}`)
      .maybeSingle();

    if (txError) {
      console.error("Error fetching transaction:", txError);
      return respond({ error: "Internal server error" }, 500, origin);
    }

    if (!tx) {
      return respond({
        status: "processing",
        message: "Transaction not found yet. Retry shortly.",
        reference: referenceNumber
      }, 200, origin);
    }

    const terminalStates = ["success", "completed", "failed", "reversed", "expired"];
    const isTerminal = terminalStates.includes(tx.wallet_state.toLowerCase());

    if (isTerminal) {
      const { data: balanceData } = await supabaseAdmin
        .rpc("get_wallet_available_balance", {
          p_user_id: tx.user_id,
          p_wallet_type: tx.wallet_type || "clan"
        })
        .single();

      return respond({
        status: tx.wallet_state,
        message: tx.wallet_state === "success" ? "Payment settled successfully." : "Payment finalized with non-success status.",
        reference: referenceNumber,
        newBalance: balanceData?.available || 0
      }, 200, origin);
    }

    return respond({
      status: "processing",
      message: "Waiting for confirmation...",
      reference: referenceNumber
    }, 200, origin);

  } catch (error) {
    console.error("Error in paga-verify-payment:", error);
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500, origin);
  }
});
