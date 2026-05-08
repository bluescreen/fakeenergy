---
name: frontend-repro
description: Drive Chrome via the chrome-devtools MCP to reproduce a visible frontend bug from an issue tracker ticket (Jira or GitHub). Navigates the dev server, captures screenshots and console logs, and writes a short observation. Use when the user says "/frontend-repro <KEY>", "reproduce <KEY> in the browser", or "show me the visible bug for <KEY>".
---

# frontend-repro

Browser-driven repro for visible bugs. Pairs with `ticket-triage`:
when the analyser cannot find a unit-testable surface (e.g., a
locale-split rendering bug or a cookie-banner reload loop), this
skill captures the symptom in screenshots and a short trace.

## Project bindings

| Binding              | Default                  | What it is                                  |
|----------------------|--------------------------|---------------------------------------------|
| `DEV_SERVER_URL`     | `http://localhost:3000`  | Where the running app responds              |
| `DEV_SERVER_START`   | `npm run dev`            | Background command if the server is down    |
| `DEV_SERVER_TIMEOUT` | `30s`                    | How long to wait for the port               |

Override these once when adopting in a non-Node project (e.g.
`http://localhost:5173` + `npm run dev` for Vite, or
`http://localhost:8000` + `python manage.py runserver` for
Django).

## Prerequisites

1. **Chrome DevTools MCP installed.** If `claude mcp list` does not
   show `chrome-devtools` as connected, the user must run:

       claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest

   Then restart Claude Code so the MCP tools load. The MCP server
   spawns a Chrome instance on demand, no OAuth.

2. **Dev server running.** The skill assumes `{DEV_SERVER_URL}`
   serves the running app. If the homepage is not reachable, the
   skill runs `{DEV_SERVER_START}` from the repo root in the
   background, waits up to `{DEV_SERVER_TIMEOUT}` for the port
   to respond, then proceeds.

3. **Ticket is in progress on the issue tracker.** Same gate as
   `ticket-triage`. For Jira: `status = "In Progress"`. For
   GitHub: issue carries the `in-progress` label and is open.

## Inputs

- **Argument (required):** a single ticket key. Jira shape
  (`<projectKey>-9`), GitHub shape (`#9` or bare integer `9`).
- **Optional flags in argument string:**
  - `--headed` to show the browser (useful for live demos)
  - `--full-page` to capture full-page screenshot instead of viewport
  - `--width=1440` / `--height=900` to override viewport

## Procedure

### 1. Resolve and gate

Detect source from argument shape (same rule as `ticket-triage`):

- **Jira:** `mcp__atlassian__searchJiraIssuesUsingJql` with
  `jql = key = "<KEY>" AND status = "In Progress"`.
- **GitHub:** `gh issue view <N> --json
  number,title,body,labels,state,url`, gate on `state = OPEN`
  and `labels` containing `in-progress`.

If empty / wrong state, refuse with current status surfaced.

### 2. Decide the route plan

Read the ticket description. Decide which routes and actions to
drive based on the ticket body. Common patterns:

- **Locale / format complaints** ("prices look different") →
  navigate to the affected page, capture the two regions side by
  side, extract `textContent` of the relevant selectors via
  `evaluate_script`.
- **Persistence complaints** ("banner keeps coming back") →
  drive the user action that should persist, capture
  `localStorage` / cookies via `evaluate_script`, navigate
  away-and-back, observe whether the symptom recurs, screenshot.
- **Form / funnel rejections** → navigate to the form, fill it
  with the customer's exact inputs, click submit, capture the
  resulting page or error.
- **Layout complaints** → screenshot the named section, then
  `evaluate_script` to dump computed styles or DOM text.

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
- (Optional, workshop-fixture only) Suggestion of which existing
  planted-bug doc this maps to, if `docs/planted-bugs.md` is
  present on the branch — otherwise omit

## Failure modes

- **chrome-devtools MCP not loaded.** Surface the install command
  above and stop. Do not try to call `mcp__chrome_devtools__*`
  tools that aren't registered.
- **Dev server unreachable.** Try `{DEV_SERVER_START}` once, wait
  up to `{DEV_SERVER_TIMEOUT}` for `{DEV_SERVER_URL}` to respond,
  then give up and ask the user.
- **Ticket not in progress.** Refuse, surface current status /
  labels, ask user to move the card or apply the label.
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
- Skill is read-and-record only. It does not file ticket
  comments, does not edit source.
