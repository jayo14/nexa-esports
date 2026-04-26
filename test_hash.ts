import { generatePagaBusinessHash } from "./supabase/functions/_shared/pagaAuth.ts";

async function test() {
  const referenceNumber = "12345";
  const hashKey = "testKey";
  const hash = await generatePagaBusinessHash([referenceNumber], hashKey);
  console.log("Hash:", hash);

  // Paga docs example: referenceNumber + hashkey
  // In our case: "12345testKey"
  // SHA-512 of "12345testKey":
  // d194856f67a299a91590f05562095f9c456202497042a98402434b9d311d4e0e5601956e1847e9238384214f9d0c9f87498c4d16d1f5e8e3d55169992f802187
  // Let's see if we get that.
}

test();
