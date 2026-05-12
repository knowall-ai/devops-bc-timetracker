import type { AppSettings, AuthToken } from "./types";
import { clearAuthToken, getAuthToken, saveAuthToken, savePkceState, takePkceState } from "./storage";

const BUSINESS_CENTRAL_SCOPE = "https://api.businesscentral.dynamics.com/.default offline_access openid profile";
const TOKEN_SKEW_MS = 60_000;

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes.buffer);
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

export function isTokenUsable(token: AuthToken | undefined): boolean {
  return Boolean(token?.accessToken && token.expiresAt > Date.now() + TOKEN_SKEW_MS);
}

export function getRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

export async function beginMicrosoftSignIn(settings: AppSettings): Promise<void> {
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(24);
  const redirectUri = getRedirectUri();

  savePkceState({ state, verifier, redirectUri });

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${encodeURIComponent(settings.tenantId)}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set("client_id", settings.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", BUSINESS_CENTRAL_SCOPE);
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);

  window.location.assign(authorizeUrl.toString());
}

export function hasAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has("code") || params.has("error");
}

export async function completeMicrosoftSignIn(settings: AppSettings): Promise<AuthToken> {
  const params = new URLSearchParams(window.location.search);
  const error = params.get("error");
  if (error) {
    throw new Error(params.get("error_description") ?? error);
  }

  const code = params.get("code");
  const state = params.get("state");
  const pkce = takePkceState();
  if (!code || !state || !pkce || pkce.state !== state) {
    throw new Error("Microsoft sign-in callback could not be verified.");
  }

  const token = await exchangeAuthorizationCode(settings, code, pkce.verifier, pkce.redirectUri);
  saveAuthToken(token);
  window.history.replaceState({}, document.title, pkce.redirectUri);
  return token;
}

export async function getValidAccessToken(settings: AppSettings): Promise<string> {
  const token = getAuthToken();
  if (token && isTokenUsable(token)) {
    return token.accessToken;
  }

  if (token?.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(settings, token.refreshToken);
      saveAuthToken(refreshed);
      return refreshed.accessToken;
    } catch {
      clearAuthToken();
    }
  }

  throw new Error("Connect to Business Central before logging time.");
}

async function exchangeAuthorizationCode(
  settings: AppSettings,
  code: string,
  verifier: string,
  redirectUri: string
): Promise<AuthToken> {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
    scope: BUSINESS_CENTRAL_SCOPE
  });

  return requestToken(settings.tenantId, body);
}

async function refreshAccessToken(settings: AppSettings, refreshToken: string): Promise<AuthToken> {
  const body = new URLSearchParams({
    client_id: settings.clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: BUSINESS_CENTRAL_SCOPE
  });

  return requestToken(settings.tenantId, body);
}

async function requestToken(tenantId: string, body: URLSearchParams): Promise<AuthToken> {
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "Microsoft token request failed.");
  }

  const token: AuthToken = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    tokenType: payload.token_type ?? "Bearer"
  };

  if (payload.refresh_token) {
    token.refreshToken = payload.refresh_token;
  }

  return token;
}
