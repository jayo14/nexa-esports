import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { PagaClient } from "../_shared/pagaClient.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
  const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")?.trim();

  try {
    const { account_number, bank_code } = await req.json();

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ error: "account_number and bank_code are required" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    const pagaClient = new PagaClient();
    let bankDetails: { uuid?: string; code?: string; name: string } | null = null;

    try {
      const banks = await pagaClient.getBanks();
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

    // Attempt fallbacks first if bankDetails name is available and not just a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bankDetails.name);

    if (bankDetails.name && !isUuid) {
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

    let pagaData: any = null;
    let lastResponseStatus = 400;

    if (bankDetails.uuid) {
      try {
        pagaData = await pagaClient.validateDepositToBank(bankDetails.uuid, account_number);
        console.log(`Paga validateDepositToBank response:`, JSON.stringify(pagaData));
      } catch (pagaError) {
        console.error("Paga validation call failed:", pagaError);
        pagaData = { responseCode: -1, responseMessage: pagaError instanceof Error ? pagaError.message : "Paga call failed" };
      }
    }

    const isSuccess = pagaData?.responseCode === 0 || pagaData?.responseCode === "0";

    if (!isSuccess) {
      // Try Paystack fallback
      if (PAYSTACK_SECRET_KEY && bankDetails.name && !isUuid) {
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
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
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
