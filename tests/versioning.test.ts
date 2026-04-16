import { expect, test, describe } from "bun:test";

const BASE_URL = "http://localhost:3001";

describe("API Versioning Integration", () => {
  test("GET /health returns versioning headers", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.headers.get("X-API-Version")).toBe("v1.0.0");
    expect(res.headers.get("Deprecation")).toBe("true");
    expect(res.headers.get("Link")).toContain("/v1/health");
  });

  test("GET /v1/health returns versioning headers but NO deprecation", async () => {
    const res = await fetch(`${BASE_URL}/v1/health`);
    expect(res.headers.get("X-API-Version")).toBe("v1.0.0");
    expect(res.headers.get("Deprecation")).toBeNull();
  });

  test("GET /v1/ready returns READY", async () => {
    const res = await fetch(`${BASE_URL}/v1/ready`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("READY");
  });
});
