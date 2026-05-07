#!/usr/bin/env node
// Push the markdown tickets in docs/tickets/ into a local Jira instance.
//
// Required env:
//   JIRA_URL        e.g. http://localhost:8090
//   JIRA_TOKEN      Personal Access Token (Server/DC) — recommended
//     OR
//   JIRA_USER + JIRA_PASSWORD  Basic auth (Server/DC fallback)
//
// Optional env:
//   PROJECT_KEY     defaults to "SLOP"
//   TICKETS_DIR     defaults to "docs/tickets"
//   DRY_RUN         "1" to print payloads without POSTing
//
// For Atlassian Cloud, see docs/jira-setup.md — the description
// field needs ADF, not plain text, so this script needs small edits.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const TICKETS_DIR = process.env.TICKETS_DIR ?? "docs/tickets";
const JIRA_URL = (process.env.JIRA_URL ?? "http://localhost:8090").replace(/\/$/, "");
const JIRA_TOKEN = process.env.JIRA_TOKEN;
const JIRA_USER = process.env.JIRA_USER;
const JIRA_PASSWORD = process.env.JIRA_PASSWORD;
const PROJECT_KEY = process.env.PROJECT_KEY ?? "SLOP";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!JIRA_TOKEN && !(JIRA_USER && JIRA_PASSWORD)) {
  console.error("Set JIRA_TOKEN (recommended) or JIRA_USER + JIRA_PASSWORD.");
  process.exit(1);
}

const authHeader = JIRA_TOKEN
  ? `Bearer ${JIRA_TOKEN}`
  : `Basic ${Buffer.from(`${JIRA_USER}:${JIRA_PASSWORD}`).toString("base64")}`;

const PRIORITY_DE_TO_EN = {
  Hoch: "High",
  Mittel: "Medium",
  Niedrig: "Low",
};

function parseTicket(md, filename) {
  const lines = md.split("\n");

  const h1 = lines.find((l) => l.startsWith("# "));
  if (!h1) throw new Error(`${filename}: no H1 found`);
  const titleMatch = h1.match(/^#\s+(SLOP-\d+)\s+[—-]\s+(.+)$/);
  if (!titleMatch) throw new Error(`${filename}: H1 does not match "# SLOP-XXXX — title"`);
  const externalId = titleMatch[1];
  const title = titleMatch[2].trim();

  const meta = {};
  for (const line of lines) {
    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!row) continue;
    const key = row[1].trim();
    const val = row[2].trim();
    if (key === "Field" || /^-+$/.test(key)) continue;
    meta[key] = val;
  }

  const beschreibungIdx = lines.findIndex((l) => l.trim() === "## Beschreibung");
  const body =
    beschreibungIdx >= 0
      ? lines.slice(beschreibungIdx + 1).join("\n").trim()
      : md.trim();

  const priority = PRIORITY_DE_TO_EN[meta.Priority] ?? "Medium";
  const labels = (meta.Labels ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return { externalId, title, priority, labels, body, meta };
}

function buildPayload(t) {
  const summary = `[${t.externalId}] ${t.title}`.slice(0, 250);
  const headerLines = [
    `*Original ticket ID:* ${t.externalId}`,
    `*Reporter:* ${t.meta.Reporter ?? "(unknown)"}`,
    `*Customer ID:* ${t.meta["Customer ID"] ?? "(none)"}`,
    `*Created:* ${t.meta.Created ?? "(unknown)"}`,
    "",
    "----",
    "",
  ];
  const description = headerLines.join("\n") + t.body;
  return {
    fields: {
      project: { key: PROJECT_KEY },
      summary,
      description,
      issuetype: { name: "Bug" },
      priority: { name: t.priority },
      labels: [...t.labels, t.externalId.toLowerCase()],
    },
  };
}

async function createIssue(payload) {
  const res = await fetch(`${JIRA_URL}/rest/api/2/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  const entries = await readdir(TICKETS_DIR);
  const files = entries.filter((f) => f.endsWith(".md")).sort();
  if (files.length === 0) {
    console.error(`No *.md files in ${TICKETS_DIR}`);
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  for (const f of files) {
    const md = await readFile(join(TICKETS_DIR, f), "utf8");
    let ticket;
    try {
      ticket = parseTicket(md, f);
    } catch (e) {
      console.error(`SKIP  ${f}: ${e.message}`);
      fail++;
      continue;
    }
    const payload = buildPayload(ticket);
    if (DRY_RUN) {
      console.log(`DRY   ${ticket.externalId} ${JSON.stringify(payload.fields.summary)}`);
      ok++;
      continue;
    }
    try {
      const res = await createIssue(payload);
      console.log(`OK    ${ticket.externalId} -> ${res.key}  ${JIRA_URL}/browse/${res.key}`);
      ok++;
    } catch (e) {
      console.error(`FAIL  ${ticket.externalId}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n${ok} ok, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
