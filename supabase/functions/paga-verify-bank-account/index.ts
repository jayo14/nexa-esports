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

    const referenceNumber = generateReferenceNumber("NX_VBA");

    // Paga account validation hash: referenceNumber + accountNumber + bankUUID + salt
    const hash = await generatePagaBusinessHash(
      [referenceNumber, account_number, bank_code],
      PAGA_HASH_KEY
    );

    const pagaResponse = await fetch(`${PAGA_BASE_URL}/validateDepositToBank`, {
      method: "POST",
      headers: pagaHeaders(PAGA_PUBLIC_KEY, PAGA_API_PASSWORD, hash),
      body: JSON.stringify({
        referenceNumber,
        destinationBankUUID: bank_code,
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
