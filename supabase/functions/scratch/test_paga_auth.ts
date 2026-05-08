
const PAGA_PUBLIC_KEY = "462d79a2-404c-41eb-bc62-07b9689e8d6c";
const PAGA_SECRET_KEY = "Bvi76QHvrfpfHUFhFdEnzVo82Ume8mPt";

async function test(url, name) {
  console.log(`Testing ${name} (${url})...`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "username": PAGA_PUBLIC_KEY,
        "password": PAGA_SECRET_KEY,
        "principal": PAGA_PUBLIC_KEY,
        "credentials": PAGA_SECRET_KEY,
        "Authorization": `Basic ${btoa(`${PAGA_PUBLIC_KEY}:${PAGA_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({ referenceNumber: "test_" + Date.now() }),
    });
    console.log(`${name} status: ${res.status}`);
    const text = await res.text();
    console.log(`${name} body: ${text.substring(0, 200)}`);
  } catch (e) {
    console.log(`${name} error: ${e.message}`);
  }
}

await test("https://beta-collect.paga.com/status", "Sandbox Collect");
await test("https://collect.paga.com/status", "Live Collect");
await test("https://beta.mypaga.com/paga-webservices/business-rest/secured/getBanks", "Sandbox Business");
await test("https://www.mypaga.com/paga-webservices/business-rest/secured/getBanks", "Live Business");
