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
        
        const target = (account_bank || "").toLowerCase().trim();
        const matchedBank = banksList.find((b: any) => {
            const values = [b.uuid, b.bankUUID, b.bankUuid, b.id, b.code, b.bankCode, b.destinationBankCode]
                .filter(v => typeof v === 'string')
                .map(v => v.toLowerCase().trim());
            return values.includes(target);
        });

        if (matchedBank) {
            bankCode = matchedBank.code || matchedBank.bankCode || matchedBank.destinationBankCode || "";
        }
    } catch (e) {
        console.warn("Failed to resolve bank code:", e);
    }

    const hashAmount = String(amount);
    const normalizedPhone = (phoneNumber || "7000000000").replace(/\D/g, '').slice(-10);
    
    // Paga's hash validation logic for depositToBank is extremely specific.
    const hashVariants = [
      [referenceNumber, hashAmount, account_bank || "", account_number || ""],
      [referenceNumber, hashAmount, bankCode || account_bank || "", account_number || ""],
      [referenceNumber, hashAmount, account_bank || "", account_number || "", normalizedPhone],
      [referenceNumber, hashAmount, "NGN", account_bank || "", account_number || ""],
    ];

    let pagaResponse: Response | null = null;
    let pagaData: any = null;

    for (let i = 0; i < hashVariants.length; i++) {
        const fields = hashVariants[i];
        console.log(`Attempting Paga transfer with hash variant ${i + 1}...`);
        const hash = await generatePagaBusinessHash(fields, PAGA_HASH_KEY);

        const pagaPayload: any = {
            referenceNumber,
            amount: Number(amount),
            currency: "NGN",
            destinationBankUUID: account_bank,
            destinationBankAccountNumber: account_number,
            recipientName: (beneficiary_name || "Nexa User").toUpperCase(),
            recipientPhoneNumber: normalizedPhone,
            recipientMobileNumber: normalizedPhone,
            transferReference: referenceNumber,
            senderPrincipal: PAGA_PUBLIC_KEY,
            remarks: "Withdrawal",
            statusCallbackUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/paga-webhook`,
        };

        if (bankCode) {
            pagaPayload.destinationBankCode = bankCode;
            pagaPayload.destinationBank = bankCode;
        } else {
            pagaPayload.destinationBank = account_bank;
        }

        pagaResponse = await fetch(`${PAGA_BASE_URL}/depositToBank`, {
            method: "POST",
            headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
            body: JSON.stringify(pagaPayload),
        });

        const responseText = await pagaResponse.text();
        try {
            pagaData = JSON.parse(responseText);
            if (pagaData.responseCode && pagaData.responseCode !== 0 && pagaData.responseCode !== "0") {
                pagaData.debug_attempted_payload = { 
                    ...pagaPayload, 
                    senderPrincipal: "HIDDEN",
                    resolved_bank_code: bankCode,
                    banks_sample: bankSample
                };
            }
        } catch {
            pagaData = { 
                error: "Invalid JSON", 
                raw: responseText, 
                debug_attempted_payload: { 
                    ...pagaPayload, 
                    senderPrincipal: "HIDDEN",
                    resolved_bank_code: bankCode,
                    banks_sample: bankSample
                } 
            };
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

      let userSafeMessage = pagaData.message || pagaData.responseMessage || "Transfer failed";
      
      // Mask internal merchant balance errors (Code 139 is insufficient merchant balance)
      if (pagaData.responseCode === 139 || String(pagaData.responseCode) === "139") {
          userSafeMessage = "Withdrawal service is currently unavailable. Please try again later.";
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
