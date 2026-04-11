import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "../_shared/pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
        JSON.stringify({ error: "Service not configured: Paga credentials missing" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    const { account_number, bank_code } = await req.json();

    if (!account_number || !bank_code) {
      return new Response(JSON.stringify({ error: "account_number and bank_code are required" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    const fetchBanks = async (): Promise<any[]> => {
      const getBanksRef = generateReferenceNumber("GB");
      const getBanksHash = await generatePagaBusinessHash([getBanksRef], PAGA_HASH_KEY);
      const getBanksResponse = await fetch(`${PAGA_BASE_URL}/getBanks`, {
        method: "POST",
        headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, getBanksHash),
        body: JSON.stringify({ referenceNumber: getBanksRef }),
      });

      const banksText = await getBanksResponse.text();
      let banksData: any;
      try {
        banksData = JSON.parse(banksText);
      } catch {
        return [];
      }

      if (!getBanksResponse.ok || (banksData.responseCode !== 0 && banksData.responseCode !== "0")) {
        return [];
      }

      return banksData.bank || banksData.banks || banksData.data || [];
    };

    const banks = await fetchBanks();
    const resolveBankDetails = (candidate: string): { uuid: string | null; code: string | null; name: string | null } => {
      const normalizedCandidate = String(candidate).trim().toLowerCase();
      const matchedBank = banks.find((bank: any) => {
        const values = [
          bank?.uuid,
          bank?.bankUUID,
          bank?.bankUuid,
          bank?.code,
          bank?.bankCode,
          bank?.destinationBankCode,
          bank?.id,
          bank?.name,
        ]
          .filter((value: unknown) => value !== null && value !== undefined)
          .map((value: unknown) => String(value).trim().toLowerCase());

        return values.includes(normalizedCandidate);
      });

      if (!matchedBank) {
        return {
          uuid: UUID_REGEX.test(candidate) ? candidate : null,
          code: null,
          name: null,
        };
      }

      const uuid =
        matchedBank.uuid ||
        matchedBank.bankUUID ||
        matchedBank.bankUuid ||
        null;
      const code =
        matchedBank.code ||
        matchedBank.bankCode ||
        matchedBank.destinationBankCode ||
        matchedBank.id ||
        null;

      return {
        uuid: uuid ? String(uuid) : null,
        code: code ? String(code) : null,
        name: matchedBank.name ? String(matchedBank.name) : null,
      };
    };

    const bankDetails = resolveBankDetails(String(bank_code));
    if (!bankDetails.uuid && !bankDetails.code) {
      return new Response(
        JSON.stringify({
          error: "Invalid bank selected. Please re-select your bank and try again.",
          details: { bank_code },
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    const attempts: Array<{ endpoint: string; payload: Record<string, string>; hashFieldVariants: string[][] }> = [];
    if (bankDetails.uuid) {
      attempts.push({
        endpoint: "validateDepositToBank",
        payload: { destinationBankUUID: bankDetails.uuid, destinationBankAccountNumber: account_number },
        hashFieldVariants: [
          [bankDetails.uuid, account_number],
          [account_number, bankDetails.uuid],
          [account_number],
          [bankDetails.uuid],
          [],
        ],
      });
      attempts.push({
        endpoint: "validateDepositToWallet",
        payload: { destinationBankUUID: bankDetails.uuid, destinationBankAccountNumber: account_number },
        hashFieldVariants: [
          [bankDetails.uuid, account_number],
          [account_number, bankDetails.uuid],
          [account_number],
          [bankDetails.uuid],
          [],
        ],
      });
    }
    if (bankDetails.code) {
      attempts.push({
        endpoint: "validateDepositToWallet",
        payload: { destinationBankCode: bankDetails.code, destinationBankAccountNumber: account_number },
        hashFieldVariants: [
          [bankDetails.code, account_number],
          [account_number, bankDetails.code],
          [account_number],
          [bankDetails.code],
          [],
        ],
      });
      attempts.push({
        endpoint: "validateDepositToBank",
        payload: { destinationBankCode: bankDetails.code, destinationBankAccountNumber: account_number },
        hashFieldVariants: [
          [bankDetails.code, account_number],
          [account_number, bankDetails.code],
          [account_number],
          [bankDetails.code],
          [],
        ],
      });
    }

    let pagaData: any = null;
    let lastResponseStatus = 400;
    for (const attempt of attempts) {
      for (const hashFields of attempt.hashFieldVariants) {
        const referenceNumber = generateReferenceNumber("NX_VBA");
        const hash = await generatePagaBusinessHash(
          [referenceNumber, ...hashFields],
          PAGA_HASH_KEY
        );

        const pagaResponse = await fetch(`${PAGA_BASE_URL}/${attempt.endpoint}`, {
          method: "POST",
          headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
          body: JSON.stringify({
            referenceNumber,
            ...attempt.payload,
          }),
        });

        const responseText = await pagaResponse.text();
        try {
          pagaData = JSON.parse(responseText);
        } catch {
          pagaData = { responseCode: -1, responseMessage: "Invalid JSON response from Paga", raw: responseText };
        }

        console.log(`Paga ${attempt.endpoint} response:`, JSON.stringify(pagaData));
        lastResponseStatus = pagaResponse.status;
        if (pagaData?.responseCode === 0 || pagaData?.responseCode === "0") {
          break;
        }
      }
      if (pagaData?.responseCode === 0 || pagaData?.responseCode === "0") break;
    }

    const isSuccess = pagaData?.responseCode === 0 || pagaData?.responseCode === "0";

    if (!isSuccess) {
      return new Response(
        JSON.stringify({
          error: pagaData?.responseMessage || "Account verification failed",
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
