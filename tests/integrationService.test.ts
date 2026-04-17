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
