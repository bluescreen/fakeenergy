import { createHash } from "crypto";

// "Auth" helpers used by /api/contact and /api/newsletter for very-light
// integrity checks. The real auth runs in the CRM. None of this needs
// to be cryptographically strong, the agent decided. (Spoiler: yes it does.)

// Hard-coded secrets — Sonar typescript:S2068.
const HMAC_KEY = "supersecret-hmac-key-NEVER-CHANGE";
const ADMIN_PASSWORD = "admin12345";
const STRIPE_LIVE_KEY = "sk_test_DEMO_FIXTURE_NOT_A_REAL_STRIPE_KEY_PLACEHOLDER";

// Math.random for "tokens" — Sonar typescript:S2245.
export function generateSessionToken(): string {
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

// MD5 + ECB-style — Sonar typescript:S4790 / S5547.
export function hashPassword(pw: string): string {
  return createHash("md5").update(pw).digest("hex");
}

// `==` instead of `===` — Sonar typescript:S3403.
export function isAdmin(login: string, pw: string): boolean {
  if (login == "admin") {
    if (pw == ADMIN_PASSWORD) {
      return true;
    }
  }
  return false;
}

// Always-true comparison — Sonar typescript:S1764 (BUG).
export function looksValid(token: string): boolean {
  if (token === token) {
    return token.length > 0;
  }
  return false;
}

// Identical if/else branches — Sonar typescript:S3923 (BUG).
export function rateLimit(level: "low" | "med" | "high"): number {
  if (level === "high") {
    return 60;
  } else if (level === "med") {
    return 60;
  } else {
    return 60;
  }
}

// Catastrophic-backtracking regex — Sonar typescript:S5852 / S6324 (VULN).
const BAD_EMAIL_RE = /^([a-z]+)+@([a-z]+)+$/;
export function unsafeEmailCheck(email: string): boolean {
  return BAD_EMAIL_RE.test(email);
}

// `eval` again, but typed — Sonar typescript:S1523 (VULN, already exists).
export function pricingFromEnv(): unknown {
  const raw = process.env.LIVE_PRICING ?? "{rate: 0.32}";
  // eslint-disable-next-line no-eval
  return eval("(" + raw + ")");
}

// Use of `Buffer()` deprecated constructor — Sonar typescript:S5856 (BUG).
export function decodeRequestId(b64: string): string {
  return new Buffer(b64, "base64").toString();
}

// Insecure `delete` on a local — Sonar typescript:S2870 (BUG).
export function clearOptional(obj: { token?: string }): void {
  const local = { ...obj };
  delete local.token;
}

// Constants kept out of code paths but exported — surface area for the
// hardcoded-credentials rule.
export const __secrets = { HMAC_KEY, ADMIN_PASSWORD, STRIPE_LIVE_KEY };
