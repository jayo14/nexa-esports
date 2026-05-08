import { generatePagaBusinessHash, pagaHeaders, generateReferenceNumber } from "./pagaAuth.ts";

const LIVE_URL = "https://www.mypaga.com/paga-webservices/business-rest/secured";
const SANDBOX_URL = "https://beta.mypaga.com/paga-webservices/business-rest/secured";

export interface PagaBank {
  uuid: string;
  code: string;
  name: string;
}

export class PagaClient {
  private publicKey: string;
  private secretKey: string;
  private hashKey: string;
  private baseUrl: string;

  constructor() {
    this.publicKey = Deno.env.get("PAGA_PUBLIC_KEY")?.trim() || "";
    this.secretKey = Deno.env.get("PAGA_SECRET_KEY")?.trim() || "";
    this.hashKey = Deno.env.get("PAGA_HASH_KEY")?.trim() || "";
    const isSandbox = Deno.env.get("PAGA_IS_SANDBOX") === "true";
    this.baseUrl = isSandbox ? SANDBOX_URL : LIVE_URL;
  }

  async getBanks(): Promise<PagaBank[]> {
    if (!this.publicKey || !this.hashKey || !this.secretKey) {
      throw new Error("Paga credentials missing");
    }

    const referenceNumber = generateReferenceNumber("GB");
    const hash = await generatePagaBusinessHash([referenceNumber], this.hashKey);

    const response = await fetch(`${this.baseUrl}/getBanks`, {
      method: "POST",
      headers: pagaHeaders(this.publicKey, this.secretKey, hash),
      body: JSON.stringify({ referenceNumber }),
    });

    const data = await response.json();
    if (data.responseCode !== 0 && data.responseCode !== "0") {
      throw new Error(data.responseMessage || data.message || data.errorMessage || "Failed to fetch banks");
    }

    return data.bank || data.banks || data.data || [];
  }

  async validateDepositToBank(bankUuid: string, accountNumber: string): Promise<any> {
    if (!this.publicKey || !this.hashKey || !this.secretKey) {
      throw new Error("Paga credentials missing");
    }

    const referenceNumber = generateReferenceNumber("VBA");
    const amount = "";
    const hash = await generatePagaBusinessHash(
      [referenceNumber, amount, bankUuid, accountNumber],
      this.hashKey
    );

    const response = await fetch(`${this.baseUrl}/validateDepositToBank`, {
      method: "POST",
      headers: pagaHeaders(this.publicKey, this.secretKey, hash),
      body: JSON.stringify({
        referenceNumber,
        amount,
        destinationBankUUID: bankUuid,
        destinationBankAccountNumber: accountNumber,
      }),
    });

    const data = await response.json();
    return data;
  }
}
