/**
 * Flutterwave v3 Authentication Helper
 * 
 * This module provides simple Bearer token authentication for Flutterwave v3 API.
 * v3 uses a secret key directly without OAuth.
 */

/**
 * Get Flutterwave secret key from environment
 * @returns Secret key string
 * @throws Error if secret key is not configured
 */
export function getFlutterwaveSecretKey(): string {
  const SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")?.trim();

  if (!SECRET_KEY) {
    throw new Error("Flutterwave v3 credentials missing. FLW_SECRET_KEY is required.");
  }

  return SECRET_KEY;
}

/**
 * Make an authenticated request to Flutterwave v3 API
 * Uses simple Bearer token authentication
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Response from the API
 */
export async function flutterwaveAuthenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const secretKey = getFlutterwaveSecretKey();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
