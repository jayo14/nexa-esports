// Helper for Paga API authentication

/**
 * Generates a SHA-512 hash by concatenating fields and appending the salt (Hash Key).
 * This is the standard for Paga Business REST API.
 */
export async function generatePagaBusinessHash(fields: string[], hashKey: string): Promise<string> {
  const hashInput = fields.filter(f => f !== undefined && f !== null).join('') + hashKey;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an HMAC-SHA-512 hash.
 * Some Paga APIs (like Collect) might use this.
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
export function pagaHeaders(principal: string, credentials: string, hash: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'principal': principal,
    'credentials': credentials,
    'hash': hash,
  };
}

export function generateReferenceNumber(prefix = 'NX'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
