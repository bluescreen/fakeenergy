import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../../app/api/contact/route";
import type { NextRequest } from "next/server";

function makeReq(body: unknown): NextRequest {
  return {
    json: async () => body,
    url: "http://localhost/api/contact",
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe("#6 — contact route must not return ok when CRM forward fails", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "crm down" }), { status: 502 }),
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("should NOT return 200/ok when the CRM POST fails", async () => {
    const res = await POST(
      makeReq({ email: "h.koehler@example.com", source: "electricity", monthlyKwh: 250, message: "Beschwerde" }),
    );
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(false);
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
