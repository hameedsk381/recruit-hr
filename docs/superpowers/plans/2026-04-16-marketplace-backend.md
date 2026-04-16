# Marketplace Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `INTEGRATIONS` array in `Marketplace.tsx` with a real backend: static integration registry in code, per-tenant connection state in MongoDB with AES-256-GCM encrypted credentials, connect/disconnect API, and agency/RPO mode routes.

**Architecture:** Static `integrationRegistry.ts` map (never DB) holds metadata + credential schemas. `integrationService.ts` handles encrypt/decrypt and CRUD on `tenant_integrations` collection. Four REST endpoints in `routes/v1/integrations.ts`. Three agency endpoints in `routes/v1/agency.ts`. Frontend fetches live data and renders connect/disconnect modals.

**Tech Stack:** Bun, TypeScript, MongoDB (via `utils/mongoClient`), Node `crypto` (AES-256-GCM), existing `middleware/authMiddleware`, `utils/permissions` ROLES.

---

### Task 1: Integration Registry

**Files:**
- Create: `services/integrationRegistry.ts`

- [ ] **Step 1: Create the registry file**

```typescript
// services/integrationRegistry.ts

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: "ATS" | "HRIS" | "Communication" | "BGV" | "E-Sign" | "Calendar" | "Assessment" | "Other";
  credentialFields: CredentialField[];
  docsUrl: string;
}

export const INTEGRATION_REGISTRY: Record<string, IntegrationDefinition> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn Jobs",
    description: "Post jobs directly and sync applicants in real-time.",
    category: "ATS",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Your LinkedIn app client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Your LinkedIn app client secret" },
      { key: "organizationId", label: "Organization ID", type: "text", required: true, placeholder: "LinkedIn organization URN ID" },
    ],
    docsUrl: "https://developer.linkedin.com/docs/guide/v2/jobs",
  },
  indeed: {
    id: "indeed",
    name: "Indeed",
    description: "Publish jobs to Indeed and import applicants automatically.",
    category: "ATS",
    credentialFields: [
      { key: "publisherId", label: "Publisher ID", type: "text", required: true, placeholder: "Indeed publisher ID" },
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Indeed API key" },
    ],
    docsUrl: "https://opensource.indeedeng.io/api-documentation/docs/indeed-apply/",
  },
  naukri: {
    id: "naukri",
    name: "Naukri",
    description: "Post jobs on India's largest job portal.",
    category: "ATS",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Naukri client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Naukri client secret" },
    ],
    docsUrl: "https://www.naukri.com/jobseeker/help/api",
  },
  glassdoor: {
    id: "glassdoor",
    name: "Glassdoor",
    description: "Post jobs and monitor employer reviews in one place.",
    category: "ATS",
    credentialFields: [
      { key: "partnerId", label: "Partner ID", type: "text", required: true, placeholder: "Glassdoor partner ID" },
      { key: "partnerKey", label: "Partner Key", type: "password", required: true, placeholder: "Glassdoor partner key" },
    ],
    docsUrl: "https://www.glassdoor.com/developer/index.htm",
  },
  docusign: {
    id: "docusign",
    name: "DocuSign",
    description: "Send offer letters for legally binding electronic signatures.",
    category: "E-Sign",
    credentialFields: [
      { key: "integrationKey", label: "Integration Key", type: "text", required: true, placeholder: "DocuSign integration key (client ID)" },
      { key: "secretKey", label: "Secret Key", type: "password", required: true, placeholder: "DocuSign secret key" },
      { key: "accountId", label: "Account ID", type: "text", required: true, placeholder: "DocuSign account GUID" },
      { key: "baseUrl", label: "Base URL", type: "url", required: false, placeholder: "https://na4.docusign.net (leave blank for default)" },
    ],
    docsUrl: "https://developers.docusign.com/docs/esign-rest-api/",
  },
  adobesign: {
    id: "adobesign",
    name: "Adobe Sign",
    description: "Collect e-signatures on offer letters and NDAs.",
    category: "E-Sign",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Adobe Sign application client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Adobe Sign application client secret" },
    ],
    docsUrl: "https://www.adobe.com/go/adobesign-api-overview",
  },
  authbridge: {
    id: "authbridge",
    name: "AuthBridge",
    description: "India's leading background verification and identity service.",
    category: "BGV",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "AuthBridge API key" },
      { key: "clientCode", label: "Client Code", type: "text", required: true, placeholder: "AuthBridge client code" },
    ],
    docsUrl: "https://authbridge.com/developer",
  },
  checkr: {
    id: "checkr",
    name: "Checkr",
    description: "US background checks and continuous criminal monitoring.",
    category: "BGV",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Checkr live API key" },
      { key: "packageSlug", label: "Default Package", type: "text", required: false, placeholder: "tasker_standard (optional default)" },
    ],
    docsUrl: "https://docs.checkr.com/",
  },
  idfy: {
    id: "idfy",
    name: "IDfy",
    description: "Identity verification and employee onboarding checks.",
    category: "BGV",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "IDfy API key" },
      { key: "accountId", label: "Account ID", type: "text", required: true, placeholder: "IDfy account ID" },
    ],
    docsUrl: "https://docs.idfy.io/",
  },
  sterling: {
    id: "sterling",
    name: "Sterling",
    description: "Global background screening and identity verification.",
    category: "BGV",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Sterling client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Sterling client secret" },
    ],
    docsUrl: "https://developer.sterlingcheck.com/",
  },
  greenhouse: {
    id: "greenhouse",
    name: "Greenhouse",
    description: "Two-way ATS sync for applications and pipeline stages.",
    category: "ATS",
    credentialFields: [
      { key: "apiKey", label: "Harvest API Key", type: "password", required: true, placeholder: "Greenhouse Harvest API key" },
      { key: "onBehalfOf", label: "On-Behalf-Of User ID", type: "text", required: false, placeholder: "Greenhouse user ID for auditing" },
    ],
    docsUrl: "https://developers.greenhouse.io/harvest.html",
  },
  lever: {
    id: "lever",
    name: "Lever",
    description: "Sync candidates and opportunities with Lever ATS.",
    category: "ATS",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Lever API key" },
    ],
    docsUrl: "https://hire.lever.co/developer/documentation",
  },
  workday: {
    id: "workday",
    name: "Workday",
    description: "Sync hire data and employee profiles with your HRIS.",
    category: "HRIS",
    credentialFields: [
      { key: "tenantName", label: "Tenant Name", type: "text", required: true, placeholder: "e.g. mycompany_preview1" },
      { key: "username", label: "Integration System Username", type: "text", required: true, placeholder: "ISU username" },
      { key: "password", label: "Integration System Password", type: "password", required: true, placeholder: "ISU password" },
    ],
    docsUrl: "https://developer.workday.com/",
  },
  bamboohr: {
    id: "bamboohr",
    name: "BambooHR",
    description: "Employee records, PTO, and onboarding sync.",
    category: "HRIS",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "BambooHR API key" },
      { key: "subdomain", label: "Company Subdomain", type: "text", required: true, placeholder: "yourcompany" },
    ],
    docsUrl: "https://documentation.bamboohr.com/reference/",
  },
  zoho: {
    id: "zoho",
    name: "Zoho People",
    description: "HR module sync for employee lifecycle management.",
    category: "HRIS",
    credentialFields: [
      { key: "clientId", label: "Client ID", type: "text", required: true, placeholder: "Zoho OAuth client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true, placeholder: "Zoho OAuth client secret" },
      { key: "refreshToken", label: "Refresh Token", type: "password", required: true, placeholder: "Zoho OAuth refresh token" },
    ],
    docsUrl: "https://www.zoho.com/people/api/overview.html",
  },
  darwinbox: {
    id: "darwinbox",
    name: "Darwinbox",
    description: "South-East Asia HRIS — sync employee and offer data.",
    category: "HRIS",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Darwinbox API key" },
      { key: "subdomain", label: "Domain", type: "url", required: true, placeholder: "https://yourcompany.darwinbox.in" },
    ],
    docsUrl: "https://darwinbox.com/developers",
  },
  googlecalendar: {
    id: "googlecalendar",
    name: "Google Calendar",
    description: "Sync interview schedules and check interviewer availability.",
    category: "Calendar",
    credentialFields: [
      { key: "serviceAccountJson", label: "Service Account JSON", type: "password", required: true, placeholder: "Paste the full service account JSON" },
      { key: "calendarId", label: "Calendar ID", type: "text", required: false, placeholder: "primary (leave blank for primary)" },
    ],
    docsUrl: "https://developers.google.com/calendar/api/guides/overview",
  },
  outlook: {
    id: "outlook",
    name: "Outlook Calendar",
    description: "Microsoft 365 calendar sync for interview scheduling.",
    category: "Calendar",
    credentialFields: [
      { key: "clientId", label: "App Client ID", type: "text", required: true, placeholder: "Azure app registration client ID" },
      { key: "clientSecret", label: "App Client Secret", type: "password", required: true, placeholder: "Azure app registration client secret" },
      { key: "tenantId", label: "Azure Tenant ID", type: "text", required: true, placeholder: "Azure directory tenant ID" },
    ],
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/resources/calendar",
  },
  slack: {
    id: "slack",
    name: "Slack",
    description: "Get notified of new matches and interview approvals.",
    category: "Communication",
    credentialFields: [
      { key: "botToken", label: "Bot Token", type: "password", required: true, placeholder: "xoxb-..." },
      { key: "defaultChannel", label: "Default Channel", type: "text", required: false, placeholder: "#recruiting (optional)" },
    ],
    docsUrl: "https://api.slack.com/start",
  },
  teams: {
    id: "teams",
    name: "Microsoft Teams",
    description: "Send hiring notifications and interview reminders to Teams.",
    category: "Communication",
    credentialFields: [
      { key: "webhookUrl", label: "Incoming Webhook URL", type: "url", required: true, placeholder: "https://xxx.webhook.office.com/..." },
    ],
    docsUrl: "https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/",
  },
  resend: {
    id: "resend",
    name: "Resend",
    description: "Transactional email delivery for candidate communications.",
    category: "Communication",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "re_..." },
      { key: "fromAddress", label: "From Address", type: "text", required: true, placeholder: "hiring@yourcompany.com" },
    ],
    docsUrl: "https://resend.com/docs",
  },
  twilio: {
    id: "twilio",
    name: "Twilio",
    description: "SMS and WhatsApp notifications for interview reminders.",
    category: "Communication",
    credentialFields: [
      { key: "accountSid", label: "Account SID", type: "text", required: true, placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { key: "authToken", label: "Auth Token", type: "password", required: true, placeholder: "Twilio auth token" },
      { key: "fromNumber", label: "From Number", type: "text", required: true, placeholder: "+1234567890" },
    ],
    docsUrl: "https://www.twilio.com/docs",
  },
  hackerrank: {
    id: "hackerrank",
    name: "HackerRank",
    description: "Automated coding assessments for engineering candidates.",
    category: "Assessment",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "HackerRank API key" },
    ],
    docsUrl: "https://www.hackerrank.com/work/support/api",
  },
  codility: {
    id: "codility",
    name: "Codility",
    description: "Technical screening and live coding interview platform.",
    category: "Assessment",
    credentialFields: [
      { key: "apiKey", label: "API Key", type: "password", required: true, placeholder: "Codility API key" },
    ],
    docsUrl: "https://codility.com/api-docs/",
  },
};

export function getIntegration(id: string): IntegrationDefinition | undefined {
  return INTEGRATION_REGISTRY[id];
}

export function getAllIntegrations(): IntegrationDefinition[] {
  return Object.values(INTEGRATION_REGISTRY);
}
```

- [ ] **Step 2: Commit**

```bash
git add services/integrationRegistry.ts
git commit -m "feat: add static integration registry with 24 integrations"
```

---

### Task 2: Integration Service (encrypt/decrypt + CRUD)

**Files:**
- Create: `services/integrationService.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/integrationService.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "bun:test";
import { encryptCredentials, decryptCredentials } from "../services/integrationService";

// Set required env var for tests
process.env.INTEGRATION_ENCRYPTION_KEY = "0".repeat(64); // 32 bytes as hex

describe("credential encryption", () => {
  it("round-trips credentials through encrypt/decrypt", () => {
    const creds = { apiKey: "sk-abc123", clientId: "client-xyz" };
    const encrypted = encryptCredentials(creds);
    expect(typeof encrypted).toBe("string");
    const decrypted = decryptCredentials(encrypted);
    expect(decrypted).toEqual(creds);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const creds = { apiKey: "same-value" };
    const enc1 = encryptCredentials(creds);
    const enc2 = encryptCredentials(creds);
    expect(enc1).not.toBe(enc2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/cognitbotz/recruit-hr && bun test tests/integrationService.test.ts 2>&1 | head -20
```

Expected: FAIL — `encryptCredentials` not found.

- [ ] **Step 3: Implement the service**

```typescript
// services/integrationService.ts
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../utils/mongoClient";
import { getIntegration, IntegrationDefinition } from "./integrationRegistry";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptCredentials(credentials: Record<string, string>): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptCredentials(encryptedBase64: string): Record<string, string> {
  const key = getEncryptionKey();
  const buf = Buffer.from(encryptedBase64, "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const authTag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export interface TenantIntegration {
  _id?: ObjectId;
  tenantId: string;
  integrationId: string;
  status: "connected" | "disconnected";
  encryptedCredentials: string;
  connectedAt: Date;
  connectedBy: string;
  updatedAt: Date;
}

const COLLECTION = "tenant_integrations";

export async function listTenantIntegrations(tenantId: string): Promise<TenantIntegration[]> {
  const db = getMongoDb();
  return db.collection<TenantIntegration>(COLLECTION).find({ tenantId }).toArray();
}

export async function connectIntegration(
  tenantId: string,
  integrationId: string,
  credentials: Record<string, string>,
  userId: string
): Promise<TenantIntegration> {
  const def = getIntegration(integrationId);
  if (!def) throw Object.assign(new Error("Integration not found"), { status: 404 });

  // Validate required fields
  for (const field of def.credentialFields) {
    if (field.required && !credentials[field.key]) {
      throw Object.assign(
        new Error(`Missing required field: ${field.label} (${field.key})`),
        { status: 400, field: field.key }
      );
    }
  }

  const encryptedCredentials = encryptCredentials(credentials);
  const now = new Date();

  const doc: TenantIntegration = {
    tenantId,
    integrationId,
    status: "connected",
    encryptedCredentials,
    connectedAt: now,
    connectedBy: userId,
    updatedAt: now,
  };

  const db = getMongoDb();
  await db.collection<TenantIntegration>(COLLECTION).updateOne(
    { tenantId, integrationId },
    { $set: doc },
    { upsert: true }
  );

  return doc;
}

export async function disconnectIntegration(tenantId: string, integrationId: string): Promise<void> {
  const def = getIntegration(integrationId);
  if (!def) throw Object.assign(new Error("Integration not found"), { status: 404 });

  const db = getMongoDb();
  const result = await db.collection<TenantIntegration>(COLLECTION).updateOne(
    { tenantId, integrationId },
    {
      $set: {
        status: "disconnected",
        encryptedCredentials: "",
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw Object.assign(new Error("Integration not connected"), { status: 404 });
  }
}

export async function getIntegrationStatus(
  tenantId: string,
  integrationId: string
): Promise<{ id: string; status: "connected" | "disconnected" | "not_connected"; connectedAt?: Date }> {
  const def = getIntegration(integrationId);
  if (!def) throw Object.assign(new Error("Integration not found"), { status: 404 });

  const db = getMongoDb();
  const record = await db.collection<TenantIntegration>(COLLECTION).findOne({ tenantId, integrationId });

  if (!record || record.status === "disconnected") {
    return { id: integrationId, status: "not_connected" };
  }

  return { id: integrationId, status: record.status, connectedAt: record.connectedAt };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/cognitbotz/recruit-hr && bun test tests/integrationService.test.ts 2>&1
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add services/integrationService.ts tests/integrationService.test.ts
git commit -m "feat: add integration service with AES-256-GCM credential encryption"
```

---

### Task 3: Integration Routes

**Files:**
- Create: `routes/v1/integrations.ts`

- [ ] **Step 1: Create the route file**

```typescript
// routes/v1/integrations.ts
import { getAllIntegrations, getIntegration } from "../../services/integrationRegistry";
import {
  listTenantIntegrations,
  connectIntegration,
  disconnectIntegration,
  getIntegrationStatus,
} from "../../services/integrationService";

interface AuthContext {
  tenantId: string;
  userId: string;
}

export async function listIntegrationsHandler(req: Request, context: AuthContext): Promise<Response> {
  const allDefs = getAllIntegrations();
  const tenantRecords = await listTenantIntegrations(context.tenantId);

  // Build a lookup: integrationId → record
  const recordMap = new Map(tenantRecords.map((r) => [r.integrationId, r]));

  const result = allDefs.map((def) => {
    const record = recordMap.get(def.id);
    const status =
      record?.status === "connected" ? "connected" : "not_connected";
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      docsUrl: def.docsUrl,
      credentialFields: def.credentialFields,
      status,
      connectedAt: record?.status === "connected" ? record.connectedAt : undefined,
    };
  });

  return Response.json({ success: true, integrations: result });
}

export async function connectIntegrationHandler(req: Request, context: AuthContext, integrationId: string): Promise<Response> {
  const def = getIntegration(integrationId);
  if (!def) {
    return Response.json({ success: false, error: "Integration not found" }, { status: 404 });
  }

  let body: { credentials?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.credentials || typeof body.credentials !== "object") {
    return Response.json({ success: false, error: "credentials object required" }, { status: 400 });
  }

  try {
    const record = await connectIntegration(
      context.tenantId,
      integrationId,
      body.credentials,
      context.userId
    );
    return Response.json({
      success: true,
      integration: { id: integrationId, status: record.status, connectedAt: record.connectedAt },
    });
  } catch (err: any) {
    const status = err.status ?? 500;
    const message = err.message ?? "Internal error";
    console.error("[Integrations] Connect error:", message);
    return Response.json({ success: false, error: message, field: err.field }, { status });
  }
}

export async function disconnectIntegrationHandler(req: Request, context: AuthContext, integrationId: string): Promise<Response> {
  try {
    await disconnectIntegration(context.tenantId, integrationId);
    return Response.json({ success: true });
  } catch (err: any) {
    const status = err.status ?? 500;
    console.error("[Integrations] Disconnect error:", err.message);
    return Response.json({ success: false, error: err.message }, { status });
  }
}

export async function getIntegrationStatusHandler(req: Request, context: AuthContext, integrationId: string): Promise<Response> {
  try {
    const statusData = await getIntegrationStatus(context.tenantId, integrationId);
    return Response.json({ success: true, ...statusData });
  } catch (err: any) {
    const status = err.status ?? 500;
    return Response.json({ success: false, error: err.message }, { status });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add routes/v1/integrations.ts
git commit -m "feat: add /v1/integrations REST endpoints"
```

---

### Task 4: Agency Routes

**Files:**
- Create: `routes/v1/agency.ts`

- [ ] **Step 1: Create the route file**

```typescript
// routes/v1/agency.ts
import { AgencyService } from "../../services/agencyService";
import { getMongoDb } from "../../utils/mongoClient";

interface AuthContext {
  tenantId: string;
  userId: string;
  roles?: string[];
}

async function assertAgency(tenantId: string): Promise<Response | null> {
  const db = getMongoDb();
  const tenant = await db.collection("tenants").findOne({ tenantId });
  if (!tenant?.isAgency) {
    return Response.json(
      { success: false, error: "This endpoint requires an agency account" },
      { status: 403 }
    );
  }
  return null;
}

export async function listClientsHandler(req: Request, context: AuthContext): Promise<Response> {
  const forbidden = await assertAgency(context.tenantId);
  if (forbidden) return forbidden;

  const clients = await AgencyService.listClients(context.tenantId);
  return Response.json({ success: true, clients });
}

export async function addClientHandler(req: Request, context: AuthContext): Promise<Response> {
  const forbidden = await assertAgency(context.tenantId);
  if (forbidden) return forbidden;

  let body: { tenantId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.tenantId || !body.name) {
    return Response.json({ success: false, error: "tenantId and name are required" }, { status: 400 });
  }

  try {
    // Upsert the client tenant record with a name
    const db = getMongoDb();
    await db.collection("tenants").updateOne(
      { tenantId: body.tenantId },
      { $set: { tenantId: body.tenantId, name: body.name } },
      { upsert: true }
    );
    await AgencyService.addClient(context.tenantId, body.tenantId);
    return Response.json({ success: true });
  } catch (err: any) {
    console.error("[Agency] addClient error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function removeClientHandler(req: Request, context: AuthContext, clientTenantId: string): Promise<Response> {
  const forbidden = await assertAgency(context.tenantId);
  if (forbidden) return forbidden;

  const db = getMongoDb();
  const result = await db.collection("tenants").updateOne(
    { tenantId: clientTenantId, parentId: context.tenantId },
    { $unset: { parentId: "" } }
  );

  if (result.matchedCount === 0) {
    return Response.json({ success: false, error: "Client not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add routes/v1/agency.ts
git commit -m "feat: add /v1/agency client management endpoints"
```

---

### Task 5: Wire Routes into index.ts

**Files:**
- Modify: `index.ts`

- [ ] **Step 1: Add imports at the top of the Phase 2 imports section in index.ts**

Find this block near line 80 in `index.ts`:
```typescript
// Phase 2 — v1 routes
import {
  listJobPostingsHandler,
```

Add these imports directly above it:
```typescript
import {
  listIntegrationsHandler, connectIntegrationHandler,
  disconnectIntegrationHandler, getIntegrationStatusHandler
} from "./routes/v1/integrations";
import { listClientsHandler, addClientHandler, removeClientHandler } from "./routes/v1/agency";
```

- [ ] **Step 2: Add route handlers inside the try block**

Find where workflow routes are registered in `index.ts`. They look like:
```typescript
if (req.method === "GET" && normalizedPath === "/workflows") return finalHandler(await listWorkflowsHandler(req, context));
```

Add these integration and agency routes in the same style, after the workflow routes:

```typescript
          // Integration marketplace routes
          if (req.method === "GET" && normalizedPath === "/integrations") return finalHandler(await listIntegrationsHandler(req, context));
          if (req.method === "POST" && normalizedPath.match(/^\/integrations\/[^/]+\/connect$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await connectIntegrationHandler(req, context, integrationId));
          }
          if (req.method === "DELETE" && normalizedPath.match(/^\/integrations\/[^/]+$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await disconnectIntegrationHandler(req, context, integrationId));
          }
          if (req.method === "GET" && normalizedPath.match(/^\/integrations\/[^/]+\/status$/)) {
            const integrationId = normalizedPath.split("/")[2];
            return finalHandler(await getIntegrationStatusHandler(req, context, integrationId));
          }

          // Agency routes
          if (req.method === "GET" && normalizedPath === "/agency/clients") return finalHandler(await listClientsHandler(req, context));
          if (req.method === "POST" && normalizedPath === "/agency/clients") return finalHandler(await addClientHandler(req, context));
          if (req.method === "DELETE" && normalizedPath.match(/^\/agency\/clients\/[^/]+$/)) {
            const clientTenantId = normalizedPath.split("/")[3];
            return finalHandler(await removeClientHandler(req, context, clientTenantId));
          }
```

- [ ] **Step 3: Verify the server starts without errors**

```bash
cd /home/cognitbotz/recruit-hr && bun run index.ts > /tmp/integration-wire-test.log 2>&1 &
sleep 3
grep -E "(error|Error|FAIL|Ready)" /tmp/integration-wire-test.log | head -10
kill %1 2>/dev/null
```

Expected: `[Index] Platform Ready. Serving on port 3001` — no errors.

- [ ] **Step 4: Commit**

```bash
git add index.ts
git commit -m "feat: wire integration marketplace and agency routes into index.ts"
```

---

### Task 6: Update Marketplace.tsx

**Files:**
- Modify: `frontend/src/pages/Marketplace.tsx`

Replace the static `INTEGRATIONS` array and add connect/disconnect UI.

- [ ] **Step 1: Replace the entire Marketplace component**

Replace the content of `frontend/src/pages/Marketplace.tsx` from line 1 to the end of the `export default function Marketplace()` function (before `function DevelopersSection`) with:

```typescript
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    LayoutGrid, Search, Zap, ExternalLink, Plus,
    ArrowRight, Star, Key, Copy, Trash2, RefreshCw,
    Code, Book, Rocket, Loader2, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import api from '../api/client';

const toast = {
    success: (msg: string) => alert(`Success: ${msg}`),
    error: (msg: string) => alert(`Error: ${msg}`)
};

interface CredentialField {
    key: string;
    label: string;
    type: "text" | "password" | "url";
    required: boolean;
    placeholder?: string;
}

interface Integration {
    id: string;
    name: string;
    description: string;
    category: 'ATS' | 'HRIS' | 'Communication' | 'BGV' | 'E-Sign' | 'Calendar' | 'Assessment' | 'Other';
    docsUrl: string;
    credentialFields: CredentialField[];
    status: 'connected' | 'not_connected';
    connectedAt?: string;
}

const CATEGORIES = ['All', 'ATS', 'HRIS', 'Communication', 'BGV', 'E-Sign', 'Calendar', 'Assessment', 'Other'];

export default function Marketplace() {
    const [viewMode, setViewMode] = useState<'explore' | 'developers'>('explore');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
    const [disconnectTarget, setDisconnectTarget] = useState<Integration | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadIntegrations();
    }, []);

    const loadIntegrations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/v1/integrations', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-tenant-id': localStorage.getItem('tenantId') || '',
                },
            });
            const data = await res.json();
            if (data.success) setIntegrations(data.integrations);
        } catch (e) {
            console.error('Failed to load integrations', e);
        } finally {
            setIsLoading(false);
        }
    };

    const openConnectModal = (integration: Integration) => {
        setConnectTarget(integration);
        setCredentials({});
    };

    const handleConnect = async () => {
        if (!connectTarget) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/v1/integrations/${connectTarget.id}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-tenant-id': localStorage.getItem('tenantId') || '',
                },
                body: JSON.stringify({ credentials }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${connectTarget.name} connected successfully`);
                setConnectTarget(null);
                await loadIntegrations();
            } else {
                toast.error(data.error || 'Failed to connect');
            }
        } catch (e: any) {
            toast.error(e.message || 'Connection failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDisconnect = async () => {
        if (!disconnectTarget) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/v1/integrations/${disconnectTarget.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-tenant-id': localStorage.getItem('tenantId') || '',
                },
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`${disconnectTarget.name} disconnected`);
                setDisconnectTarget(null);
                await loadIntegrations();
            } else {
                toast.error(data.error || 'Failed to disconnect');
            }
        } catch (e: any) {
            toast.error(e.message || 'Disconnect failed');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredIntegrations = integrations.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Connect Modal */}
            <Dialog open={!!connectTarget} onOpenChange={() => setConnectTarget(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Connect {connectTarget?.name}</DialogTitle>
                        <DialogDescription>
                            Enter your credentials. They are encrypted and stored securely.{' '}
                            {connectTarget?.docsUrl && (
                                <a href={connectTarget.docsUrl} target="_blank" rel="noreferrer" className="underline text-primary">
                                    Where do I find these?
                                </a>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {connectTarget?.credentialFields.map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                                </label>
                                <Input
                                    type={field.type === 'password' ? 'password' : 'text'}
                                    placeholder={field.placeholder}
                                    value={credentials[field.key] || ''}
                                    onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="font-mono text-sm"
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConnectTarget(null)}>Cancel</Button>
                        <Button onClick={handleConnect} disabled={isSaving}>
                            {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                            Connect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disconnect Confirmation */}
            <Dialog open={!!disconnectTarget} onOpenChange={() => setDisconnectTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Disconnect {disconnectTarget?.name}?</DialogTitle>
                        <DialogDescription>
                            This will remove the stored credentials. Any active workflows using this integration will stop working.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDisconnectTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDisconnect} disabled={isSaving}>
                            {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                            Disconnect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header with Toggle */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tighter uppercase flex items-center gap-3">
                        <LayoutGrid className="size-10 text-primary" />
                        Ecosystem
                    </h1>
                    <p className="text-lg text-muted-foreground font-medium max-w-2xl">
                        Power up your recruitment stack with native integrations and developer tools.
                    </p>
                </div>

                <div className="flex bg-muted p-1 rounded-xl border border-border/50">
                    <button
                        onClick={() => setViewMode('explore')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                            viewMode === 'explore' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Marketplace
                    </button>
                    <button
                        onClick={() => setViewMode('developers')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                            viewMode === 'developers' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Developers
                    </button>
                </div>
            </div>

            {viewMode === 'explore' ? (
                <div className="space-y-10">
                    {/* Search & Filter */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[300px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search integrations..."
                                className="pl-10 h-11 bg-card border-border/50 focus-visible:ring-primary shadow-sm font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-muted p-1 rounded-lg border border-border/50 overflow-x-auto no-scrollbar max-w-full">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all",
                                        selectedCategory === cat
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-24 text-muted-foreground">
                            <Loader2 className="size-6 animate-spin mr-3" />
                            Loading integrations...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                                {searchQuery ? `Search Results (${filteredIntegrations.length})` : `All Integrations (${filteredIntegrations.length})`}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredIntegrations.map(item => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/30 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase px-2 h-4 border-muted-foreground/30 text-muted-foreground">{item.category}</Badge>
                                                {item.status === 'connected' && (
                                                    <Badge className="text-[8px] font-black uppercase px-2 h-4 border-none bg-emerald-500/10 text-emerald-500">Connected</Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground font-medium line-clamp-1">{item.description}</p>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {item.status === 'connected' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest px-3 text-destructive border-destructive/30 hover:bg-destructive/10"
                                                    onClick={() => setDisconnectTarget(item)}
                                                >
                                                    <X className="size-3 mr-1" />
                                                    Disconnect
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="h-8 text-[10px] font-black uppercase tracking-widest px-3"
                                                    onClick={() => openConnectModal(item)}
                                                >
                                                    <Plus className="size-3 mr-1" />
                                                    Connect
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <DevelopersSection />
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/cognitbotz/recruit-hr/frontend && npx tsc --noEmit 2>&1 | grep -i "error" | head -20
```

Expected: No errors (or only pre-existing errors unrelated to Marketplace.tsx).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Marketplace.tsx
git commit -m "feat: replace hardcoded integrations with live API fetch + connect/disconnect UI"
```

---

### Task 7: Smoke Test

- [ ] **Step 1: Add INTEGRATION_ENCRYPTION_KEY to .env**

Check if it exists already:
```bash
grep "INTEGRATION_ENCRYPTION_KEY" /home/cognitbotz/recruit-hr/.env
```

If missing, add it:
```bash
# Generate a 32-byte hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then add the output to `.env`:
```
INTEGRATION_ENCRYPTION_KEY=<generated-64-char-hex>
```

Also add to `.env.example`:
```
INTEGRATION_ENCRYPTION_KEY=<replace-with-32-bytes-as-hex>
```

- [ ] **Step 2: Start the server**

```bash
cd /home/cognitbotz/recruit-hr && bun run index.ts > /tmp/marketplace-smoke.log 2>&1 &
sleep 3
grep -E "(Ready|Error|error)" /tmp/marketplace-smoke.log
```

Expected: `[Index] Platform Ready. Serving on port 3001`

- [ ] **Step 3: Get an auth token (use test credentials)**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | \
  bun -e "const d=await Bun.stdin.text();const p=JSON.parse(d);console.log(p.token??p.data?.token??'NO_TOKEN')")
echo "Token: $TOKEN"
```

- [ ] **Step 4: Fetch the integrations list**

```bash
curl -s http://localhost:3001/v1/integrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: test-tenant" | \
  bun -e "const d=await Bun.stdin.text();const p=JSON.parse(d);console.log('Count:',p.integrations?.length,'Success:',p.success)"
```

Expected: `Count: 24 Success: true`

- [ ] **Step 5: Connect an integration**

```bash
curl -s -X POST http://localhost:3001/v1/integrations/slack/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: test-tenant" \
  -H "Content-Type: application/json" \
  -d '{"credentials":{"botToken":"xoxb-test-token"}}' | \
  bun -e "const d=await Bun.stdin.text();console.log(d)"
```

Expected: `{"success":true,"integration":{"id":"slack","status":"connected","connectedAt":"..."}}`

- [ ] **Step 6: Verify status**

```bash
curl -s http://localhost:3001/v1/integrations/slack/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: test-tenant" | \
  bun -e "const d=await Bun.stdin.text();console.log(d)"
```

Expected: `{"success":true,"id":"slack","status":"connected","connectedAt":"..."}`

- [ ] **Step 7: Disconnect the integration**

```bash
curl -s -X DELETE http://localhost:3001/v1/integrations/slack \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: test-tenant" | \
  bun -e "const d=await Bun.stdin.text();console.log(d)"
```

Expected: `{"success":true}`

- [ ] **Step 8: Stop server and run unit tests**

```bash
kill $(lsof -ti:3001) 2>/dev/null
cd /home/cognitbotz/recruit-hr && bun test tests/integrationService.test.ts 2>&1
```

Expected: 2 tests pass.

- [ ] **Step 9: Commit**

```bash
git add .env .env.example
git commit -m "chore: add INTEGRATION_ENCRYPTION_KEY to env files"
```
