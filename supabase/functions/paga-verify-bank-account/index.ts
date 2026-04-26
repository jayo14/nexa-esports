import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
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
  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
  const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")?.trim();

  const PAGA_BASE_URL = PAGA_IS_SANDBOX ? SANDBOX_URL : LIVE_URL;

  try {
    const { account_number, bank_code } = await req.json();

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ error: "account_number and bank_code are required" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    const PAGA_BANKS_ENDPOINT = req.url.replace("paga-verify-bank-account", "paga-get-banks");
    let bankDetails: { uuid?: string; code?: string; name: string } | null = null;

    try {
      const banksResponse = await fetch(PAGA_BANKS_ENDPOINT, {
        headers: { Authorization: req.headers.get("Authorization") || "" },
      });
      const banksJson = await banksResponse.json();
      const banks = banksJson.data || [];
      const bank = banks.find((b: any) => b.uuid === bank_code || b.code === bank_code || b.name === bank_code);
      if (bank) {
        bankDetails = { uuid: bank.uuid, code: bank.code, name: bank.name };
      }
    } catch (e) {
      console.error("Failed to fetch bank list for mapping:", e);
    }

    if (!bankDetails) {
      bankDetails = { name: bank_code };
    }

    // Attempt fallbacks first if bankDetails name is available
    if (bankDetails.name) {
      const normalize = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .replace(/microfinancebank|microfinance|mfb/g, "");

      // Try Flutterwave fallback
      if (FLW_SECRET_KEY) {
        try {
          const flwBanksResponse = await fetch("https://api.flutterwave.com/v3/banks/NG", {
            headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
          });
          const flwBanksJson = await flwBanksResponse.json();
          const flwBanks = (flwBanksJson?.data as Array<{ code: string; name: string }> | undefined) || [];
          const target = normalize(bankDetails.name);
          const matchedFlwBank =
            flwBanks.find((bank) => normalize(bank.name) === target) ||
            flwBanks.find((bank) => normalize(bank.name).includes(target) || target.includes(normalize(bank.name)));

          if (matchedFlwBank?.code) {
            const resolveResponse = await fetch("https://api.flutterwave.com/v3/accounts/resolve", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${FLW_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                account_number,
                account_bank: matchedFlwBank.code,
              }),
            });
            const resolveJson = await resolveResponse.json();
            if (resolveJson?.status === "success" && resolveJson?.data?.account_name) {
              return new Response(
                JSON.stringify({
                  status: "success",
                  account_name: resolveJson.data.account_name,
                  data: {
                    provider: "flutterwave-fallback",
                    bank_name: matchedFlwBank.name,
                    bank_code: matchedFlwBank.code,
                  },
                }),
                { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
              );
            }
          }
        } catch (flwError) {
          console.warn("Flutterwave fallback failed:", flwError);
        }
      }
    }

    if (!PAGA_PUBLIC_KEY || !PAGA_HASH_KEY || !PAGA_API_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Account verification unavailable: Paga credentials not configured." }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    let pagaData: any = null;
    let lastResponseStatus = 400;

    // Paga validateDepositToBank requirement: referenceNumber + amount + destinationBankUUID + destinationBankAccountNumber + hashKey
    if (bankDetails.uuid) {
      const referenceNumber = generateReferenceNumber("VBA");
      const amount = ""; // Optional but part of hash if present in order
      const hash = await generatePagaBusinessHash(
        [referenceNumber, amount, bankDetails.uuid, account_number],
        PAGA_HASH_KEY
      );

      const pagaResponse = await fetch(`${PAGA_BASE_URL}/validateDepositToBank`, {
        method: "POST",
        headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
        body: JSON.stringify({
          referenceNumber,
          amount,
          destinationBankUUID: bankDetails.uuid,
          destinationBankAccountNumber: account_number,
        }),
      });

      const responseText = await pagaResponse.text();
      try {
        pagaData = JSON.parse(responseText);
      } catch {
        pagaData = { responseCode: -1, responseMessage: "Invalid JSON response from Paga", raw: responseText };
      }

      console.log(`Paga validateDepositToBank response:`, JSON.stringify(pagaData));
      lastResponseStatus = pagaResponse.status;
    }

    const isSuccess = pagaData?.responseCode === 0 || pagaData?.responseCode === "0";

    if (!isSuccess) {
      // Try Paystack fallback
      if (PAYSTACK_SECRET_KEY && bankDetails.name) {
        const normalize = (value: string) =>
          value
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .replace(/microfinancebank|microfinance|mfb/g, "");

        try {
          const paystackBanksResponse = await fetch("https://api.paystack.co/bank", {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          });
          const paystackBanksJson = await paystackBanksResponse.json();
          const paystackBanks = (paystackBanksJson.data as Array<{ name: string; code: string }> | undefined) || [];
          const target = normalize(bankDetails.name);
          const matchedPaystackBank =
            paystackBanks.find((bank) => normalize(bank.name) === target) ||
            paystackBanks.find((bank) => normalize(bank.name).includes(target) || target.includes(normalize(bank.name)));

          if (matchedPaystackBank?.code) {
            const paystackResolveResponse = await fetch(
              `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(matchedPaystackBank.code)}`,
              { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
            );
            const paystackResolve = await paystackResolveResponse.json();

            if (paystackResolve?.status && paystackResolve?.data?.account_name) {
              return new Response(
                JSON.stringify({
                  status: "success",
                  account_name: paystackResolve.data.account_name,
                  data: {
                    provider: "paystack-fallback",
                    bank_name: matchedPaystackBank.name,
                    bank_code: matchedPaystackBank.code,
                  },
                }),
                { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
              );
            }
          }
        } catch (paystackError) {
          console.warn("Paystack fallback failed:", paystackError);
        }
      }

      return new Response(
        JSON.stringify({
          error: pagaData?.responseMessage || pagaData?.message || pagaData?.errorMessage || "Account verification failed",
          details: pagaData,
          bank_context: {
            selected_bank_code: bank_code,
            resolved_bank_uuid: bankDetails.uuid,
            resolved_bank_code: bankDetails.code,
            resolved_bank_name: bankDetails.name,
          },
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: lastResponseStatus || 400 }
      );
    }

    const accountName =
      pagaData.destinationAccountHolderNameAtBank ||
      pagaData.accountName ||
      pagaData.beneficiaryName ||
      "Account Verified";

    return new Response(
      JSON.stringify({ status: "success", account_name: accountName, data: pagaData }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error verifying bank account:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
