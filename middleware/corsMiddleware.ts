import { getAllowedOriginsSet, getTenantAllowedOrigins } from "../utils/tenantSettingsCache";

const ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS, PATCH";
const ALLOWED_HEADERS = "Content-Type, Authorization, x-tenant-id, X-API-Version";

/**
 * Resolves the Access-Control-Allow-Origin value for a given request.
 * Returns the origin string to echo back, or null if not allowed.
 *
 * Pass tenantId when available (authenticated requests) to also enforce
 * that the origin belongs to that specific tenant.
 */
/** localhost and 127.0.0.1 on any port are always allowed (local development). */
function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function resolveAllowedOrigin(
  origin: string | null,
  tenantId?: string
): Promise<string | null> {
  if (!origin) return null;

  // Always allow localhost — no production risk, avoids dev friction
  if (isLocalOrigin(origin)) return origin;

  const globalSet = await getAllowedOriginsSet();
  if (!globalSet.has(origin)) return null;

  // Extra check for authenticated requests: verify origin is in THAT tenant's list
  if (tenantId) {
    const baseOrigins = (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    // Base env origins are always fine regardless of tenant
    if (baseOrigins.includes(origin)) return origin;

    const tenantOrigins = await getTenantAllowedOrigins(tenantId);
    if (!tenantOrigins.has(origin)) return null;
  }

  return origin;
}

/**
 * Builds CORS response headers for a given (already-validated) origin.
 * Pass null to omit Access-Control-Allow-Origin entirely.
 */
export function buildCorsHeaders(allowedOrigin: string | null): Record<string, string> {
  if (!allowedOrigin) {
    return {
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    };
  }
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Vary": "Origin",
  };
}

/**
 * Adds CORS headers to an existing Response.
 */
export function applyCorsHeaders(res: Response, allowedOrigin: string | null): Response {
  const headers = buildCorsHeaders(allowedOrigin);
  const newHeaders = new Headers(res.headers);
  for (const [k, v] of Object.entries(headers)) {
    newHeaders.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}
