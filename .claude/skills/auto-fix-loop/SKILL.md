---
name: auto-fix-loop
description: Spawn one autonomous bug-fix agent per in-progress ticket. Each agent triages, reproduces, fixes, adversarial-reviews, and opens a draft PR — all on its own git worktree, in parallel. Logs progress to ~/.denkvis/memory/. Use when the user says "/auto-fix-loop", "fix all the in-progress tickets autonomously", "send the fleet", "do the whole loop", or "ship the in-progress tickets".
---

# auto-fix-loop

End-to-end autonomous bug-fix orchestration. One general-purpose
sub-agent per ticket. Each runs in its own git worktree, follows
the recipe (triage → reproduce → fix → self-review → draft PR),
and appends progress to a shared memory log so the run is
auditable across sessions.

The skill composes the existing toolkit:

- `ticket-triage` (analyse + reproduce)
- `frontend-repro` (browser repro for visible bugs)
- `fix-from-ticket` (branch + fix + draft PR)
- `adversarial-review` (fresh-context attack on the fix)

Each worker also posts one final comment back to the source ticket
so the issue tracker is the source of truth for human reviewers —
no need to dig through git, the run log, or chat history.

**Learnings memory.** Each worker reads prior learnings before
triage and writes one durable entry after Phase 8. Path:

    ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/<key-slug>-<iso>.md

One file per worker run, never edited after write. Future workers
glob the directory at the start of triage so the second run knows
what the first run already established. Memory is the connective
tissue between sessions.

Sub-agents do not call those skills as Skill tools (no Skill
access in sub-agent context). Instead, this skill inlines the
core recipe from each into the worker's prompt and runs them
sequentially per ticket inside the worker.

## Inputs

- **No required argument:** default scope is all in-progress
  tickets via the same source detection as `ticket-triage`
  (origin on github.com → label `in-progress`; else Atlassian
  MCP → status `In Progress`).
- **Optional flags in the argument string:**
  - `--max=N` parallel cap (default 5)
  - `--source=jira|github` force source detection
  - `--dry` show the plan, confirm with the user, do not spawn

## Procedure

### 1. Discover scope

Use the same source detection as `ticket-triage`. Fetch tickets,
normalise each to:

    { key, title, body, source, browseUrl }

If empty, report and stop with the same message
`ticket-triage` uses for empty scope. Do not silently fall back
to To Do or unlabelled tickets.

### 2. Summarise and confirm

Print one summary block per ticket (4-6 lines, stripped of
misdirection — same shape as `ticket-triage`'s summarise step).

Then ask, exactly:

> "Spawn N autonomous bug-fix agents in parallel on these
> ticket(s)? Each one will open its own draft PR. Each typically
> burns 3-5 minutes of wall clock and 30-60 sub-tool calls.
> (yes / no / pick subset)"

Stop on no. On `pick subset`, fan out only on the chosen keys.
The cost gate exists because N parallel agents is expensive.

### 3. Prepare the run log

Compute run ID: `auto-fix-<UTC-isoZ-no-colons>`, e.g.
`auto-fix-2026-05-07T203015Z`.

Run-log path:
`~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/runs/<run-id>.md`

Create directories with `mkdir -p`. Write the run header:

    ---
    name: <run-id>
    description: Autonomous bug-fix run on <N> tickets via auto-fix-loop
    type: project
    ---

    # <run-id>

    - Source: github | jira
    - Tickets: <comma-separated keys>
    - Started: <iso>
    - Status: in-progress

    ## Progress (append-only)

Each worker appends its own block here. The orchestrator never
edits worker entries; on completion it appends only a `## Summary`
block at the bottom and updates `Status:` in the header.

### 4. Fan out

For each ticket, in the **same response**, call `Agent` with:

- `subagent_type`: `general-purpose`
- `isolation`: `"worktree"` — each worker gets its own checkout
- `description`: `"auto-fix <KEY>"`
- `model`: `sonnet` (cheaper than opus, sufficient for the recipe;
  drop to `haiku` to halve cost again at the price of weaker
  reasoning on the harder bugs — recommended only when the queue
  is the easy-win subset)
- `prompt`: the worker template below, with `{KEY}`, `{TITLE}`,
  `{BODY}`, `{SOURCE}`, `{BROWSE_URL}`, `{RUN_LOG_PATH}`
  substituted literally.

Cap at `--max` parallel. If more tickets than the cap, batch in
waves. Wait for each wave before the next.

### 5. Aggregate

When the last worker returns, read the run-log file. Each worker
left an append block. Render to the user as one row per ticket:

| KEY | Status | PR | Note |
|---|---|---|---|

End with:

- Total PRs open
- Total blocked (worker stopped before PR — needs human review)
- Total errored (worker crashed — needs investigation)
- Wall clock for the whole run
- Run-log path for full detail

Append a `## Summary` block to the run log with the same totals,
and flip the header `Status: complete` (or `Status: partial` if
errors).

The skill never auto-merges. PRs are draft, the user reviews and
merges manually.

---

## Worker prompt — autonomous bug-fix agent

Send this as the `prompt` for each `Agent` call. The worker runs
inside its own worktree. It commits, pushes, and opens a draft PR
without needing to coordinate with siblings.

> You are an autonomous bug-fix agent for {SOURCE} ticket
> **{KEY}** on the fakeenergy Next.js project. You run inside
> your own git worktree — commit and push freely, you will not
> step on sibling agents. Your job: triage, reproduce, fix,
> self-review, open a draft PR, record what happened.
>
> **Ticket title:** {TITLE}
>
> **Ticket body:**
> {BODY}
>
> **Browse URL:** {BROWSE_URL}
> **Run log:** {RUN_LOG_PATH} (append-only; never edit other
> agents' lines)
>
> Append your header to the run log first thing:
>
>     ### {KEY} — {TITLE}
>     - <iso>: started in worktree
>
> After every phase, append one line: `- <iso>: <phase>: <result>`.
>
> ### Phase 0 — read prior learnings
>
> Glob `~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/`.
> If empty, append `no priors` and skip to Phase 1. Otherwise read
> only the **Lesson** lines (one grep, not a full file read each):
>
>     grep -h "^- \*\*Lesson" ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/*.md
>
> Use as priors:
>
> - If a prior lesson maps a similar customer-voice symptom to a
>   specific file, start your triage there.
> - If a prior is BLOCKED on the same key, try a different
>   strategy. Do not repeat the same failure.
>
> Append `read N lessons; <relevant or none>` to the run log.
>
> ### Phase 1 — triage
>
> Common techniques (one usually fits — pick without reading the
> full docs unless you need depth):
>
> - Hypothesis tree, ranked by cheapest probe
> - Differential debugging (working vs broken inputs)
> - Failing test first
> - Causal chain past the first plausible cause
> - State snapshot
> - Concurrency repro under contention
>
> Steps:
>
> 1. Pick a technique.
> 2. Grep / read targeted files only. Note `path:line` evidence.
> 3. Commit to one top hypothesis.
>
> Append: `hypothesis: <one-line>`.
>
> Read `docs/debugging-techniques.md` only if none of the above
> fit your symptom shape.
>
> ### Phase 2 — reproducer
>
> Reproducer contract (no need to read the playbook — this is the
> whole rule): write a vitest case that fails on this branch,
> would pass after fix, demonstrates the symptom only. If the
> test does not actually fail, the bug is not unit-testable from
> here — bail.
>
> 1. Write a vitest at `src/lib/__tests__/<key-slug>-repro.test.ts`
>    that fails on the current branch and would pass after fix.
>    Slug rule: lowercase the key, replace non-alphanumerics with
>    `-` (so `KAN-3` → `kan-3`, `#5` → `gh-5`).
> 3. Run it. Confirm it fails.
>
> If the test does not actually fail, append
> `BLOCKED: reproducer does not fail`, jump to Phase 8 with
> status BLOCKED and the reason, then return.
>
> Otherwise append `reproducer fails as expected`.
>
> ### Phase 3 — visible-bug repro (only if applicable)
>
> If the ticket body mentions visual cues ("Banner", "Cookie",
> "anzeigen", "format", "screenshot", "looks", "Preise", "rote
> Fehlermeldung"), the bug has a visible surface.
>
> Try the chrome-devtools MCP if loaded
> (`mcp__chrome_devtools__*` tools). Drive the dev server at
> `http://localhost:3000`, capture screenshots to
> `docs/repro-screenshots/<key-slug>/`. If the dev server is
> not running, attempt `npm run dev` in the background; if that
> fails, skip browser repro and note it.
>
> Append either `browser repro captured: <path>` or
> `skipped browser repro: <reason>`.
>
> ### Phase 4 — fix
>
> Create the fix branch:
>
>     git checkout -b fix/<key-slug>
>
> Apply the minimum diff that makes the reproducer pass. Keep
> under ten changed lines unless the hypothesis demands more. No
> adjacent refactors. No new dependencies. No defensive guards
> the bug did not require.
>
> Append: `fix applied: <one-line>`.
>
> ### Phase 5 — full suite
>
> Run `npm test -- --reporter=dot` (compact output, only failures
> verbose). If the previously-failing reproducer now passes AND
> no other tests broke, continue.
>
> If anything else broke, roll the fix back
> (`git checkout HEAD~ -- <file>`), append
> `BLOCKED: fix broke N other test(s)`, jump to Phase 8 with
> status BLOCKED, and return.
>
> Otherwise append `tests green`.
>
> ### Phase 6 — adversarial self-review
>
> Read your own diff with `git diff main...HEAD`. Adopt a
> fresh-context posture: "What is one concrete reason this fix
> is wrong?". Look for missed edge cases, unintended side
> effects, tests that pass for the wrong reason.
>
> If you find a **must-fix** issue, do NOT open the PR. Append
> `BLOCKED: adversarial review: <one-line>`, jump to Phase 8
> with status BLOCKED, and return.
>
> If the issue is should-discuss or nit, note it but proceed.
>
> Append `adversarial review: <verdict>`.
>
> ### Phase 7 — commit and PR
>
> Commit:
>
>     git commit -am "fix(<area>): <one-line summary>
>
>     Closes {KEY}.
>
>     Repro: src/lib/__tests__/<key-slug>-repro.test.ts
>     Cause: <one sentence>
>     Fix: <one sentence>"
>
> Push:
>
>     git push -u origin fix/<key-slug>
>
> Open a draft PR via gh:
>
>     gh pr create --draft \
>       --title "fix(<area>): <one-line>" \
>       --body "<body referencing {BROWSE_URL}, the repro path,
>               and any review notes>"
>
> Append `PR open: <pr-url>`. Continue to Phase 8 with status
> `PR-OPEN`.
>
> ### Phase 8 — comment back to the source ticket
>
> Post one final comment to the source ticket so a human
> reviewer can see the outcome without leaving the issue tracker.
>
> **Comment body** for status `PR-OPEN`:
>
>     **Auto-fix worker — PR open**
>
>     Hypothesis: <Phase 1 one-liner>
>     Reproducer: src/lib/__tests__/<key-slug>-repro.test.ts
>     Cause: <one sentence>
>     Fix: <one sentence>
>     Adversarial review: <verdict from Phase 6>
>
>     PR (draft, awaiting human merge): <pr-url>
>
> **Comment body** for status `BLOCKED`:
>
>     **Auto-fix worker — blocked**
>
>     Phase reached: <phase number and name>
>     Reason: <one-line block reason>
>     Hypothesis at time of block: <Phase 1 one-liner, or "n/a">
>     Suggested next step: <one short sentence>
>
>     Run log: {RUN_LOG_PATH}
>
> **Posting mechanics:**
>
> - If `{SOURCE} == "github"`: derive `<owner>/<repo>` from the
>   origin remote, then run
>
>       gh issue comment <number> --repo <owner>/<repo> \
>         --body-file <tmpfile>
>
>   `<number>` is the bare integer (`7`, not `#7`).
>
> - If `{SOURCE} == "jira"`: call
>   `mcp__atlassian__addCommentToJiraIssue` with the `cloudId`
>   from `mcp__atlassian__getAccessibleAtlassianResources`, the
>   ticket key, and the comment body. Markdown formatting works.
>
> If the comment-post fails (auth, rate limit, etc.), append
> `WARN: comment-post failed: <stderr>` to the run log but do
> NOT change the worker's overall status. The PR or BLOCKED
> outcome stands; only the issue-tracker breadcrumb is missing.
>
> ### Phase 9 — write a learning entry
>
> Write a single new file to:
>
>     ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/<key-slug>-<iso-utc-no-colons>.md
>
> Create the directory with `mkdir -p` if missing. Use this exact
> shape:
>
>     ---
>     name: learning-<key-slug>-<iso>
>     description: Auto-fix learning on {KEY} ({STATUS})
>     type: project
>     ---
>
>     # {KEY} — {TITLE}
>
>     - **Status:** PR-OPEN | BLOCKED
>     - **Source:** {SOURCE}
>     - **Symptom (one line, customer-voice excerpt):** ...
>     - **Hypothesis pursued:** ...
>     - **Technique used (from docs/debugging-techniques.md):** ...
>     - **Outcome:** ...
>     - **Lesson for future workers:** one sentence — what to
>       remember next time a symptom of this shape arrives.
>     - **PR / Run log:** <pr-url or run-log-path>
>
> Keep it under 30 lines. The lesson is the durable bit. Examples:
>
> - "When a customer reports the bonus is wrong but a sibling's
>   account is also wrong-by-the-same-amount, the bug is in the
>   cascade ordering, not the data."
> - "Solar VAT bugs surface as 'refund too low' from the customer;
>   the line item label looks correct, the math is the suspect."
> - "BLOCKED on race conditions: a mutex passes the unit test but
>   adversarial review catches it. Need a real atomic primitive,
>   not in-memory locks."
>
> Append `learning written: <path>` to the run log.
>
> ### Return value
>
> End your run by returning a three-line report:
>
>     KEY: {KEY}
>     STATUS: PR-OPEN | BLOCKED | ERROR
>     PR: <url or "—">
>     NOTE: <one-line summary>

---

## Failure modes

- **One worker blocks, others succeed.** Workers are
  independent. Surface the blocked one in the aggregate, do not
  abort siblings.
- **Worker exceeds 5 minutes wall clock.** Cancel via TaskStop
  and record `ERROR: timeout` for that key. Read whatever the
  worker appended to the log so far.
- **Worktree creation fails** (disk pressure, lock files,
  uncommitted changes on the main worktree). Fall back to serial
  execution on the main worktree, one ticket at a time. Warn the
  user.
- **All workers block on the same cause** (e.g., the test
  framework itself broken, or `npm test` not runnable). Stop
  after the first three blocks and ask the user instead of
  burning budget on the rest.
- **Memory write fails.** Surface a warning but do not block
  forward progress — the PRs are the real artifact, the run log
  is just a record.
- **gh pr create fails** (auth, no remote, no default branch
  detected). Worker leaves the branch pushed and reports
  `BLOCKED: pr create failed: <stderr>`. The user can open the
  PR manually from the Compare URL.
- **Comment-post fails** (no Atlassian MCP, gh issue comment
  rejects, etc.). Logged as a warning, does not change the
  worker's overall status. The PR is the durable artifact, the
  issue comment is just a breadcrumb.

## Notes

- Each worker's PR is **draft**. The user reviews and merges
  manually. This skill never auto-merges. There is no
  `--auto-merge` flag, intentionally.
- Worktrees are auto-created via the `Agent` tool's
  `isolation: "worktree"` parameter. Each worker's commits live
  on its own branch; the worktree path and branch are returned
  in the agent result. Worktrees with no changes are
  auto-cleaned, ones with commits persist for inspection.
- Memory writes follow PARA. Run logs land under
  `01-projects/fakeenergy-debugging-demo/runs/`. They are not
  indexed (subdirectory of a project, not the project file
  itself). Reference them from
  `01-projects/fakeenergy-debugging-demo.md` if you want a
  cross-session breadcrumb.
- This skill is the orchestration layer. The five sub-skills
  (`ticket-triage`, `fix-from-ticket`, `frontend-repro`,
  `adversarial-review`, `bisect-symptom`) remain individually
  useful when you want to run one phase by hand. `auto-fix-loop`
  is what you run when you trust the recipe enough to take coffee.
