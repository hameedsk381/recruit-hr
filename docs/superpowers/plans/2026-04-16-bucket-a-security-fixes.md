# Bucket A Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four security gaps in the existing API server: per-tenant CORS origin allowlist, security response headers, webhook HMAC verification, and request body size limits.

**Architecture:** Four new focused middleware files are created, each with one responsibility. `index.ts` is wired to call them in the request pipeline — CORS and size limits early (before routing), security headers in `finalHandler`, and HMAC verification inline before delegating to webhook route handlers.

**Tech Stack:** Bun runtime, TypeScript, `redis` (node-redis) for cache, `crypto` (Node built-in) for HMAC, MongoDB (`tenants` collection) for per-tenant origin config.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `utils/tenantSettingsCache.ts` | Redis-cached global + per-tenant allowed origins |
| Create | `middleware/corsMiddleware.ts` | Resolve allowed origin from request, build CORS headers |
| Create | `middleware/securityHeaders.ts` | Add HSTS, CSP, X-Frame-Options etc. to any Response |
| Create | `middleware/webhookAuth.ts` | HMAC-SHA256 verification per provider, body reconstruction |
| Modify | `index.ts` | Wire all four middleware into the request pipeline |
| Create | `tests/security.test.ts` | Integration tests for the four fixes |

---

## Task 1: Tenant Origins Cache (`utils/tenantSettingsCache.ts`)

**Files:**
- Create: `utils/tenantSettingsCache.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/security.test.ts`:

```typescript
import { expect, test, describe } from "bun:test";

const BASE_URL = "http://localhost:3001";

describe("Security: CORS", () => {
  test("allowed origin returns mirrored Access-Control-Allow-Origin", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`, {
      headers: { Origin: "https://app.reckruit.ai" },
    });
    // env fallback origin must be allowed
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.reckruit.ai");
  });

  test("unknown origin gets null Access-Control-Allow-Origin", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`, {
      headers: { Origin: "https://evil.example.com" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  test("OPTIONS preflight from allowed origin returns 204", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`, {
      method: "OPTIONS",
      headers: { Origin: "https://app.reckruit.ai" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://app.reckruit.ai");
  });
});

describe("Security: Headers", () => {
  test("every response includes HSTS header", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`);
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  test("every response includes X-Frame-Options: DENY", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  test("every response includes X-Content-Type-Options: nosniff", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});

describe("Security: Request Size Limits", () => {
  test("POST body over 1MB to non-upload endpoint returns 413", async () => {
    const bigBody = "x".repeat(1.1 * 1024 * 1024);
    const res = await fetch(`${BASE_URL}/v1/assess-candidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(bigBody.length),
        Authorization: "Bearer test",
      },
      body: bigBody,
    });
    expect(res.status).toBe(413);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/cognitbotz/recruit-hr && bun test tests/security.test.ts 2>&1 | head -40
```

Expected: CORS test fails (currently returns `*`), header tests fail (no HSTS/X-Frame-Options), size test fails (currently no limit).

- [ ] **Step 3: Create `utils/tenantSettingsCache.ts`**

```typescript
import { getMongoDb } from "./mongoClient";
import { getRedisClient } from "./redisClient";

const CACHE_KEY = "global:allowed_origins";
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * Returns the set of all allowed origins across every tenant + env-var base domains.
 * Result is cached in Redis for 5 minutes.
 */
export async function getAllowedOriginsSet(): Promise<Set<string>> {
  // 1. Try Redis cache
  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(CACHE_KEY);
      if (cached) return new Set(JSON.parse(cached));
    } catch {
      // cache miss — continue to DB
    }
  }

  // 2. Seed with env-var base domains (always allowed)
  const baseOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const allOrigins = new Set<string>(baseOrigins);

  // 3. Pull per-tenant allowlists from MongoDB
  try {
    const db = getMongoDb();
    const tenants = await db
      .collection("tenants")
      .find(
        { allowedOrigins: { $exists: true, $ne: [] } },
        { projection: { allowedOrigins: 1 } }
      )
      .toArray();

    for (const t of tenants) {
      if (Array.isArray(t.allowedOrigins)) {
        for (const origin of t.allowedOrigins) {
          if (typeof origin === "string" && origin.startsWith("http")) {
            allOrigins.add(origin);
          }
        }
      }
    }
  } catch (err) {
    console.error("[CorsCache] Failed to load tenant origins from DB:", err);
  }

  // 4. Write to Redis
  if (client) {
    try {
      await client.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify([...allOrigins]));
    } catch {
      // non-fatal
    }
  }

  return allOrigins;
}

/**
 * Returns the allowed origins for a single tenant (bypasses global cache).
 */
export async function getTenantAllowedOrigins(tenantId: string): Promise<Set<string>> {
  try {
    const db = getMongoDb();
    const tenant = await db.collection("tenants").findOne({ tenantId }, { projection: { allowedOrigins: 1 } });
    const origins: string[] = Array.isArray(tenant?.allowedOrigins) ? tenant.allowedOrigins : [];
    return new Set(origins);
  } catch {
    return new Set();
  }
}

/**
 * Force-invalidates the global origins cache (call after tenant settings update).
 */
export async function invalidateOriginsCache(): Promise<void> {
  const client = getRedisClient();
  if (client) {
    try {
      await client.del(CACHE_KEY);
    } catch {
      // non-fatal
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add utils/tenantSettingsCache.ts tests/security.test.ts && git commit -m "feat: add tenant origins cache and security test scaffold"
```

---

## Task 2: CORS Middleware (`middleware/corsMiddleware.ts`)

**Files:**
- Create: `middleware/corsMiddleware.ts`

- [ ] **Step 1: Create `middleware/corsMiddleware.ts`**

```typescript
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
export async function resolveAllowedOrigin(
  origin: string | null,
  tenantId?: string
): Promise<string | null> {
  if (!origin) return null;

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
```

- [ ] **Step 2: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add middleware/corsMiddleware.ts && git commit -m "feat: add per-tenant CORS middleware"
```

---

## Task 3: Security Headers (`middleware/securityHeaders.ts`)

**Files:**
- Create: `middleware/securityHeaders.ts`

- [ ] **Step 1: Create `middleware/securityHeaders.ts`**

```typescript
const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

/**
 * Returns a new Response with all security headers applied.
 */
export function addSecurityHeaders(res: Response): Response {
  const newHeaders = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(k, v);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: newHeaders,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add middleware/securityHeaders.ts && git commit -m "feat: add security response headers middleware"
```

---

## Task 4: Webhook HMAC Auth (`middleware/webhookAuth.ts`)

**Files:**
- Create: `middleware/webhookAuth.ts`

- [ ] **Step 1: Create `middleware/webhookAuth.ts`**

```typescript
import { createHmac, timingSafeEqual } from "crypto";

export type WebhookProvider = "docusign" | "bgv" | "outreach" | "video";

interface WebhookProviderConfig {
  /** The request header that carries the signature */
  signatureHeader: string;
  /** The env var name holding the shared secret */
  secretEnvVar: string;
  /**
   * Extract the raw hex/base64 digest from the header value.
   * DocuSign sends "sha256=<hex>"; Resend sends "v1,<base64>"; others send raw hex.
   */
  extractDigest: (headerValue: string) => string;
  /** Algorithm used: "hex" or "base64" */
  encoding: "hex" | "base64";
}

const PROVIDER_CONFIG: Record<WebhookProvider, WebhookProviderConfig> = {
  docusign: {
    signatureHeader: "x-docusign-signature-1",
    secretEnvVar: "DOCUSIGN_WEBHOOK_SECRET",
    extractDigest: (v) => v, // raw base64
    encoding: "base64",
  },
  bgv: {
    signatureHeader: "x-webhook-signature",
    secretEnvVar: "BGV_WEBHOOK_SECRET",
    extractDigest: (v) => v.replace(/^sha256=/, ""),
    encoding: "hex",
  },
  outreach: {
    signatureHeader: "svix-signature",
    secretEnvVar: "RESEND_WEBHOOK_SECRET",
    // Resend sends "v1,<base64>" — take everything after the first comma
    extractDigest: (v) => v.split(",").slice(1).join(","),
    encoding: "base64",
  },
  video: {
    signatureHeader: "x-webhook-signature",
    secretEnvVar: "VIDEO_WEBHOOK_SECRET",
    extractDigest: (v) => v.replace(/^sha256=/, ""),
    encoding: "hex",
  },
};

/**
 * Verifies the HMAC-SHA256 signature for a webhook request.
 *
 * Reads the request body to compute the HMAC. Returns the raw body string
 * so the caller can reconstruct the Request for downstream handlers.
 *
 * @returns { valid: boolean; rawBody: string }
 */
export async function verifyWebhookSignature(
  req: Request,
  provider: WebhookProvider
): Promise<{ valid: boolean; rawBody: string }> {
  const config = PROVIDER_CONFIG[provider];
  const secret = process.env[config.secretEnvVar];

  // If no secret is configured, skip verification (dev mode)
  if (!secret) {
    console.warn(`[WebhookAuth] ${config.secretEnvVar} not set — skipping HMAC check for ${provider}`);
    const rawBody = await req.text();
    return { valid: true, rawBody };
  }

  const signatureHeader = req.headers.get(config.signatureHeader);
  if (!signatureHeader) {
    const rawBody = await req.text();
    console.warn(`[WebhookAuth] Missing signature header '${config.signatureHeader}' for ${provider}`);
    return { valid: false, rawBody };
  }

  const rawBody = await req.text();
  const expectedDigest = config.extractDigest(signatureHeader);
  const hmac = createHmac("sha256", secret).update(rawBody).digest(config.encoding);

  let valid: boolean;
  try {
    valid = timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedDigest));
  } catch {
    // Buffer lengths differ — signature is definitely wrong
    valid = false;
  }

  if (!valid) {
    console.warn(`[WebhookAuth] HMAC mismatch for ${provider}`);
  }

  return { valid, rawBody };
}

/**
 * Reconstructs a Request with the same body after it has been consumed by verifyWebhookSignature.
 */
export function reconstructRequest(original: Request, rawBody: string): Request {
  return new Request(original.url, {
    method: original.method,
    headers: original.headers,
    body: rawBody,
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add middleware/webhookAuth.ts && git commit -m "feat: add HMAC webhook signature verification middleware"
```

---

## Task 5: Wire Everything into `index.ts`

**Files:**
- Modify: `index.ts`

- [ ] **Step 1: Add imports at the top of `index.ts`**

Find the existing import block and add after the `auditMiddleware` import (around line 57):

```typescript
import { resolveAllowedOrigin, applyCorsHeaders, buildCorsHeaders } from "./middleware/corsMiddleware";
import { addSecurityHeaders } from "./middleware/securityHeaders";
import { verifyWebhookSignature, reconstructRequest } from "./middleware/webhookAuth";
```

- [ ] **Step 2: Remove the static `corsHeaders` constant**

Find and delete these lines (around line 125–129):

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id, X-API-Version",
};
```

- [ ] **Step 3: Add request size limit helper**

Add this function directly after `logRequest` (around line 136):

```typescript
/**
 * Returns a 413 Response if Content-Length exceeds the allowed limit, otherwise null.
 * File-upload endpoints allow 10 MB; all others allow 1 MB.
 */
function checkRequestSize(req: Request, normalizedPath: string): Response | null {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return null;

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (!contentLength) return null;

  const FILE_UPLOAD_PATHS = [
    "/extract-resume",
    "/extract-jd",
    "/extract-jd-new",
    "/extract-jd-streaming",
    "/knowledge/ingest",
  ];

  const isFileUpload = FILE_UPLOAD_PATHS.includes(normalizedPath);
  const maxBytes = isFileUpload ? 10 * 1024 * 1024 : 1 * 1024 * 1024;

  if (contentLength > maxBytes) {
    const limit = isFileUpload ? "10MB" : "1MB";
    return Response.json(
      {
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Request body exceeds the ${limit} limit for this endpoint.`,
          requestId: crypto.randomUUID(),
        },
      },
      { status: 413 }
    );
  }

  return null;
}
```

- [ ] **Step 4: Replace the OPTIONS preflight handler**

Find the existing OPTIONS block (around line 166–169):

```typescript
if (req.method === "OPTIONS") {
  logRequest(req, startTime, 204);
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

Replace with:

```typescript
if (req.method === "OPTIONS") {
  const origin = req.headers.get("origin");
  const allowedOrigin = await resolveAllowedOrigin(origin);
  const headers = buildCorsHeaders(allowedOrigin);
  logRequest(req, startTime, 204);
  return new Response(null, { status: 204, headers });
}
```

- [ ] **Step 5: Add size limit check after OPTIONS block**

After the OPTIONS block (before the `isVersioned` line), add:

```typescript
// Request size guard (before body is read)
const sizeError = checkRequestSize(req, url.pathname.startsWith("/v1/") ? url.pathname.slice(3) : url.pathname);
if (sizeError) {
  logRequest(req, startTime, 413);
  return sizeError;
}
```

- [ ] **Step 6: Replace the static `addCors` closure with dynamic CORS**

Find the `addCors` closure inside the `fetch` handler (around line 188–192):

```typescript
const addCors = (res: Response) => {
  const newHeaders = new Headers(res.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: newHeaders });
};
```

Replace with:

```typescript
const requestOrigin = req.headers.get("origin");
const allowedOrigin = await resolveAllowedOrigin(requestOrigin, context?.tenantId);
const addCors = (res: Response) => applyCorsHeaders(res, allowedOrigin);
```

Note: `context` may be `null` here for public routes — `resolveAllowedOrigin` handles `undefined` tenantId gracefully.

- [ ] **Step 7: Add `addSecurityHeaders` to `finalHandler`**

Find the `finalHandler` closure (around line 204–211):

```typescript
const finalHandler = async (res: Response) => {
  const finishedRes = addVersionHeaders(addCors(res));
  if (context) {
    auditMiddleware(req, context, finishedRes.status).catch(e => console.error('[Audit] Logging error:', e));
  }
  return finishedRes;
};
```

Replace with:

```typescript
const finalHandler = async (res: Response) => {
  const finishedRes = addSecurityHeaders(addVersionHeaders(addCors(res)));
  if (context) {
    auditMiddleware(req, context, finishedRes.status).catch(e => console.error('[Audit] Logging error:', e));
  }
  return finishedRes;
};
```

- [ ] **Step 8: Add HMAC verification before each webhook handler**

Find the four webhook dispatch blocks and wrap them. Replace each with the pattern below.

**`/webhooks/esign`** — find:
```typescript
if (req.method === "POST" && normalizedPath === "/webhooks/esign") {
  const r = await esignWebhookHandler(req); logRequest(req, startTime, r.status); return finalHandler(r);
}
```
Replace with:
```typescript
if (req.method === "POST" && normalizedPath === "/webhooks/esign") {
  const { valid, rawBody } = await verifyWebhookSignature(req, "docusign");
  if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
  const r = await esignWebhookHandler(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
}
```

**`/webhooks/bgv` and `/bgv/webhook`** — find:
```typescript
if (req.method === "POST" && (normalizedPath === "/bgv/webhook" || normalizedPath === "/webhooks/bgv")) {
  const r = await bgvWebhookHandler(req); logRequest(req, startTime, r.status); return finalHandler(r);
}
```
Replace with:
```typescript
if (req.method === "POST" && (normalizedPath === "/bgv/webhook" || normalizedPath === "/webhooks/bgv")) {
  const { valid, rawBody } = await verifyWebhookSignature(req, "bgv");
  if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
  const r = await bgvWebhookHandler(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
}
```

**`/webhooks/video`** — find:
```typescript
if (req.method === "POST" && normalizedPath === "/webhooks/video") {
  const r = await videoWebhookHandler(req); logRequest(req, startTime, r.status); return finalHandler(r);
}
```
Replace with:
```typescript
if (req.method === "POST" && normalizedPath === "/webhooks/video") {
  const { valid, rawBody } = await verifyWebhookSignature(req, "video");
  if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
  const r = await videoWebhookHandler(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
}
```

**`/webhooks/outreach`** — find:
```typescript
if (req.method === "POST" && (normalizedPath === "/webhooks/outreach" || normalizedPath === "/webhooks/outreach/tracking")) {
  const r = await outreachTrackingWebhook(req); logRequest(req, startTime, r.status); return finalHandler(r);
}
```
Replace with:
```typescript
if (req.method === "POST" && (normalizedPath === "/webhooks/outreach" || normalizedPath === "/webhooks/outreach/tracking")) {
  const { valid, rawBody } = await verifyWebhookSignature(req, "outreach");
  if (!valid) { logRequest(req, startTime, 401); return finalHandler(Response.json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed", requestId: crypto.randomUUID() } }, { status: 401 })); }
  const r = await outreachTrackingWebhook(reconstructRequest(req, rawBody)); logRequest(req, startTime, r.status); return finalHandler(r);
}
```

- [ ] **Step 9: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add index.ts && git commit -m "feat: wire CORS, security headers, HMAC verification, and size limits into request pipeline"
```

---

## Task 6: Invalidate Origins Cache on Tenant Settings Update

**Files:**
- Modify: `routes/tenantSettings.ts`

When a tenant updates their `allowedOrigins`, the Redis cache must be invalidated so the new origins take effect within seconds rather than waiting for the 5-minute TTL.

- [ ] **Step 1: Add `allowedOrigins` field to the update handler**

Open `routes/tenantSettings.ts`. Find `updateTenantSettingsHandler`. Add `allowedOrigins` to the destructured body and `$set`:

```typescript
import { invalidateOriginsCache } from "../utils/tenantSettingsCache";

// inside updateTenantSettingsHandler, find the body destructure:
const { slackWebhookUrl, teamsWebhookUrl, notificationsEnabled } = body;

// Replace with:
const { slackWebhookUrl, teamsWebhookUrl, notificationsEnabled, allowedOrigins } = body;
```

Then in the `$set` object, add `allowedOrigins`:

```typescript
$set: {
  slackWebhookUrl,
  teamsWebhookUrl,
  notificationsEnabled,
  allowedOrigins: Array.isArray(allowedOrigins) ? allowedOrigins : undefined,
  updatedAt: new Date(),
},
```

After the `updateOne` call, add:

```typescript
// Invalidate origin cache so new origins take effect immediately
await invalidateOriginsCache();
```

- [ ] **Step 2: Commit**

```bash
cd /home/cognitbotz/recruit-hr && git add routes/tenantSettings.ts && git commit -m "feat: invalidate CORS origins cache when tenant settings are updated"
```

---

## Task 7: Run Full Test Suite

- [ ] **Step 1: Start the dev server (separate terminal)**

```bash
cd /home/cognitbotz/recruit-hr && bun run dev
```

- [ ] **Step 2: Run security tests**

```bash
cd /home/cognitbotz/recruit-hr && bun test tests/security.test.ts 2>&1
```

Expected output:
```
✓ Security: CORS > allowed origin returns mirrored Access-Control-Allow-Origin
✓ Security: CORS > unknown origin gets null Access-Control-Allow-Origin
✓ Security: CORS > OPTIONS preflight from allowed origin returns 204
✓ Security: Headers > every response includes HSTS header
✓ Security: Headers > every response includes X-Frame-Options: DENY
✓ Security: Headers > every response includes X-Content-Type-Options: nosniff
✓ Security: Request Size Limits > POST body over 1MB to non-upload endpoint returns 413
7 pass, 0 fail
```

- [ ] **Step 3: Run full existing test suite to check for regressions**

```bash
cd /home/cognitbotz/recruit-hr && bun test tests/versioning.test.ts 2>&1
```

Expected: all versioning tests still pass.

- [ ] **Step 4: Set `ALLOWED_ORIGINS` in `.env` if not already present**

Open `.env` and confirm or add:

```
ALLOWED_ORIGINS=https://app.reckruit.ai,https://staging.reckruit.ai
```

(This is the env-var fallback; actual per-tenant origins are stored in MongoDB.)

- [ ] **Step 5: Final commit**

```bash
cd /home/cognitbotz/recruit-hr && git add . && git commit -m "feat(security): bucket A complete — CORS per-tenant, security headers, HMAC webhooks, size limits"
```

---

## Self-Review Checklist

- **Spec coverage:**
  - CORS wildcard → Tasks 1–2 + Task 5 Steps 4, 6 ✅
  - Security headers → Task 3 + Task 5 Step 7 ✅
  - Webhook HMAC → Task 4 + Task 5 Step 8 ✅
  - Request size limits → Task 5 Steps 3, 5 ✅
  - Cache invalidation on settings update → Task 6 ✅

- **Placeholder scan:** No TBDs, no "handle edge cases" without code. All four webhook providers have explicit config. ✅

- **Type consistency:** `resolveAllowedOrigin`, `applyCorsHeaders`, `buildCorsHeaders` are defined in Task 2 and used in Task 5 Steps 4 and 6. `verifyWebhookSignature` and `reconstructRequest` defined in Task 4 and used in Task 5 Step 8. `invalidateOriginsCache` defined in Task 1 and used in Task 6. ✅

- **HMAC dev mode:** `verifyWebhookSignature` skips verification when the env secret is not set — no broken local dev. ✅

- **`context` null safety:** `resolveAllowedOrigin(requestOrigin, context?.tenantId)` — optional chaining handles unauthenticated requests. ✅
