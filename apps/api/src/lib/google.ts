import { google } from "googleapis";
import type { Auth } from "googleapis";

type OAuth2Client = Auth.OAuth2Client;

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

export function googleConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);
}

export function makeOAuthClient(): OAuth2Client {
  if (!googleConfigured()) {
    throw new Error(
      "Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in apps/api/.env",
    );
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function buildConsentUrl(state: string): string {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCode(code: string): Promise<{
  refresh_token: string | null;
  access_token: string | null;
  expiry_date: number | null;
  email?: string;
  name?: string;
  picture?: string;
}> {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let email: string | undefined;
  let name: string | undefined;
  let picture: string | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    email = data.email ?? undefined;
    name = data.given_name ?? data.name ?? undefined;
    picture = data.picture ?? undefined;
  } catch {
    // ignore — userinfo is best-effort
  }

  return {
    refresh_token: tokens.refresh_token ?? null,
    access_token: tokens.access_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
    email,
    name,
    picture,
  };
}

export function clientFromRefreshToken(refreshToken: string): OAuth2Client {
  const client = makeOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export const calendar = google.calendar("v3");
