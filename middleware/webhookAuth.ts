import { createHmac, timingSafeEqual } from "crypto";

export type WebhookProvider = "docusign" | "bgv" | "outreach" | "video";

interface WebhookProviderConfig {
  /** The request header that carries the signature */
  signatureHeader: string;
  /** The env var name holding the shared secret */
  secretEnvVar: string;
  /**
   * Extract the raw hex/base64 digest from the header value.
   * DocuSign sends raw base64; BGV/Video send "sha256=<hex>"; Resend sends "v1,<base64>".
   */
  extractDigest: (headerValue: string) => string;
  /** Digest encoding: "hex" or "base64" */
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

  // If no secret is configured, skip verification (dev/test mode)
  if (!secret) {
    console.warn(
      `[WebhookAuth] ${config.secretEnvVar} not set — skipping HMAC check for ${provider}`
    );
    const rawBody = await req.text();
    return { valid: true, rawBody };
  }

  const signatureHeader = req.headers.get(config.signatureHeader);
  if (!signatureHeader) {
    const rawBody = await req.text();
    console.warn(
      `[WebhookAuth] Missing signature header '${config.signatureHeader}' for ${provider}`
    );
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
 * Reconstructs a Request with the already-consumed body so downstream handlers can read it.
 */
export function reconstructRequest(original: Request, rawBody: string): Request {
  return new Request(original.url, {
    method: original.method,
    headers: original.headers,
    body: rawBody,
  });
}
