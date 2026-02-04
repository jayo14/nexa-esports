/**
 * Flutterwave v4 OAuth Authentication Helper
 * 
 * This module provides OAuth 2.0 token management for Flutterwave v4 API.
 * v4 requires OAuth authentication instead of simple Bearer token.
 */

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface OAuthErrorResponse {
  error: string;
  error_description?: string;
}

// Token cache to avoid excessive OAuth requests
let cachedToken: string | null = null;
let tokenExpiryTime: number | null = null;

/**
 * Get OAuth access token from Flutterwave v4 API
 * Uses token caching to minimize OAuth requests
 * @returns Access token string
 * @throws Error if OAuth authentication fails
 */
export async function getFlutterwaveAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60 second buffer)
  if (cachedToken && tokenExpiryTime && Date.now() < tokenExpiryTime - 60000) {
    console.log("Using cached OAuth token");
    return cachedToken;
  }

  const CLIENT_ID = Deno.env.get("FLW_CLIENT_ID")?.trim();
  const CLIENT_SECRET = Deno.env.get("FLW_CLIENT_SECRET")?.trim();

  console.log("Flutterwave OAuth Check:");
  console.log("- CLIENT_ID found:", !!CLIENT_ID);
  console.log("- CLIENT_SECRET found:", !!CLIENT_SECRET);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(`Flutterwave v4 credentials missing. Found Client ID: ${!!CLIENT_ID}, Found Secret: ${!!CLIENT_SECRET}`);
  }

  console.log("Requesting new Flutterwave OAuth token for Client ID:", CLIENT_ID.substring(0, 5) + "...");

  try {
    const tokenResponse = await fetch(
      "https://api.flutterwave.com/v4/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "client_credentials",
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData: OAuthErrorResponse = await tokenResponse.json();
      console.error("OAuth token request failed:", errorData);
      throw new Error(
        `Flutterwave OAuth failed: ${errorData.error || "Unknown error"} - ${errorData.error_description || ""}`
      );
    }

    const tokenData: OAuthTokenResponse = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("No access token received from Flutterwave OAuth");
    }

    // Cache the token with expiry time
    cachedToken = tokenData.access_token;
    tokenExpiryTime = Date.now() + (tokenData.expires_in * 1000);

    console.log(`OAuth token obtained successfully, expires in ${tokenData.expires_in} seconds`);
    return cachedToken;
  } catch (error) {
    console.error("Error getting Flutterwave OAuth token:", error);
    throw error;
  }
}

/**
 * Make an authenticated request to Flutterwave v4 API
 * Automatically handles OAuth token acquisition
 * @param url - The API endpoint URL
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Response from the API
 */
export async function flutterwaveAuthenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getFlutterwaveAccessToken();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
