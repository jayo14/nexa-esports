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

/**
 * Get OAuth access token from Flutterwave v4 API
 * @returns Access token string
 * @throws Error if OAuth authentication fails
 */
export async function getFlutterwaveAccessToken(): Promise<string> {
  const CLIENT_ID = Deno.env.get("FLW_CLIENT_ID")?.trim();
  const CLIENT_SECRET = Deno.env.get("FLW_CLIENT_SECRET")?.trim();

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Flutterwave v4 credentials missing: FLW_CLIENT_ID and FLW_CLIENT_SECRET are required");
  }

  console.log("Requesting Flutterwave OAuth token...");

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

    console.log("OAuth token obtained successfully");
    return tokenData.access_token;
  } catch (error) {
    console.error("Error getting Flutterwave OAuth token:", error);
    throw error;
  }
}

/**
 * Make an authenticated request to Flutterwave v4 API
 * Automatically handles OAuth token acquisition
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
