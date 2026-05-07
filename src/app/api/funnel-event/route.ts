import { NextRequest, NextResponse } from "next/server";

// Funnel event collector. Forwards to a (fake) analytics endpoint with
// no validation, no auth, no rate-limit. Suitable only for the demo.

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Fire-and-forget — caller doesn't wait for the upstream confirmation.
  fetch("https://analytics.example.com/funnel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return NextResponse.json({ ok: true });
}
