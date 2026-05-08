// Helper for Paga API authentication

/**
 * Generates a SHA-512 hash of concatenated values.
 * @param parts - Array of values to concatenate. Null/undefined are treated as empty strings.
 */
export async function generateSHA512Hash(parts: (string | number | undefined | null)[]): Promise<string> {
  const message = parts.map(p => p ?? "").join("");
  const encoder = new TextEncoder();
  const msgData = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgData);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a SHA-512 hash for Paga Business REST API.
 * Paga requires SHA-512 of concatenated parameter values + hash key.
 * @param params - Array of parameter values to concatenate
 * @param hashKey - Paga Hash Key (HMAC Key)
 */
export async function generatePagaBusinessHash(
  params: (string | number | undefined | null)[],
  hashKey: string
): Promise<string> {
  return generateSHA512Hash([...params, hashKey]);
}

/**
 * Generates an HMAC-SHA-512 hash.
 * Some Paga APIs (like Collect) might still use this.
 */
export async function generatePagaHMAC(fields: string[], hmacKey: string): Promise<string> {
  const hashInput = fields.filter(f => f !== undefined && f !== null).join('');
  const encoder = new TextEncoder();
  const keyData = encoder.encode(hmacKey);
  const msgData = encoder.encode(hashInput);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Standard Paga headers for Business REST API.
 * @param principal - Public ID
 * @param credentials - API Password
 * @param hash - Computed SHA-512 hash
 */
export function pagaHeaders(principal: string, credentials: string, hash?: string): Record<string, string> {
  const auth = btoa(`${principal}:${credentials}`);
  return {
    'Content-Type': 'application/json',
    "Authorization": `Basic ${auth}`,
    "username": principal,
    "password": credentials,
    'principal': principal,
    'credentials': credentials,
    ...(hash ? { "hash": hash } : {}),
  };
}

export function generateReferenceNumber(prefix = 'NX'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}
