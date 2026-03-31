import { NextRequest } from "next/server";

function normalizeOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return undefined;
  return trimmed.replace(/\/+$/, "");
}

function ensureOriginWithProtocol(value: string | undefined): string | undefined {
  const normalized = normalizeOrigin(value);
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

export function resolveAuthOrigin(request: NextRequest): string | undefined {
  // Explicit override when you need to force one fixed trusted origin.
  const explicitOrigin = ensureOriginWithProtocol(process.env.NEON_AUTH_ORIGIN?.trim());
  if (explicitOrigin) return explicitOrigin;

  const headerOrigin = normalizeOrigin(request.headers.get("origin") || undefined);
  if (headerOrigin) return headerOrigin;

  const requestOrigin = normalizeOrigin(request.nextUrl?.origin);
  if (requestOrigin) return requestOrigin;

  const configuredFallback = ensureOriginWithProtocol(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
      process.env.VERCEL_URL?.trim()
  );
  if (configuredFallback) return configuredFallback;

  const host = request.headers.get("host")?.trim();
  if (!host) return undefined;

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  const proto =
    forwardedProto ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return normalizeOrigin(`${proto}://${host}`);
}
