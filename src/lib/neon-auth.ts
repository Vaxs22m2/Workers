type NeonAuthResult = {
  ok: boolean;
  status: number;
  error?: string;
  token?: string;
  data?: unknown;
};

type NeonEmailAuthInput = {
  email: string;
  password: string;
  origin: string;
  name?: string;
};

const DEFAULT_NEON_AUTH_URL =
  "https://ep-rough-pond-ajxkpqk6.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth";

function authUrlFromJwks(jwksUrl: string | undefined): string | undefined {
  const trimmed = jwksUrl?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "").replace(/\/\.well-known\/jwks\.json$/, "");
}

function getNeonAuthUrl(): string {
  const fromJwks =
    authUrlFromJwks(process.env.NEON_JWKS_URL) || authUrlFromJwks(process.env.JWKS_URL);

  const baseUrl =
    process.env.NEON_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_NEON_AUTH_URL?.trim() ||
    fromJwks ||
    process.env.AUTH_URL?.trim() ||
    DEFAULT_NEON_AUTH_URL;

  if (!baseUrl) {
    throw new Error(
      "Missing auth URL env var. Set NEON_AUTH_URL (or NEON_JWKS_URL / AUTH_URL)."
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractString(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return value;
}

function extractError(payload: unknown, fallback: string): string {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;

  const record = asRecord(payload);
  if (!record) return fallback;

  const error = extractString(record.error);
  if (error) return error;

  const message = extractString(record.message);
  if (message) return message;

  const nestedError = asRecord(record.error);
  const nestedMessage = nestedError ? extractString(nestedError.message) : undefined;
  if (nestedMessage) return nestedMessage;

  if (Array.isArray(record.details)) {
    const firstDetail = asRecord(record.details[0]);
    const detailMessage = firstDetail ? extractString(firstDetail.message) : undefined;
    if (detailMessage) return detailMessage;
  }

  return fallback;
}

function extractToken(payload: unknown): string | undefined {
  const root = asRecord(payload);
  if (!root) return undefined;

  const session = asRecord(root.session);
  const data = asRecord(root.data);
  const dataSession = data ? asRecord(data.session) : null;

  const candidates = [
    root.token,
    root.sessionToken,
    session?.token,
    data?.token,
    data?.sessionToken,
    dataSession?.token,
  ];

  for (const candidate of candidates) {
    const token = extractString(candidate);
    if (token) return token;
  }

  return undefined;
}

function extractTokenFromSetCookie(setCookieHeader: string | null): string | undefined {
  if (!setCookieHeader) return undefined;
  const match = setCookieHeader.match(
    /(?:__Secure-)?better-auth\.session_token=([^;,\s]+)/
  );
  if (!match) return undefined;
  return decodeURIComponent(match[1]);
}

async function callNeon(path: string, body: Record<string, unknown>, origin: string) {
  const authUrl = getNeonAuthUrl();
  const response = await fetch(`${authUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  const token =
    extractToken(data) ?? extractTokenFromSetCookie(response.headers.get("set-cookie"));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: extractError(data, "Authentication request failed"),
    };
  }

  return {
    ok: true,
    status: response.status,
    token,
    data,
  };
}

export async function neonSignUpEmail(input: NeonEmailAuthInput): Promise<NeonAuthResult> {
  return callNeon(
    "/sign-up/email",
    {
      email: input.email,
      password: input.password,
      name: input.name || input.email,
    },
    input.origin
  );
}

export async function neonSignInEmail(input: NeonEmailAuthInput): Promise<NeonAuthResult> {
  return callNeon(
    "/sign-in/email",
    {
      email: input.email,
      password: input.password,
    },
    input.origin
  );
}
