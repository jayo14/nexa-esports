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

    const resolveBankUUID = async (candidate: string): Promise<string | null> => {
      if (UUID_REGEX.test(candidate)) return candidate;

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
        return null;
      }

      if (!getBanksResponse.ok || (banksData.responseCode !== 0 && banksData.responseCode !== "0")) {
        return null;
      }

      const banks = banksData.bank || banksData.banks || banksData.data || [];
      const normalizedCandidate = String(candidate).trim().toLowerCase();
      const matchedBank = banks.find((bank: any) => {
        const values = [
          bank?.uuid,
          bank?.bankUUID,
          bank?.bankUuid,
          bank?.code,
          bank?.bankCode,
          bank?.id,
          bank?.name,
        ]
          .filter((value: unknown) => value !== null && value !== undefined)
          .map((value: unknown) => String(value).trim().toLowerCase());

        return values.includes(normalizedCandidate);
      });

      if (!matchedBank) return null;

      const resolved =
        matchedBank.uuid ||
        matchedBank.bankUUID ||
        matchedBank.bankUuid ||
        null;

      return resolved ? String(resolved) : null;
    };

    const bankUUID = await resolveBankUUID(String(bank_code));
    if (!bankUUID) {
      return new Response(
        JSON.stringify({
          error: "Invalid bank selected. Please re-select your bank and try again.",
          details: { bank_code },
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 400 }
      );
    }

    const referenceNumber = generateReferenceNumber("NX_VBA");

    // Paga account validation hash: referenceNumber + destinationBankUUID + destinationBankAccountNumber + salt
    const hash = await generatePagaBusinessHash(
      [referenceNumber, bankUUID, account_number],
      PAGA_HASH_KEY
    );

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/validateDepositToBank`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
      body: JSON.stringify({
        referenceNumber,
        destinationBankUUID: bankUUID,
        destinationBankAccountNumber: account_number,
      }),
    });

    const responseText = await pagaResponse.text();
    let pagaData: any;
    try {
      pagaData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid response from Paga" }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Paga validateDepositToBank response:", JSON.stringify(pagaData));

    const isSuccess = pagaData.responseCode === 0 || pagaData.responseCode === "0";

    if (!isSuccess) {
      return new Response(
        JSON.stringify({ error: pagaData.responseMessage || "Account verification failed", details: pagaData }),
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
