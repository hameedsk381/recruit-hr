# Marketplace Backend — Design Spec

**Date:** 2026-04-16  
**Status:** Approved

---

## Goal

Replace the hardcoded integration list in `Marketplace.tsx` with a real backend: a static integration registry in code, per-tenant connection state in MongoDB, encrypted credential storage, connect/disconnect API, and agency/RPO mode routes.

---

## Architecture

**Registry** (`services/integrationRegistry.ts`) — static TypeScript map of all supported integrations with their metadata and credential field schema. Never stored in DB — it's code. No DB query needed to list integrations.

**State** (`tenant_integrations` collection) — per-tenant connection records. Only exists when a tenant has connected (or disconnected) an integration. Credentials encrypted with AES-256-GCM before storage.

**Service** (`services/integrationService.ts`) — encrypt/decrypt credentials, CRUD on `tenant_integrations`, merge registry metadata with live state for API responses.

**Routes** (`routes/v1/integrations.ts`) — 4 endpoints.

**Agency routes** (`routes/v1/agency.ts`) — 3 endpoints wired into `index.ts`.

---

## Integration Registry

```typescript
// services/integrationRegistry.ts
export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: "ATS" | "HRIS" | "Communication" | "BGV" | "E-Sign" | "Calendar" | "Assessment" | "Other";
  credentialFields: CredentialField[];   // schema for connect modal
  docsUrl: string;
}

export interface CredentialField {
  key: string;           // e.g. "apiKey"
  label: string;         // e.g. "API Key"
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}
```

Registry contains: LinkedIn, Indeed, Naukri, Glassdoor, DocuSign, Adobe Sign, AuthBridge, Checkr, IDfy, Sterling, Greenhouse, Lever, Workday, BambooHR, Zoho, Darwinbox, Google Calendar, Outlook, Slack, Teams, Resend, Twilio, HackerRank, Codility.

---

## Data Model

### TenantIntegration (collection: `tenant_integrations`)
```typescript
interface TenantIntegration {
  _id: ObjectId;
  tenantId: string;
  integrationId: string;            // matches registry key
  status: "connected" | "disconnected";
  encryptedCredentials: string;     // AES-256-GCM encrypted JSON
  connectedAt: Date;
  connectedBy: string;              // userId
  updatedAt: Date;
}
```

---

## Encryption

```typescript
// In services/integrationService.ts
// Uses Node crypto: AES-256-GCM, random IV per encryption
// Key: process.env.INTEGRATION_ENCRYPTION_KEY (32 bytes hex)
// Format stored: base64(iv + authTag + ciphertext)

function encryptCredentials(credentials: Record<string, string>): string
function decryptCredentials(encrypted: string): Record<string, string>
```

Credentials are **never returned in API responses** — only their existence is confirmed.

---

## API Endpoints (`routes/v1/integrations.ts`)

```
GET    /v1/integrations
  → Array of all registry integrations merged with this tenant's connection status
  → { id, name, category, description, status, connectedAt? }[]
  → No credentials in response

POST   /v1/integrations/:id/connect
  → Body: { credentials: Record<string, string> }
  → Validates all required fields from registry schema
  → Encrypts and upserts to tenant_integrations
  → Returns { success: true, integration: { id, status: "connected", connectedAt } }

DELETE /v1/integrations/:id
  → Sets status: "disconnected", wipes encryptedCredentials
  → Returns { success: true }

GET    /v1/integrations/:id/status
  → Returns { id, status, connectedAt? } — live from DB, no credentials
```

---

## Agency Routes (`routes/v1/agency.ts`)

Thin CRUD on top of `services/agencyService.ts` (already implemented):

```
GET    /v1/agency/clients           — list client tenants for this agency
POST   /v1/agency/clients           — add a client tenant (body: { tenantId, name })
DELETE /v1/agency/clients/:tenantId — remove client tenant
```

Auth: all agency routes require `ROLES.ADMIN` and the tenant must have `isAgency: true` in their settings.

---

## Frontend Changes (`Marketplace.tsx`)

1. **Replace hardcoded `INTEGRATIONS` array** with `useEffect` fetch from `GET /v1/integrations`
2. **Connect modal** — when user clicks "Connect", open a modal with the integration's `credentialFields` rendered as form inputs. On submit: `POST /v1/integrations/:id/connect`
3. **Disconnect** — confirmation dialog, calls `DELETE /v1/integrations/:id`
4. **Status badge** — derived from API response, not hardcoded

No OAuth flows — all integrations use API key / webhook secret credentials entered manually (consistent with Option B decision).

---

## Error Handling

- Missing required credential field → 400 with field name
- Unknown integrationId → 404
- Decrypt failure → 500 (log only, never expose key material)
- Agency routes called by non-agency tenant → 403
