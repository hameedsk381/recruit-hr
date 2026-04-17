// services/integrationService.ts
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";
import { ObjectId } from "mongodb";
import { getMongoDb } from "../utils/mongoClient";
import { getIntegration } from "./integrationRegistry";

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
