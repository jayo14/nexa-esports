import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const WORKER_TOKEN = Deno.env.get("WALLET_SETTLEMENT_WORKER_TOKEN")?.trim();
  const authHeader = req.headers.get("Authorization") || "";

  if (!WORKER_TOKEN || authHeader !== `Bearer ${WORKER_TOKEN}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let batchSize = 25;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.batchSize && Number.isFinite(Number(body.batchSize))) {
      batchSize = Math.max(1, Math.min(100, Number(body.batchSize)));
    }
  } catch {
    // use default
  }

  await supabaseAdmin.rpc("wallet_enqueue_expired_transactions", { p_limit: 100 });

  const { data, error } = await supabaseAdmin.rpc("wallet_process_settlement_jobs", {
    p_limit: batchSize,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }

  return new Response(JSON.stringify({ ok: true, result: data }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
