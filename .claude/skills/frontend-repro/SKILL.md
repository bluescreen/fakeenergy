---
name: frontend-repro
description: Drive Chrome via the chrome-devtools MCP to reproduce a visible frontend bug from a Jira ticket. Navigates the dev server, captures screenshots and console logs, and writes a short observation. Use when the user says "/frontend-repro <KEY>", "reproduce <KEY> in the browser", or "show me the visible bug for <KEY>".
---

# frontend-repro

Browser-driven repro for visible bugs. Pairs with `ticket-triage`:
when the analyser cannot find a unit-testable surface (e.g., the
testimonials locale split or the cookie banner reload loop), this
skill captures the symptom in screenshots and a short trace.

## Prerequisites

1. **Chrome DevTools MCP installed.** If `claude mcp list` does not
   show `chrome-devtools` as connected, the user must run:

       claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest

   Then restart Claude Code so the MCP tools load. The MCP server
   spawns a Chrome instance on demand, no OAuth.

2. **Dev server running.** The skill assumes
   `http://localhost:3000` serves the fakeenergy Next.js app. If
   the homepage is not reachable, the skill runs:

       cd /Users/mmuschol/dev/brownfield/fakeenergy
       npm run dev

   in the background, waits for the port to respond, then proceeds.

3. **Ticket is In Progress on the Jira board.** Same gate as
   `ticket-triage`. Skill refuses To Do tickets.

## Inputs

- **Argument (required):** a single Jira ticket key, e.g.,
  `<projectKey>-9`.
- **Optional flags in argument string:**
  - `--headed` to show the browser (useful for live demos)
  - `--full-page` to capture full-page screenshot instead of viewport
  - `--width=1440` / `--height=900` to override viewport

## Procedure

### 1. Resolve and gate

Fetch the ticket via `mcp__atlassian__searchJiraIssuesUsingJql`
with `jql = key = "<KEY>" AND status = "In Progress"`. If empty,
look up actual status and refuse with the standard "drag the
card" message.

### 2. Decide the route plan

Read the ticket description. Decide which routes and actions to
drive based on the ticket body. Common patterns in fakeenergy:

- **Locale-split complaints** ("Preise sehen anders aus") →
  navigate to `/`, capture the section with tariff cards and the
  testimonials section side by side. Extract `textContent` of
  `.price` and `.testimonial .who` via `evaluate_script`.
- **Cookie-banner complaints** ("Banner kommt jedes Mal wieder")
  → navigate to `/`, locate banner, click OK, capture localStorage
  via `evaluate_script`, navigate to another route, observe whether
  the banner reappears, screenshot.
- **Funnel rejections** → navigate to `/funnel`, fill the form
  with the customer's exact PLZ and source, click submit, capture
  the resulting page or error.
- **Layout / format complaints** → screenshot the named section,
  then `evaluate_script` to dump computed styles or DOM text.

If the ticket does not match a pattern, ask the user for the
target route before driving the browser.

### 3. Drive the browser

Use the chrome-devtools MCP tools. Common sequence:

- `browser_navigate` to the URL
- `browser_wait_for` a stable element selector
- `browser_screenshot` (full-page or viewport)
- `browser_evaluate_script` for DOM observations
- `browser_click` / `browser_type` for interactions
- `browser_get_console_messages` to capture client-side errors

Save screenshot artifacts to:

    docs/repro-screenshots/<KEY>/<step>.png

Create the directory if missing. Step names should be short and
ordered: `01-landing.png`, `02-after-accept.png`, etc.

### 4. Write the observation

After driving, write a short `observation.md` to the same
directory. Structure:

    # <KEY> — Browser repro

    **URL(s) visited:** <list>
    **What happened:** <2-3 sentences in plain English>
    **Console messages:** <list of warn/error lines, or "none">
    **Smoking-gun text or value:** <one quoted observation, e.g.,
    `localStorage["slopwerk-cookie-consent"] === "1"`>

    ## Screenshots
    - 01-landing.png — viewport on first load
    - 02-after-accept.png — viewport after clicking OK

Do NOT propose a fix. Observation only. The user (or a follow-up
`fix-from-ticket` invocation) decides next steps.

### 5. Report

Reply to the user with:

- Path to the artifact directory
- One-line summary of what was reproduced
- Console errors if any
- Suggestion of which existing planted bug doc this maps to (only
  if the answer key in `docs/planted-bugs.md` is present on the
  branch — otherwise omit)

## Failure modes

- **chrome-devtools MCP not loaded.** Surface the install command
  above and stop. Do not try to call `mcp__chrome_devtools__*`
  tools that aren't registered.
- **Dev server unreachable.** Try to start it once, wait up to 30
  seconds for `:3000` to respond, then give up and ask the user.
- **Ticket not In Progress.** Refuse, surface current status, ask
  user to drag the card.
- **Bug only appears on hard reload.** The chrome-devtools MCP
  has a hard-reload tool; use it. If the symptom only appears in
  incognito, mention it and run a second pass.
- **Screenshot captures nothing useful.** If the named section
  is below the fold, switch to `--full-page` or scroll first via
  `evaluate_script` (`window.scrollBy`).

## Notes

- Headed mode is recommended for live demos. Headless is faster
  for CI-like batches.
- Artifacts are committed by default — they are part of the demo
  postmortem. If the user prefers gitignored artifacts, they can
  add `docs/repro-screenshots/` to `.gitignore` before running.
- Skill is read-and-record only. It does not file Jira comments,
  does not edit source.
