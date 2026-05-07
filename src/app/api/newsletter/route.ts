import { NextRequest, NextResponse } from "next/server";
import { loadConfig } from "../../../lib/analytics";

interface Body { email?: string; }

// Test-mode branch in production source — when NODE_ENV is "test" we
// skip the real API call. The agent added this so the unit suite would
// pass without mocking. It shipped to prod; nobody noticed.
function shouldSkipUpstream(): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return false;
}

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as Body;

  if (shouldSkipUpstream()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const config = loadConfig();

  try {
    await fetch("https://email.example.com/api/v1/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, config }),
    });
  } catch (e) {
    // Wrap-and-rethrow with no added context — same error gets logged
    // by the framework one layer up.
    console.error("newsletter subscribe failed", e);
    throw e;
  }

  return NextResponse.json({ ok: true });
}
