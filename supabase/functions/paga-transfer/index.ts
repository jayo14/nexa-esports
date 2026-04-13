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
      .select("id, timezone, country, phone")
      .eq("id", user.id)
      .maybeSingle();

    const phoneNumber = profileData?.phone || "";
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

    const referenceNumber = generateReferenceNumber("NX_WD");
    const fee = Number((amount * 0.04).toFixed(2));
    const expectedNetAmount = Number((amount - fee).toFixed(2));

    // ── Atomic debit: reserves funds and pre-logs transaction ──────────
    // Using the debit_wallet RPC prevents race conditions and ensures
    // the transaction record has wallet_id set from the start.
    const { data: debitResult, error: debitError } = await supabaseAdmin.rpc(
      "debit_wallet",
      {
        p_user_id:   user.id,
        p_amount:    amount,
        p_reference: referenceNumber,
        p_currency:  "NGN",
        p_metadata:  { fee, netAmount: expectedNetAmount, account_number, account_bank, beneficiary_name },
      }
    );

    if (debitError || !debitResult?.success) {
      const errMsg = debitResult?.error || debitError?.message || "Failed to process withdrawal";
      if (errMsg === "insufficient_balance") {
        return new Response(
          JSON.stringify({ status: false, error: "Insufficient wallet balance", message: "Insufficient wallet balance" }),
          { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
        );
      }
      console.error("debit_wallet error:", debitError || debitResult);
      return new Response(
        JSON.stringify({ error: "Failed to process withdrawal" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const newBalance = debitResult.new_balance;
    const netAmount  = Number(debitResult.net_amount ?? expectedNetAmount);

    // Fetch banks to resolve the bank code from the UUID if possible
    // This helps avoid Paga internal errors when only UUID is provided
    let bankCode = "";
    let bankUuid = "";
    let bankName = "";
    let bankSample: any[] | string = "Empty list";
    try {
        const getBanksRef = generateReferenceNumber("GB");
        const getBanksHash = await generatePagaBusinessHash([getBanksRef], PAGA_HASH_KEY);
        const getBanksResponse = await fetch(`${PAGA_BASE_URL}/getBanks`, {
            method: "POST",
            headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, getBanksHash),
            body: JSON.stringify({ referenceNumber: getBanksRef }),
        });
        
        const banksData = await getBanksResponse.json();
        const banksList = banksData.bank || banksData.banks || banksData.data || [];
        bankSample = banksList.length > 0 ? banksList.slice(0, 3) : "Empty list";
        
        const target = String(account_bank || "").trim().toLowerCase();
        const targetNoHyphen = target.replace(/-/g, "");
        const matchedBank = banksList.find((b: any) => {
            const values = [
                b.uuid,
                b.bankUUID,
                b.bankUuid,
                b.id,
                b.code,
                b.bankCode,
                b.destinationBankCode,
                b.interInstitutionCode,
                b.sortCode,
                b.name,
            ]
                .filter(v => typeof v === 'string')
                .map(v => v.toLowerCase().trim());
            const valuesNoHyphen = values.map(v => v.replace(/-/g, ""));
            return values.includes(target) || valuesNoHyphen.includes(targetNoHyphen);
        });

        if (matchedBank) {
            bankCode =
              matchedBank.destinationBankCode ||
              matchedBank.bankCode ||
              matchedBank.code ||
              matchedBank.interInstitutionCode ||
              matchedBank.sortCode ||
              "";
            bankUuid = matchedBank.uuid || matchedBank.bankUUID || matchedBank.bankUuid || "";
            bankName = matchedBank.name || "";
        }
    } catch (e) {
        console.warn("Failed to resolve bank code:", e);
    }

    if (!bankCode && /^\d{3,6}$/.test(String(account_bank || "").trim())) {
      bankCode = String(account_bank).trim();
    }
    if (!bankUuid && /^[0-9a-fA-F-]{36}$/.test(String(account_bank || "").trim())) {
      bankUuid = String(account_bank).trim().toUpperCase();
    }

    const amountNumber = Number(amount);
    const amountFixed = amountNumber.toFixed(2);
    const phoneDigits = (phoneNumber || "").replace(/\D/g, "");
    const phoneLocal = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "7000000000";
    const phoneIntl = phoneDigits.startsWith("234")
      ? phoneDigits
      : phoneDigits.length === 11 && phoneDigits.startsWith("0")
      ? `234${phoneDigits.slice(1)}`
      : `234${phoneLocal}`;
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/paga-webhook`;
    const recipientName = (beneficiary_name || "Nexa User").toUpperCase();

    const cleanPayload = (payload: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== ""));

    const baseHashVariants = [
      [referenceNumber, String(amountNumber), bankCode || bankUuid || account_bank || "", account_number || ""],
      [referenceNumber, amountFixed, bankCode || bankUuid || account_bank || "", account_number || ""],
      [referenceNumber, String(amountNumber), account_number || ""],
      [referenceNumber, amountFixed, account_number || ""],
      [referenceNumber, String(amountNumber)],
      [referenceNumber],
    ];

    const requestAttempts: Array<{ endpoint: string; payloadVariants: Array<Record<string, unknown>> }> = [
      {
        endpoint: "depositToBank",
        payloadVariants: [
          cleanPayload({
            referenceNumber,
            amount: amountNumber,
            currency: "NGN",
            destinationBankUUID: bankUuid || account_bank,
            destinationBankCode: bankCode || undefined,
            destinationBank: bankCode || bankUuid || account_bank,
            destinationBankAccountNumber: account_number,
            destinationBankAccountName: recipientName,
            recipientName,
            recipientPhoneNumber: phoneLocal,
            recipientMobileNumber: phoneLocal,
            transferReference: referenceNumber,
            reason: narration || "Withdrawal",
            remarks: narration || "Withdrawal",
            statusCallbackUrl: callbackUrl,
          }),
          cleanPayload({
            referenceNumber,
            amount: amountFixed,
            currency: "NGN",
            destinationBankCode: bankCode || undefined,
            destinationBankAccountNumber: account_number,
            destinationAccountNumber: account_number,
            destinationBankAccountName: recipientName,
            recipientName,
            recipientPhoneNumber: phoneIntl,
            reason: narration || "Withdrawal",
            statusCallbackUrl: callbackUrl,
          }),
          cleanPayload({
            referenceNumber,
            amount: amountNumber,
            destinationBankCode: bankCode || undefined,
            destinationBankAccountNumber: account_number,
            recipientName,
            recipientPhoneNumber: phoneLocal,
          }),
        ],
      },
      {
        endpoint: "moneyTransferToBankAccount",
        payloadVariants: [
          // Strict minimal payload based on integration note
          cleanPayload({
            referenceNumber,
            amount: amountNumber,
            destinationBankCode: bankCode || undefined,
            destinationBankAccountNumber: account_number,
            destinationBankAccountName: recipientName,
            currency: "NGN",
            reason: narration || "Withdrawal",
          }),
          cleanPayload({
            referenceNumber,
            amount: amountFixed,
            destinationBankCode: bankCode || undefined,
            destinationBankAccountNumber: account_number,
            destinationBankAccountHolderName: recipientName,
            currency: "NGN",
            narration: narration || "Withdrawal",
          }),
          cleanPayload({
            referenceNumber,
            amount: amountNumber,
            destinationBankCode: bankCode || undefined,
            destinationAccountNumber: account_number,
            destinationAccountName: recipientName,
            currency: "NGN",
            reason: narration || "Withdrawal",
          }),
          cleanPayload({
            referenceNumber,
            amount: amountNumber,
            destinationBankUUID: bankUuid || undefined,
            destinationBankAccountNumber: account_number,
            destinationBankAccountName: recipientName,
            currency: "NGN",
            reason: narration || "Withdrawal",
          }),
        ],
      },
    ];

    let pagaResponse: Response | null = null;
    let pagaData: any = null;

    for (let attemptIndex = 0; attemptIndex < requestAttempts.length; attemptIndex++) {
      const attempt = requestAttempts[attemptIndex];
      for (let payloadVariantIndex = 0; payloadVariantIndex < attempt.payloadVariants.length; payloadVariantIndex++) {
        const payload = attempt.payloadVariants[payloadVariantIndex];

        for (let hashIndex = 0; hashIndex < baseHashVariants.length; hashIndex++) {
          const fields = baseHashVariants[hashIndex];
          const hash = await generatePagaBusinessHash(fields, PAGA_HASH_KEY);
          console.log(`Attempting Paga transfer: endpoint=${attempt.endpoint}, payload=${payloadVariantIndex + 1}, hash=${hashIndex + 1}`);

          pagaResponse = await fetch(`${PAGA_BASE_URL}/${attempt.endpoint}`, {
            method: "POST",
            headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
            body: JSON.stringify(payload),
          });

          const responseText = await pagaResponse.text();
          try {
            pagaData = JSON.parse(responseText);
          } catch {
            pagaData = { error: "Invalid JSON", raw: responseText };
          }

          const isSuccessAttempt =
            pagaData?.responseCode === 0 ||
            pagaData?.responseCode === "0" ||
            pagaData?.status === "SUCCESS" ||
            pagaData?.status === "SUCCESSFUL" ||
            pagaData?.transactionStatus === "SUCCESS" ||
            pagaData?.transactionStatus === "SUCCESSFUL";

          pagaData.debug_attempted_payload = {
            ...payload,
            senderPrincipal: "HIDDEN",
            attempted_endpoint: attempt.endpoint,
            attempted_payload_variant: payloadVariantIndex + 1,
            attempted_hash_index: hashIndex + 1,
            resolved_bank_code: bankCode,
            resolved_bank_uuid: bankUuid,
            resolved_bank_name: bankName,
            banks_sample: bankSample,
          };

          if (isSuccessAttempt) break;

          const errText = [
            pagaData?.details?.errorMessage,
            pagaData?.errorMessage,
            pagaData?.responseMessage,
            pagaData?.message,
            pagaData?.error,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const isHashError = errText.includes("invalid request hash");
          const isKnownBadPayload = errText.includes("begin 0, end 2, length 0");
          const isBadParamName = errText.includes("parameter names could not be found");

          if (!isHashError && !isKnownBadPayload && !isBadParamName) {
            // Non-retriable provider error for this payload shape.
            break;
          }
        }

        const payloadSucceeded =
          pagaData?.responseCode === 0 ||
          pagaData?.responseCode === "0" ||
          pagaData?.status === "SUCCESS" ||
          pagaData?.status === "SUCCESSFUL" ||
          pagaData?.transactionStatus === "SUCCESS" ||
          pagaData?.transactionStatus === "SUCCESSFUL";

        if (payloadSucceeded) break;
      }

      const attemptSucceeded =
        pagaData?.responseCode === 0 ||
        pagaData?.responseCode === "0" ||
        pagaData?.status === "SUCCESS" ||
        pagaData?.status === "SUCCESSFUL" ||
        pagaData?.transactionStatus === "SUCCESS" ||
        pagaData?.transactionStatus === "SUCCESSFUL";

      if (attemptSucceeded) break;
    }

    if (!pagaResponse || !pagaData) {
        // Rollback the pending debit atomically
        await supabaseAdmin.rpc("rollback_wallet_debit", { p_reference: referenceNumber });
        return new Response(
            JSON.stringify({ status: false, error: "Failed to communicate with transfer provider", message: "Failed to communicate with transfer provider" }),
            { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
        );
    }

    console.log("Paga depositToBank response:", JSON.stringify(pagaData));

    const isSuccess =
      pagaData.responseCode === 0 ||
      pagaData.responseCode === "0" ||
      pagaData.status === "SUCCESS" ||
      pagaData.status === "SUCCESSFUL" ||
      pagaData.transactionStatus === "SUCCESS" ||
      pagaData.transactionStatus === "SUCCESSFUL";

    if (!isSuccess) {
      // Rollback wallet debit atomically
      await supabaseAdmin.rpc("rollback_wallet_debit", { p_reference: referenceNumber });

      let userSafeMessage = pagaData.errorMessage || pagaData.message || pagaData.responseMessage || "Transfer failed";
      
      // Mask internal merchant balance errors (Code 139 is insufficient merchant balance)
      if (pagaData.responseCode === 139 || String(pagaData.responseCode) === "139") {
          userSafeMessage = "Withdrawal service is currently unavailable. Please try again later.";
      }
      if (String(userSafeMessage).toLowerCase().includes("begin 0, end 2, length 0")) {
          userSafeMessage = "This bank is currently unavailable for withdrawal. Please try another bank account.";
      }

      return new Response(
        JSON.stringify({
          status: false,
          error: userSafeMessage,
          message: userSafeMessage,
          details: pagaData,
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Finalize withdrawal atomically (mark success + log fee)
    await supabaseAdmin.rpc("finalize_wallet_debit", {
      p_reference: referenceNumber,
      p_metadata: { fee, netAmount, account_number, account_bank, paga_response: pagaData },
    });

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
