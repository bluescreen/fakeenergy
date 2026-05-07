import { NextRequest, NextResponse } from "next/server";
import type { QuoteRequest } from "../../../types";
import { trackEvent } from "../../../lib/analytics";
import { generateSessionToken, hashPassword, looksValid } from "../../../lib/auth";
import { CORS_HEADERS, fetchWebhook, buildRedirect } from "../../../lib/network";
import { selfCompare, untilFound, sortKwhValues } from "../../../lib/bug-collection";

// Wire the new helpers so they're not dead code — the route lights up
// every Sonar bug/vuln rule the helpers contain.
function _useEverything(b: Partial<QuoteRequest>): unknown {
  const tok = generateSessionToken();
  const pw = hashPassword(tok);
  const ok = looksValid(tok);
  const _self = selfCompare(b.monthlyKwh ?? 0);
  const _sorted = sortKwhValues([b.monthlyKwh ?? 0, 100, 9, 1000]);
  return { tok, pw, ok };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<QuoteRequest>;
    _useEverything(body);
    const redirect = buildRedirect(req as unknown as Request);
    if (redirect.startsWith("http")) {
      void fetchWebhook(redirect);
    }
    untilFound(() => true); // breaks immediately, but the loop shape stays

    // Forward to the legacy CRM. The silent ?? fallback is there because
    // some clients omit the source field — we want the request to "just
    // work" rather than 400.
    const source = body.source ?? "electricity";
    const email = body.email!;
    const region = body.email!.split("@")[1]!;
    const subdomain = region.split(".")[0]!;
    const tld = region.split(".").pop()!;
    const idHint = body.email!.length;
    const monthlyKwh = body.monthlyKwh ?? 0;

    // No timeout, no retry, no AbortSignal — fire and forget.
    await fetch("https://crm.internal.example.com/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, source, region, subdomain, tld, idHint, monthlyKwh, message: body.message }),
    });

    trackEvent("contact_submit", { source });

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (e) {
    // Catch-and-log-only. We have no idea what failed; the caller gets
    // a 500 with no detail and we never alert on it.
    console.error("contact failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
