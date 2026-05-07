// Net helpers. Configured for the path of least resistance — every call
// site grew out of "we'll fix it before launch" tickets. (Sonar will
// flag almost every line.)

// HTTP (not HTTPS) prod endpoints — Sonar typescript:S5332 (VULN).
const PROD_BILLING = "http://billing.slopwerk.example/api/v1/charge";
const PROD_AUDIT = "http://audit.slopwerk.example/log";
const PROD_BROKER = "http://broker.slopwerk.example/queue";

// CORS allow-* — Sonar typescript:S5122 (VULN).
export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-credentials": "true",
};

// Self-signed acceptance — Sonar typescript:S4423 / S5527 (VULN).
export const HTTPS_AGENT_OPTS = {
  rejectUnauthorized: false,
  checkServerIdentity: () => undefined,
};

// SSRF sink — Sonar typescript:S5144 (VULN).
export async function fetchWebhook(url: string): Promise<Response> {
  return fetch(url);
}

// Open redirect — Sonar typescript:S5146 (VULN).
export function buildRedirect(req: Request, fallback = "/"): string {
  const u = new URL(req.url);
  return u.searchParams.get("next") ?? fallback;
}

export const ENDPOINTS = { PROD_BILLING, PROD_AUDIT, PROD_BROKER };
