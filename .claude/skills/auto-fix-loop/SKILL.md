---
name: auto-fix-loop
description: Spawn one autonomous bug-fix agent per open ticket, each on its own git worktree, in parallel. Three tiered pathways (fast / standard / heavy) sized to the bug. Each agent triages, reproduces, fixes, adversarial-reviews when the pathway demands it, and opens a draft PR. Logs progress to ~/.denkvis/memory/. Use when the user says "/auto-fix-loop", "fix all the in-progress tickets autonomously", "send the fleet", "do the whole loop", or "ship the in-progress tickets".
---

# auto-fix-loop

**Version: v1.2** (tiered pathways: fast / standard / heavy)

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

## Pathways

Three tiers, sized to the bug. The orchestrator picks one per
ticket from title/body keywords; the worker may downgrade or
escalate after Phase 1 if the hypothesis demands it.

| Pathway      | Best for                                              | Reproducer                  | Diff cap   | Adversarial review     | Phases run         |
|--------------|-------------------------------------------------------|-----------------------------|------------|------------------------|--------------------|
| **fast**     | typo, copy, label, CSS, rename                        | grep before/after           | ≤ 3 lines  | skipped                | 0, 1, 4, 5, 7–9    |
| **standard** (default) | logic bugs in one or two files               | failing vitest              | ≤ 10 lines | required               | 0–9 (full recipe)  |
| **heavy**    | races, multi-file, intermittent, architectural risk   | failing vitest + bisect/triangulation | ≤ 30 lines | required + triangulation | 0–9 + Phase 1.5 (bisect-symptom) |

**Picking heuristics (orchestrator):**

- **fast** if the ticket title/body matches any of: `typo`,
  `tippfehler`, `copy`, `wording`, `text`, `label`, `string`,
  `umbenennen`, `rename`, `placeholder`, `padding`, `margin`,
  `color`, `farbe`, `font`, `align`, `width`, `height`.
- **heavy** if the ticket title/body matches any of: `race`,
  `concurrency`, `intermittent`, `flaky`, `multi-file`,
  `architecture`, `cascade`, `unter last`, `under load`,
  `nondeterministic`, `random failure`.
- otherwise **standard**.

**Worker-side escalation rules** (append `pathway change: <from> →
<to>: <reason>` to the run log when triggered):

- **fast → standard** if Phase 1 hypothesis names a logic
  branch, math, or state mutation (not just a string/CSS edit),
  OR if the planned diff exceeds the 3-line cap.
- **standard → heavy** if the diff would touch more than three
  files, OR Phase 1 surfaces concurrency/timing language, OR
  three hypotheses fail in a row.
- **Downgrades are not permitted** without orchestrator
  confirmation — workers may only escalate. (Sandbagging into a
  cheaper lane masks risk.)

The fast lane skips the failing-vitest contract on purpose, but
**not** the evidence contract: a fast-lane worker must still
produce a `grep` before the fix that proves the bug is present
(the wrong string is in the file) and a `grep` after the fix that
proves it is gone. No grep-evidence pair, no PR.

## Inputs

- **No required argument:** default scope is **all open / not-done
  tickets** via the same source detection as `ticket-triage`
  (origin on github.com → `gh issue list --state open`; else
  Atlassian MCP → JQL `statusCategory != Done`).
- **Optional flags in the argument string:**
  - `--max=N` parallel cap (default 5)
  - `--source=jira|github` force source detection
  - `--dry` show the plan, confirm with the user, do not spawn
  - `--in-progress` narrow back to only `in-progress`-labelled
    GitHub issues / `In Progress` Jira tickets (the pre-v1.1
    default)
  - `--pathway=fast|standard|heavy` force one pathway across
    every ticket in this run, overriding the classifier (useful
    for "force fast on the whole queue" trial runs)

## Procedure

### 0. Print version banner

Before any other output, print exactly one line so the user can
see which build of the skill is running:

    auto-fix-loop v1.2 — tiered pathways (fast / standard / heavy)

Bump the version when you change the procedure or worker
contract; keep the banner one line.

### 1. Discover scope

Use the same source detection as `ticket-triage`. Fetch **all
open / not-done tickets** — do not filter by an `in-progress`
label or `In Progress` status. Specifically:

- GitHub: `gh issue list --state open` (no label filter).
- Jira: JQL `statusCategory != Done` (i.e. To Do + In Progress,
  excludes Done/closed).

Normalise each to:

    { key, title, body, source, browseUrl }

If empty, report and stop with the same message
`ticket-triage` uses for empty scope.

### 2. Classify each ticket

For each ticket, apply the **Pathways** picking heuristics above
to assign one of `fast | standard | heavy`. The classifier reads
title + body only; do not crack open the codebase to classify
(workers do that themselves in Phase 1).

If `--pathway=<x>` was passed, every ticket gets `<x>` regardless
of its text — record `pathway override (--pathway=<x>): <key>` in
the run log header so the override is auditable.

If a ticket matches both fast and heavy keywords (e.g., "rename
under load"), heavy wins — escalation is cheap, missed risk is
not.

### 3. Summarise and confirm

Print one summary block per ticket (4-6 lines, stripped of
misdirection — same shape as `ticket-triage`'s summarise step).
Include the assigned pathway as the first metadata line, e.g.

    [fast] KAN-12 — "Typo on solar landing"

Then ask, exactly:

> "Spawn N autonomous bug-fix agents in parallel on these
> ticket(s)? Pathway breakdown: F fast / S standard / H heavy.
> Each typically burns 1 min (fast) / 3-5 min (standard) /
> 5-10 min (heavy) of wall clock. (yes / no / pick subset)"

Stop on no. On `pick subset`, fan out only on the chosen keys.
The cost gate exists because N parallel agents is expensive.

### 4. Prepare the run log

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
    - Tickets: <comma-separated keys with pathway tags, e.g. `KAN-3 [standard], KAN-12 [fast]`>
    - Pathway breakdown: F=<n> S=<n> H=<n>
    - Pathway override: <none | --pathway=<x>>
    - Started: <iso>
    - Status: in-progress

    ## Progress (append-only)

Each worker appends its own block here. The orchestrator never
edits worker entries; on completion it appends only a `## Summary`
block at the bottom and updates `Status:` in the header.

### 5. Fan out

For each ticket, in the **same response**, call `Agent` with:

- `subagent_type`: `general-purpose`
- `isolation`: `"worktree"` — each worker gets its own checkout
- `description`: `"auto-fix <KEY> [<pathway>]"`
- `model`: pick by pathway —
  - `fast` → `haiku` (the recipe is mostly grep + edit + npm test;
    cheap reasoning is enough)
  - `standard` → `sonnet` (default; balanced cost vs. depth)
  - `heavy` → `sonnet` (or `opus` if the queue is small and the
    bugs are gnarly; opus only when the user explicitly opts in,
    because cost ramps fast)
- `prompt`: the worker template below, with `{KEY}`, `{TITLE}`,
  `{BODY}`, `{SOURCE}`, `{BROWSE_URL}`, `{RUN_LOG_PATH}`,
  `{PATHWAY}` substituted literally.

Cap at `--max` parallel. If more tickets than the cap, batch in
waves. Wait for each wave before the next.

### 6. Aggregate

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
> step on sibling agents. Your job: triage, reproduce (per the
> pathway), fix, self-review (per the pathway), open a draft PR,
> record what happened.
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
> **Pathway:** {PATHWAY} (one of `fast | standard | heavy`).
> Pathway gates the work you do:
>
> - **fast:** skip Phase 2 (vitest) and Phase 6 (adversarial).
>   Reproducer = pre-fix grep evidence + post-fix grep evidence
>   that the wrong text/style is present then gone. Diff cap
>   3 lines. If your hypothesis names a logic branch, math, or
>   state mutation rather than a string/CSS/label change, OR if
>   the planned diff exceeds 3 lines, **escalate to standard**
>   and append `pathway change: fast → standard: <reason>`.
> - **standard:** full Phase 0–9 recipe. Vitest reproducer,
>   adversarial review required. Diff cap 10 lines. If the diff
>   would touch more than three files, OR three hypotheses fail
>   in a row, OR Phase 1 surfaces concurrency/timing language,
>   **escalate to heavy** and append `pathway change: standard
>   → heavy: <reason>`.
> - **heavy:** full recipe + Phase 1.5 (bisect-symptom) + Phase 6
>   triangulation (two `Explore` sub-agents on disjoint scopes
>   compare first three observations). Diff cap 30 lines.
>
> **Downgrades** (e.g. heavy → standard) are forbidden — only the
> orchestrator may relax a pathway. If you think the assigned
> tier is too heavy, do the work anyway and surface it in the
> learning entry instead. (Sandbagging into a cheaper lane masks
> risk.)
>
> **Tool-budget caps per phase** (cumulative; if exceeded, append
> `BUDGET BREACH: phase <N> over by <K>` and bail to Phase 8
> with status BLOCKED — do not loop):
>
> - Phase 0: 1 grep
> - Phase 1: 8 reads + 8 greps total
> - Phase 1.5 (heavy only): 1 bisect run
> - Phase 2: 1 test-file write + 3 `npm test` invocations
> - Phase 4: 1 edit (fast) / 5 edits (standard) / 10 edits (heavy)
> - Phase 5: 2 `npm test` invocations
> - Phase 6: 1 `git diff` + (heavy only) 2 sub-agent spawns
>
> **Anti-patterns to avoid** (each is a known failure mode from
> `docs/agent-debugging-playbook.md`):
>
> - **Anchoring:** committing to the first plausible cause without
>   enumerating alternatives. Phase 1 enforces ≥3 hypotheses.
> - **Hallucinated repro:** claiming a failure without running
>   it. Every reproducer claim must include the command output.
> - **Premature confidence:** "fixed" without the green test
>   output. Phase 5 must show the suite output line.
> - **Probe inflation:** running three commands when one would
>   decide. Pick the cheapest probe per hypothesis, run it, move
>   on.
> - **Code-blindness via Read:** reading large files in chunks
>   and missing content past the window. Use `grep` for existence
>   checks, never a full read.
>
> Append your header to the run log first thing:
>
>     ### {KEY} [{PATHWAY}] — {TITLE}
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
> ### Phase 1 — triage (anchoring guard)
>
> Enumerate **at least three plausible hypotheses** before
> probing. Rank them by the cheapest probe that would falsify
> each. This is the anchoring guard — without ≥3 hypotheses on
> paper you cannot proceed. (`fast` pathway may stop at one
> hypothesis if the title/body explicitly names a string/style
> change with `path:line` precision; otherwise still ≥3.)
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
> 1. Enumerate ≥3 hypotheses. Pick a technique to falsify each.
> 2. Run the cheapest probe (grep > targeted read > full read).
>    Eliminate or confirm. Re-rank. Repeat until one stands.
> 3. Commit to one top hypothesis.
>
> If three hypotheses in a row fail to be confirmed by their
> cheapest probe, **escalate** (standard → heavy) and re-enumerate
> with a wider scope.
>
> Append: `hypotheses: N enumerated; top: <one-line>`.
>
> Read `docs/debugging-techniques.md` only if none of the above
> fit your symptom shape.
>
> ### Phase 1.5 — bisect-symptom (heavy only)
>
> Run only on the `heavy` pathway. Use `git bisect run` against
> the test command from Phase 2 (or the failing reproducer
> command). Establish the first bad commit. Capture hash +
> subject + files-changed.
>
> If the bisect range is unknown, skip and append
> `bisect skipped: no known-good commit`. Otherwise append
> `bisect: first bad <hash> — <subject>`.
>
> Always run `git bisect reset` before continuing to Phase 2.
>
> ### Phase 2 — reproducer (pathway-conditional)
>
> **fast:** Run a `grep` that proves the wrong text/style is in
> the codebase right now. Capture exact `path:line` of every
> match. Append `pre-fix grep: <pattern> → N matches at <paths>`.
> No vitest case is written. Skip the rest of Phase 2 and
> continue to Phase 4.
>
> **standard / heavy:** Reproducer contract — write a vitest case
> that fails on this branch, would pass after fix, demonstrates
> the symptom only. If the test does not actually fail, the bug
> is not unit-testable from here — bail.
>
> 1. Write a vitest at `src/lib/__tests__/<key-slug>-repro.test.ts`
>    that fails on the current branch and would pass after fix.
>    Slug rule: lowercase the key, replace non-alphanumerics with
>    `-` (so `KAN-3` → `kan-3`, `#5` → `gh-5`).
> 2. Run it. Confirm it fails. Capture the failure output line
>    in the run log — claiming a failing repro without the
>    captured output is a hallucinated repro and is forbidden.
>
> If the test does not actually fail, append
> `BLOCKED: reproducer does not fail`, jump to Phase 8 with
> status BLOCKED and the reason, then return.
>
> Otherwise append `reproducer fails as expected: <output line>`.
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
> ### Phase 4 — fix (pathway-capped diff)
>
> Create the fix branch:
>
>     git checkout -b fix/<key-slug>
>
> Apply the minimum diff that makes the reproducer pass / removes
> the wrong text. Hard caps per pathway:
>
> - **fast:** ≤ 3 changed lines. If your fix needs more, escalate
>   to standard before editing — do not exceed the cap silently.
> - **standard:** ≤ 10 changed lines, ≤ 3 files touched.
> - **heavy:** ≤ 30 changed lines, ≤ 5 files touched.
>
> If the diff would exceed your cap, append
> `pathway change: <from> → <to>: cap exceeded` and either
> escalate (fast → standard, standard → heavy) or, if you are
> already on heavy, bail to Phase 8 with
> `BLOCKED: heavy diff cap exceeded — needs human plan-gate`.
>
> No adjacent refactors. No new dependencies. No defensive guards
> the bug did not require.
>
> Append: `fix applied: <one-line>`.
>
> ### Phase 5 — verify (pathway-conditional)
>
> Run `npm test -- --reporter=dot` (compact output, only failures
> verbose). If the previously-failing reproducer (or, on the
> fast lane, the suite as a whole) now passes AND no other tests
> broke, continue.
>
> **fast** additionally: re-run the grep from Phase 2. The match
> count must drop to zero (or to the expected post-fix value).
> Append `post-fix grep: <pattern> → 0 matches`. The grep-pair is
> the fast lane's evidence contract — no zero-match grep, no PR.
>
> If anything broke, roll the fix back
> (`git checkout HEAD~ -- <file>`), append
> `BLOCKED: fix broke N other test(s)`, jump to Phase 8 with
> status BLOCKED, and return.
>
> Otherwise append `tests green`.
>
> ### Phase 6 — adversarial self-review (pathway-conditional)
>
> **fast:** Skipped. The grep-pair from Phase 5 is the only
> evidence the fast lane requires. Append
> `adversarial review: skipped (fast pathway)` and continue.
>
> **standard:** Read your own diff with `git diff main...HEAD`.
> Adopt a fresh-context posture: "What is one concrete reason
> this fix is wrong?". Look for missed edge cases, unintended
> side effects, tests that pass for the wrong reason.
>
> **heavy:** Same as standard, plus **triangulation** — spawn two
> `Explore` sub-agents on disjoint file scopes (one on the fix
> file(s), one on adjacent modules) and ask each for its first
> three observations on the diff. If they converge on the same
> concern, treat as a must-fix. If they diverge wildly, the
> hypothesis is underspecified — bail to Phase 8 with
> `BLOCKED: triangulation divergent`.
>
> If you find a **must-fix** issue (any pathway), do NOT open the
> PR. Append `BLOCKED: adversarial review: <one-line>`, jump to
> Phase 8 with status BLOCKED, and return.
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
