import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { generatePagaBusinessHash } from "../_shared/pagaAuth.ts";

serve(async (req) => {
  // Paga webhooks are POST requests with JSON body
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
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  console.log("Paga webhook received:", JSON.stringify(event));

  // Validate webhook signature using HMAC-SHA-512
  // Paga signs webhooks with: hash(referenceNumber + amount + statusCode + hashKey)
  const referenceNumber = event.referenceNumber || event.transactionId || "";
  const amount = event.amount ? Number(event.amount).toFixed(2) : "";
  const statusCode = String(event.statusCode || event.responseCode || "");

  const expectedHash = await generatePagaBusinessHash(
    [referenceNumber, amount, statusCode],
    PAGA_HASH_KEY
  );

  const receivedHash =
    req.headers.get("hash") ||
    req.headers.get("x-paga-hash") ||
    event.hash ||
    "";

  // Only enforce signature check when a hash header is present
  if (receivedHash && receivedHash !== expectedHash) {
    console.error("Invalid webhook signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const isSuccess =
    event.statusCode === "0" ||
    event.statusCode === 0 ||
    event.responseCode === 0 ||
    event.responseCode === "0" ||
    event.status === "SUCCESS" ||
    event.transactionStatus === "SUCCESS";

  if (!isSuccess) {
    console.log("Non-success webhook, status:", event.statusCode || event.status);

    // Mark any pending transaction as failed
    if (referenceNumber) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "failed" })
        .eq("reference", referenceNumber)
        .eq("status", "pending");
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Idempotency: check if already processed
  const { data: existingTx } = await supabaseAdmin
    .from("transactions")
    .select("id, status, user_id, amount")
    .eq("reference", referenceNumber)
    .maybeSingle();

  if (existingTx && existingTx.status === "success") {
    console.log("Transaction already processed:", referenceNumber);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  let userId = existingTx?.user_id || event.metadata?.userId;
  const txAmount = Number(amount) || existingTx?.amount;

  // Fallback: try to find user by email
  if (!userId && event.email) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", event.email)
      .maybeSingle();
    if (profile) userId = profile.id;
  }

  if (!userId) {
    console.error("User not found for webhook:", { referenceNumber, email: event.email });
    return new Response("User not found", { status: 404 });
  }

  // Get or create wallet
  let { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .single();

  if (walletError?.code === "PGRST116") {
    const { data: newWallet, error: newWalletError } = await supabaseAdmin
      .from("wallets")
      .insert({ user_id: userId, balance: 0 })
      .select("id, balance")
      .single();
    if (newWalletError) {
      console.error("Error creating wallet:", newWalletError);
      return new Response("Error creating wallet", { status: 500 });
    }
    wallet = newWallet;
  } else if (walletError) {
    console.error("Error getting wallet:", walletError);
    return new Response("Error getting wallet", { status: 500 });
  }

  // 4% platform fee
  const fee = Number((txAmount * 0.04).toFixed(2));
  const netAmount = Number((txAmount - fee).toFixed(2));
  const newBalance = Number((Number(wallet!.balance) + netAmount).toFixed(2));

  // Update wallet and create transaction atomically
  const { data: transactionId, error: transactionError } = await supabaseAdmin.rpc(
    "update_wallet_and_create_transaction",
    {
      p_wallet_id: wallet!.id,
      p_new_balance: newBalance,
      p_transaction_amount: netAmount,
      p_transaction_type: "deposit",
      p_transaction_status: "success",
      p_transaction_reference: referenceNumber,
    }
  );

  if (transactionError) {
    console.error("Error processing webhook transaction:", transactionError);
    return new Response(JSON.stringify({ error: "Failed to process transaction" }), { status: 500 });
  }

  // Log platform fee as earnings
  try {
    await supabaseAdmin
      .from("earnings")
      .insert({ transaction_id: transactionId || null, amount: fee, source: "deposit_fee" });
  } catch (err) {
    console.error("Error logging deposit fee:", err);
  }

  console.log("Webhook processed successfully:", { referenceNumber, userId, netAmount, newBalance });
  return new Response(JSON.stringify({ success: true, credited: netAmount, fee }), { status: 200 });
});
