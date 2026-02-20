export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
};

export type SessionPayload = {
  token: string;
  user: SessionUser;
};

const TOKEN_KEY = "token";
const USER_KEY = "user";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toSessionUser(value: unknown): SessionUser | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = toString(record.id).trim();
  const email = toString(record.email).trim();
  if (!id || !email) return null;

  return {
    id,
    email,
    fullName: toString(record.fullName),
    phone: toString(record.phone),
    role: toString(record.role),
  };
}

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSession(): SessionPayload | null {
  if (typeof window === "undefined") return null;

  try {
    const tokenRaw = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);

    if (!tokenRaw && !userRaw) return null;
    if (!tokenRaw || !userRaw) {
      clearStorage();
      return null;
    }

    const token = tokenRaw.trim();
    if (!token) {
      clearStorage();
      return null;
    }

    let parsedUser: unknown;
    try {
      parsedUser = JSON.parse(userRaw);
    } catch {
      clearStorage();
      return null;
    }

    const user = toSessionUser(parsedUser);
    if (!user) {
      clearStorage();
      return null;
    }

    return { token, user };
  } catch {
    return null;
  }
}

export function saveSession(input: { token: unknown; user: unknown }): {
  ok: boolean;
  error?: string;
} {
  if (typeof window === "undefined") return { ok: false, error: "No browser session available" };

  const token = typeof input.token === "string" ? input.token.trim() : "";
  const user = toSessionUser(input.user);

  if (!token || !user) {
    clearStorage();
    return { ok: false, error: "Invalid login response data" };
  }

  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return { ok: true };
  } catch (error: unknown) {
    clearStorage();
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, error: "Browser storage is full. Clear site data and sign in again." };
    }
    return { ok: false, error: "Failed to persist session in browser storage" };
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    clearStorage();
  } catch {
    // ignore
  }
}
