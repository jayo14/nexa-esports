import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAGA_PUBLIC_KEY = Deno.env.get("PAGA_PUBLIC_KEY")?.trim();
  const PAGA_API_PASSWORD = Deno.env.get("PAGA_API_PASSWORD")?.trim() || Deno.env.get("PAGA_SECRET_KEY")?.trim();
  const PAGA_HASH_KEY = Deno.env.get("PAGA_HASH_KEY")?.trim();
  const PAGA_IS_SANDBOX = Deno.env.get("PAGA_IS_SANDBOX") === "true";

  const PAGA_BASE_URL = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  try {
    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Transfer service not configured: Paga credentials missing" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { endpoint, account_bank, account_number, amount, narration, beneficiary_name } = await req.json();

    // Check withdrawal availability
    if (endpoint === "check-withdrawal-availability") {
      const { data: withdrawalSetting } = await supabaseAdmin
        .from("clan_settings")
        .select("value")
        .eq("key", "withdrawals_enabled")
        .maybeSingle();

      const globalAllowed = withdrawalSetting ? withdrawalSetting.value !== false : true;

      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("id, timezone, country")
        .eq("id", user.id)
        .maybeSingle();

      const tzFromProfile = profileData?.timezone;
      const country = (profileData?.country || "").toString();
      const DEFAULT_TZ = Deno.env.get("DEFAULT_USER_TIMEZONE") || "Africa/Lagos";
      const countryTzMap: Record<string, string> = {
        NG: "Africa/Lagos",
        GH: "Africa/Accra",
        KE: "Africa/Nairobi",
        ZA: "Africa/Johannesburg",
        US: "America/New_York",
        GB: "Europe/London",
      };
      const resolvedTz = tzFromProfile || countryTzMap[country.toUpperCase()] || DEFAULT_TZ;

      let weekday = "Unknown";
      try {
        weekday = new Intl.DateTimeFormat("en-US", { timeZone: resolvedTz, weekday: "long" }).format(new Date());
      } catch {
        weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
      }

      const isSunday = weekday === "Sunday";
      const allowed = globalAllowed && !isSunday;

      return new Response(
        JSON.stringify({
          allowed,
          weekday,
          timezone: resolvedTz,
          global_enabled: globalAllowed,
          reason: !globalAllowed
            ? "Withdrawals are currently disabled by the clan master."
            : isSunday
            ? "Withdrawals are not allowed on Sundays."
            : null,
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (endpoint !== "initiate-transfer") {
      return new Response(JSON.stringify({ error: "Unknown endpoint" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // --- Initiate Transfer ---
    console.log(`Initiating Paga transfer for user ${user.id}, amount ${amount}`);

    // Check withdrawals enabled
    const { data: withdrawalSetting } = await supabaseAdmin
      .from("clan_settings")
      .select("value")
      .eq("key", "withdrawals_enabled")
      .maybeSingle();

    if (withdrawalSetting && withdrawalSetting.value === false) {
      return new Response(
        JSON.stringify({ error: "withdrawals_disabled", message: "Withdrawals are currently disabled by the clan master." }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check day-of-week restriction
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("id, timezone, country")
      .eq("id", user.id)
      .maybeSingle();

    const tzFromProfile = profileData?.timezone;
    const country = (profileData?.country || "").toString();
    const DEFAULT_TZ = Deno.env.get("DEFAULT_USER_TIMEZONE") || "Africa/Lagos";
    const countryTzMap: Record<string, string> = {
      NG: "Africa/Lagos",
      GH: "Africa/Accra",
      KE: "Africa/Nairobi",
      ZA: "Africa/Johannesburg",
      US: "America/New_York",
      GB: "Europe/London",
    };
    const resolvedTz = tzFromProfile || countryTzMap[country.toUpperCase()] || DEFAULT_TZ;

    let weekday = "Unknown";
    try {
      weekday = new Intl.DateTimeFormat("en-US", { timeZone: resolvedTz, weekday: "long" }).format(new Date());
    } catch {
      weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    }

    if (weekday === "Sunday") {
      return new Response(
        JSON.stringify({ error: "withdrawals_disabled_today", message: "Withdrawals are not allowed on Sundays in your region." }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Validate amount
    if (!amount || amount < 500) {
      return new Response(JSON.stringify({ error: "Minimum withdrawal amount is ₦500" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (amount > 30000) {
      return new Response(JSON.stringify({ error: "Maximum withdrawal amount is ₦30,000" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const fee = Number((amount * 0.04).toFixed(2));
    const netAmount = Number((amount - fee).toFixed(2));

    // Verify wallet balance
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("id, balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      return new Response(JSON.stringify({ error: "Wallet not found" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (Number(wallet.balance) < amount) {
      return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const referenceNumber = generateReferenceNumber("NX_WD");
    const newBalance = Number((Number(wallet.balance) - amount).toFixed(2));

    // Deduct wallet balance first (safe deduction)
    const { error: deductError } = await supabaseAdmin
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id)
      .eq("user_id", user.id);

    if (deductError) {
      console.error("Error deducting wallet balance:", deductError);
      return new Response(JSON.stringify({ error: "Failed to process withdrawal" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Log transaction as pending
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "withdrawal",
      status: "pending",
      amount,
      reference: referenceNumber,
      metadata: { fee, netAmount, account_number, account_bank, beneficiary_name },
    });

    // According to Paga Business API documentation for depositToBank, the hash order is:
    // referenceNumber + amount + currency + destinationBankUUID + destinationBankAccountNumber + recipientPhoneNumber + salt
    const hashAmount = String(amount);
    
    // Paga is notoriously inconsistent with hash parameter ordering.
    // We try a few common variations if the first one fails with "Invalid request hash".
    const hashVariants = [
      [referenceNumber, hashAmount, account_bank || "", account_number || "", ""], // Standard
      [referenceNumber, hashAmount, "NGN", account_bank || "", account_number || "", ""], // With Currency
      [referenceNumber, hashAmount, account_bank || "", account_number || "", "", referenceNumber], // With TransferReference
    ];

    let pagaResponse: Response | null = null;
    let pagaData: any = null;

    for (let i = 0; i < hashVariants.length; i++) {
        const fields = hashVariants[i];
        console.log(`Attempting Paga transfer with hash variant ${i + 1}...`);
        const hash = await generatePagaBusinessHash(fields, PAGA_HASH_KEY);

        const pagaPayload = {
            referenceNumber,
            amount: Number(amount),
            currency: "NGN",
            destinationBankUUID: account_bank,
            destinationBankAccountNumber: account_number,
            transferReference: referenceNumber,
            senderPrincipal: PAGA_PUBLIC_KEY,
            remarks: narration || "Wallet withdrawal",
            recipientPhoneNumber: "",
            statusCallbackUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paga-webhook`,
        };

        pagaResponse = await fetch(`${PAGA_BASE_URL}/depositToBank`, {
            method: "POST",
            headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
            body: JSON.stringify(pagaPayload),
        });

        const responseText = await pagaResponse.text();
        try {
            pagaData = JSON.parse(responseText);
        } catch {
            pagaData = { error: "Invalid JSON", raw: responseText };
        }

        // If it's not a hash error, or it's a success, we stop here.
        const isHashError = pagaData.details?.errorMessage?.toLowerCase().includes("invalid request hash") || 
                           String(pagaData.errorMessage || "").toLowerCase().includes("invalid request hash") ||
                           String(pagaData.responseMessage || "").toLowerCase().includes("invalid request hash");
        
        if (!isHashError) {
            break;
        }
        
        console.warn(`Hash variant ${i + 1} failed with Invalid Request Hash. Trying next...`);
    }

    if (!pagaResponse || !pagaData) {
        // Rollback wallet balance
        await supabaseAdmin.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
        await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("reference", referenceNumber);
        return new Response(
            JSON.stringify({ error: "Failed to communicate with transfer provider" }),
            { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
        );
    }

    console.log("Paga depositToBank response:", JSON.stringify(pagaData));

    const isSuccess =
      pagaData.responseCode === 0 ||
      pagaData.responseCode === "0" ||
      pagaData.status === "SUCCESS";

    if (!isSuccess) {
      // Rollback wallet balance on failure
      await supabaseAdmin.from("wallets").update({ balance: wallet.balance }).eq("id", wallet.id);
      await supabaseAdmin
        .from("transactions")
        .update({ status: "failed", metadata: { ...pagaData } })
        .eq("reference", referenceNumber);

      return new Response(
        JSON.stringify({
          error: pagaData.responseMessage || "Transfer failed",
          details: pagaData,
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Mark transaction as success and log fee
    await supabaseAdmin
      .from("transactions")
      .update({ status: "success", metadata: { fee, netAmount, account_number, account_bank, paga_response: pagaData } })
      .eq("reference", referenceNumber);

    try {
      await supabaseAdmin.from("earnings").insert({ amount: fee, source: "withdrawal_fee" });
    } catch (err) {
      console.error("Error logging withdrawal fee:", err);
    }

    return new Response(
      JSON.stringify({ status: true, message: "Withdrawal successful", referenceNumber, netAmount }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in paga-transfer:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
