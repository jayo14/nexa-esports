import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import * as crypto from "https://deno.land/std@0.168.0/node/crypto.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const signature = req.headers.get("x-paystack-signature");
  const body = await req.text();

  if (!PAYSTACK_SECRET_KEY) {
    console.error("Paystack secret key not set");
    return new Response("Paystack secret key not set", { status: 500 });
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const { amount, reference, customer, currency } = event.data;
    const { email } = customer;

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError || !user) {
      console.error("User not found:", userError);
      return new Response("User not found", { status: 404 });
    }

    const { data: existingTransaction, error: existingTransactionError } =
      await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .single();

    if (existingTransaction) {
      return new Response("Transaction already processed", { status: 200 });
    }

    let { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .single();

    if (walletError && walletError.code !== "PGRST116") {
      console.error("Error getting wallet:", walletError);
      return new Response("Error getting wallet", { status: 500 });
    }

    if (!wallet) {
      const { data: newWallet, error: newWalletError } = await supabaseAdmin
        .from("wallets")
        .insert({ user_id: user.id, balance: 0 })
        .select("id, balance")
        .single();

      if (newWalletError) {
        console.error("Error creating wallet:", newWalletError);
        return new Response("Error creating wallet", { status: 500 });
      }
      wallet = newWallet;
    }

    // amount is in kobo from Paystack; convert to naira
    const amountNaira = Number(amount) / 100;
    const fee = Number((amountNaira * 0.04).toFixed(2)); // 4% fee
    const netAmount = Number((amountNaira - fee).toFixed(2));

    const newBalance = Number((Number(wallet.balance) + netAmount).toFixed(2));

    // Update wallet and create transaction for the net deposit
    const { data: transactionId, error: transactionError } = await supabaseAdmin.rpc(
      "update_wallet_and_create_transaction",
      {
        p_wallet_id: wallet.id,
        p_new_balance: newBalance,
        p_transaction_amount: netAmount,
        p_transaction_type: "deposit",
        p_transaction_status: "success",
        p_transaction_reference: reference,
      }
    );

    if (transactionError) {
      console.error("Error processing transaction (RPC):", transactionError);
      return new Response(JSON.stringify({ error: 'failed_update_wallet', details: transactionError.message || transactionError }), { status: 500 });
    }

    // Log the fee as earnings (platform revenue)
    try {
      const txId = transactionId || null;
      const { error: feeError } = await supabaseAdmin
        .from('earnings')
        .insert({ transaction_id: txId, amount: fee, source: 'deposit_fee' });

      if (feeError) {
        console.error('Error logging deposit fee to earnings:', feeError);
        // don't fail the webhook for logging issues
      }
    } catch (err) {
      console.error('Unexpected error logging fee:', err);
    }

    return new Response(JSON.stringify({ success: true, credited: netAmount, fee }), { status: 200 });
  }

  return new Response("Event not handled", { status: 200 });
});
