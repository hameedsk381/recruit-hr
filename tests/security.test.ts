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
