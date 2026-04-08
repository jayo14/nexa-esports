// Helper for Paga API HMAC authentication

export function generatePagaHash(fields: string[], apiPassword: string): string {
  const hashInput = fields.filter(Boolean).join('');
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiPassword);
  const msgData = encoder.encode(hashInput);

  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
    .then((key) => crypto.subtle.sign('HMAC', key, msgData))
    .then((sig) => Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')) as unknown as string;
}

export async function generatePagaHashAsync(fields: string[], apiPassword: string): Promise<string> {
  const hashInput = fields.filter(Boolean).join('');
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiPassword);
  const msgData = encoder.encode(hashInput);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, msgData);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function pagaHeaders(hash: string, apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': hash,
    'principal': apiKey,
    'credentials': hash,
  };
}

export function generateReferenceNumber(prefix = 'NX'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
