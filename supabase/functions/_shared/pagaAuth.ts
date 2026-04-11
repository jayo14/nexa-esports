// Helper for Paga Business REST API authentication
//
// Paga uses plain SHA-512 (NOT HMAC).
// Hash = SHA-512( field1 + field2 + ... + hashKey )
// Headers: principal = publicKey, credentials = password (plain text), hash = computed hash

export async function generatePagaHashAsync(fields: string[], hashKey: string): Promise<string> {
  // Append the hashKey to the concatenated fields, then SHA-512 the whole string
  const hashInput = [...fields.filter(Boolean), hashKey].join('');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-512', encoder.encode(hashInput));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function pagaHeaders(hash: string, publicKey: string, password: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'principal': publicKey,
    'credentials': password,
    'hash': hash,
  };
}

export function generateReferenceNumber(prefix = 'NX'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
