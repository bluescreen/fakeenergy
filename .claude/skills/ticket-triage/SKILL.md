---
name: ticket-triage
description: Fetch in-progress tickets from Jira (Atlassian MCP) or GitHub Issues (gh CLI) and run two sub-agents on each in parallel — an analyser that produces a ranked hypothesis tree, and a reproducer that writes a failing vitest case. Auto-detects source from argument shape or origin remote. Use when the user says "/ticket-triage", "triage in-progress tickets", "analyse current jira work", "triage open github issues", or asks to bring fresh agents onto active tickets.
---

# ticket-triage

Fan-out triage for tickets currently signaled as "work this". For
each ticket the skill spawns:

- **analyser** (read-only `Explore` sub-agent) — ranked hypothesis
  tree with `path:line` evidence and the cheapest next probe
- **reproducer** (`general-purpose` sub-agent) — minimal failing
  vitest case under `src/lib/__tests__/`, no source edits

Both run in parallel per ticket. The main agent aggregates and
presents one block per ticket.

The skill works against either:

- **Jira** via the `atlassian` MCP. "Work this" means
  `status = In Progress` on the board.
- **GitHub Issues** via the `gh` CLI. "Work this" means the issue
  carries the `in-progress` label.

Source is auto-detected from argument shape or origin remote.

## Inputs

- **Default scope:** all tickets the user has signaled as "work
  this" on the active source.
- **Optional argument:** a single ticket key. The skill detects
  source from shape:
  - `KAN-3` (uppercase letters + dash + digits) → Jira
  - `#3` or `3` (bare number, optional `#`) → GitHub
  - `gh:5` (explicit prefix) → GitHub
  - `jira:KAN-3` (explicit prefix) → Jira

The "work this" filter is non-negotiable. The skill refuses
tickets the user has not signaled, even when named explicitly.
The signal gesture is the queue.

## Configuration

The skill is tenant-agnostic — no hardcoded cloud IDs, project
keys, owner/repo strings, or workspace URLs.

For Jira: discovers via the `atlassian` MCP at run time. User
needs an authenticated MCP session and at least one Jira project
they can create issues in.

For GitHub: derives `owner/repo` from the `origin` remote and uses
`gh auth status` for authentication. User needs `gh` CLI
authenticated against the right account.

## Procedure

### 0. Detect source

Pick the active source in this order:

1. Argument with explicit prefix (`gh:`, `jira:`) → use that.
2. Argument matching `^[A-Z]{2,}-\d+$` → Jira.
3. Argument matching `^#?\d+$` → GitHub.
4. No argument:
   - If `git remote get-url origin` points to `github.com` AND
     `gh auth status` is clean, default to GitHub.
   - Else, if the `atlassian` MCP is connected, default to Jira.
   - Else, surface both options and ask the user.

### 1. Discover destination

**Jira branch:**

- Call `mcp__atlassian__getAccessibleAtlassianResources`. First
  result's `id` is `cloudId`, `url` is `browseBase`. Ask if more
  than one resource is connected.
- Call `mcp__atlassian__getVisibleJiraProjects` with
  `action: "create"`. Use the single `key`, or ask if multiple.
- Cache `cloudId`, `browseBase`, `projectKey`.

**GitHub branch:**

- Run `git remote get-url origin`, parse `owner/repo` from the
  URL (both SSH and HTTPS forms supported).
- Confirm `gh auth status` is clean.
- The `in-progress` label is required. If
  `gh label list --repo <owner>/<repo>` does not list it, run
  once:

      gh label create in-progress --repo <owner>/<repo> \
        --color FBCA04 \
        --description "User-signaled work-this ticket"

  Yellow, mirroring the Jira board's In Progress column.
- Cache `owner/repo` and
  `browseBase = https://github.com/<owner>/<repo>`.

### 2. Resolve scope

**Jira branch:**

- Default JQL:
  `project = <projectKey> AND status = "In Progress" ORDER BY priority DESC, key ASC`
- Single key: `key = "<KEY>" AND status = "In Progress"`

**GitHub branch:**

- Default filter: `--label in-progress --state open`
- Single number: fetch the issue and verify it has the
  `in-progress` label. Otherwise refuse with current labels
  surfaced.

The filter is non-negotiable. Anything other than the expected
key shape is rejected.

### 3. Fetch tickets

**Jira branch:**

Call `mcp__atlassian__searchJiraIssuesUsingJql` with:

- `cloudId`, the resolved JQL
- `fields`:
  `["summary", "description", "status", "priority", "labels", "issuetype"]`
- `responseContentFormat`: `"markdown"`
- `maxResults`: `25`

**GitHub branch:**

Default scope:

    gh issue list --repo <owner>/<repo> --label in-progress \
      --state open --limit 25 \
      --json number,title,body,labels,assignees,url

Single number:

    gh issue view <N> --repo <owner>/<repo> \
      --json number,title,body,labels,state,url

Normalize each result to an internal shape:

    { key, title, body, labels, browseUrl, source }

where `key` is `<projectKey>-N` for Jira or `#N` for GitHub, and
`source` is `"jira"` or `"github"`.

If the result is empty, report based on source:

- Jira default: "No tickets in In Progress on the board. Drag a
  card to start a triage." Stop.
- Jira single key: "<KEY> is not in In Progress, current status
  is <status>. Drag it on the board first." Stop.
- GitHub default: "No issues labeled `in-progress` on
  <owner>/<repo>. Add the label to an issue to queue it." Stop.
- GitHub single number: "<#N> does not carry the `in-progress`
  label. Current labels: <list>. Add `in-progress` first." Stop.

### 4. Summarize and confirm

Before any sub-agent fan-out, present a short summary of every
ticket in scope and ask the user to confirm. Per ticket, four to
six lines:

- **Key + title** (one line)
- **Reporter / customer ID** if present in the body
- **Labels** (and Jira priority if available)
- **What the customer actually says is broken**, in 1–2 sentences,
  stripped of misdirection (no "maybe it's the database
  migration", no "DSGVO threats" — just the symptom)
- **Hint of misdirection** the body contains, one short clause,
  so the user knows what the analyser will need to see past

Then ask, exactly: "Run analyser + reproducer on these N
ticket(s)? (yes / no / pick subset)". Stop on no. Fan out only on
the chosen keys if the user picks a subset. Default is fan-out on
all listed.

Do not run sub-agents until the user confirms. The summarize step
exists so the user spots a wrongly-pulled ticket before paying
the sub-agent cost.

### 5. Per-ticket fan-out

For each ticket, call **two** Agent tools in the **same response**
(parallel) using the prompts in this file. Pass the ticket
`title`, `body`, `key`, and `source` ("jira" or "github") into
each prompt. Use:

- analyser: `subagent_type: "Explore"`
- reproducer: `subagent_type: "general-purpose"`

If the ticket count is greater than 3, batch in waves of up to 6
parallel sub-agents (3 tickets × 2 agents). Tool budget gets ugly
above that.

### 6. Aggregate

When all sub-agents return, present one block per ticket:

    ## {KEY} — {TITLE}
    Browse: {BROWSE_URL}

    **Analyser**
    {analyser report verbatim}

    **Reproducer**
    {reproducer report verbatim}

End with a single summary line listing which tickets now have a
failing-test artifact and which do not.

The skill is read-and-propose only. It does not file Jira
comments, post GitHub issue comments, transition Jira tickets,
remove the `in-progress` label, or edit source code.

---

## Sub-agent prompt — analyser

Send this as the `prompt` for the `Explore` agent. Substitute
`{KEY}`, `{TITLE}`, `{BODY}`, and `{SOURCE}` literally.

> You are the analyser sub-agent for {SOURCE} ticket **{KEY}** on
> the fakeenergy Next.js project (working directory:
> `/Users/mmuschol/dev/brownfield/fakeenergy`). The ticket is a
> customer-voice complaint in German and is often misleading on
> purpose. Your task is to read past the noise to the likely cause.
>
> **Ticket title:** {TITLE}
>
> **Ticket body:**
> {BODY}
>
> Steps:
>
> 1. Read `docs/debugging-techniques.md`. Pick the technique most
>    likely to apply.
> 2. Locate the candidate code paths. Cite as `path:line`.
> 3. List 3–5 plausible root causes, ranked by the cost of the
>    cheapest probe that would falsify each one.
> 4. Do NOT edit code. Do NOT write tests. Observation only.
>
> Respond in under 250 words, in this shape:
>
> - **Likely root cause:** one sentence + `path:line`
> - **Backup hypotheses:** two bullets, each one sentence + `path:line`
> - **Cheapest next probe:** one shell command or grep that would
>   falsify the top hypothesis in under 10 seconds
> - **Technique used:** name from `docs/debugging-techniques.md`

## Sub-agent prompt — reproducer

Send this as the `prompt` for the `general-purpose` agent.

> You are the reproducer sub-agent for {SOURCE} ticket **{KEY}**
> on the fakeenergy Next.js project (working directory:
> `/Users/mmuschol/dev/brownfield/fakeenergy`).
>
> **Ticket title:** {TITLE}
>
> **Ticket body:**
> {BODY}
>
> Steps:
>
> 1. Read `docs/agent-debugging-playbook.md` Phase 4 (Reproducible
>    test before fix). Follow the convention there.
> 2. Write a minimal vitest case under `src/lib/__tests__/` named
>    `{key-slug}-repro.test.ts` that fails on the current branch
>    and would pass once the bug is fixed. Use the lowercased key
>    with non-alphanumerics replaced by `-` (e.g., `KAN-3` becomes
>    `kan-3`, `#5` becomes `gh-5`).
> 3. Run `npx vitest run --reporter=verbose
>    src/lib/__tests__/{key-slug}-repro.test.ts` and capture the
>    failure output.
> 4. Do NOT change any source file. Do NOT touch the bug itself.
>    The test must demonstrate the symptom only.
> 5. If the bug is purely visual (no unit-testable surface), say
>    so and propose a Playwright sketch or a manual repro instead.
>    Do not invent a unit test that does not actually fail.
>
> Respond in under 200 words, in this shape:
>
> - **Test file:** absolute path of the new test file
> - **Failing assertion:** one-line excerpt of the failure
> - **One-sentence fix direction:** what a minimal fix would
>   change. Do not implement.
> - If you skipped step 2 because the bug is visual, replace this
>   block with **Manual repro:** numbered steps a human can
>   follow in a browser.

---

## Failure modes to watch

- **MCP / gh not authenticated.**
  - Jira: stop and tell the user to run `/mcp` and pick
    `atlassian`.
  - GitHub: stop and tell the user to run `gh auth login`.
- **Empty default scope.** No tickets In Progress / labeled
  `in-progress` is the steady state when no debug session is
  live. Report and stop. Do not silently fall back to To Do or
  unlabeled tickets.
- **Single-key ticket is not "work this".** Refuse politely,
  surface current status (Jira) or labels (GitHub), and tell the
  user to drag the card or add the label.
- **Origin remote not on `github.com` but argument looks like
  GitHub.** Surface and ask — the user may be working against a
  fork.
- **Both sources present, ambiguous default.** If the origin is
  on GitHub AND the `atlassian` MCP is connected, default to
  GitHub but mention the Jira fallback in the confirm prompt so
  the user can correct.
- **Ticket lacks German body.** Some tickets are placeholders. If
  the description is empty or under 100 chars, skip the
  reproducer (it has nothing to work with) and run only the
  analyser.
- **Sub-agent runs longer than 3 minutes.** Cancel and surface
  partial output.

## Notes

- The skill is read-and-propose only. No comments posted, no
  labels removed, no fixes pushed.
- Project-local skill, scoped to fakeenergy. Adjust the test path
  in the reproducer prompt if you copy this skill into another
  project.
- Renaming consideration: the file path is still
  `.claude/skills/ticket-triage/SKILL.md` even though it now
  handles GitHub too. Rename the directory to `issue-triage` if
  you want the slash command to match the broader scope.
