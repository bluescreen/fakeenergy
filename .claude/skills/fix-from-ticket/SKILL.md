---
name: fix-from-ticket
description: Close the loop from ticket-triage. Take an In-Progress Jira ticket, its existing reproducer test if any, write the minimal fix on a fix/<key> branch, run the suite, commit, and open a draft PR via gh. Use when the user says "/fix-from-ticket <KEY>", "fix the ticket I'm on", or "land the fix for <KEY>".
---

# fix-from-ticket

End-of-loop skill. Counterpart to `ticket-triage`. Takes one
In-Progress ticket plus its reproducer artifact (if `ticket-triage`
already wrote one), produces a minimal fix on a fix branch with a
green test suite, and opens a draft PR.

## Prerequisites

1. **Working tree clean** on the current branch. If not, refuse
   with the diff summary and ask the user to commit or stash.
2. **Ticket is In Progress on the board.** Same gate as
   `ticket-triage`.
3. **gh CLI installed and authenticated** for the PR step. If
   not available, skill stops at the commit step and tells the
   user to open the PR manually.
4. **Reproducer test ideally exists.** Check
   `src/lib/__tests__/<key-lowercase>-repro.test.ts`. If absent,
   skill writes one before fixing — same convention as the
   `ticket-triage` reproducer prompt.

## Inputs

- **Argument (required):** a single Jira ticket key, e.g.,
  `<projectKey>-3`.

## Procedure

### 1. Resolve and gate

- Fetch ticket via `mcp__atlassian__searchJiraIssuesUsingJql` with
  `key = "<KEY>" AND status = "In Progress"`. Refuse on empty.
- Run `git status --porcelain`. Refuse on dirty tree.
- Confirm `gh auth status` succeeds. If not, note "PR step will
  be skipped" and continue.

### 2. Branch off

    git checkout -b fix/<KEY-LOWERCASE>

If the branch already exists, switch to it and continue. Do not
force-create.

### 3. Confirm or write the reproducer

Look for `src/lib/__tests__/<key-lowercase>-repro.test.ts`.

- If present: run it, confirm it fails on this branch.
- If absent: spawn an `Explore` sub-agent prompted to write the
  failing test using the same prompt template as `ticket-triage`'s
  reproducer step, then run it and confirm failure.

If the test passes (no failure observed), stop and ask the user.
The contract is "failing test before fix" — without that signal,
the fix has nothing to verify against.

### 4. Diagnose

If `ticket-triage` left an analyser report in conversation context,
trust the top hypothesis. Otherwise spawn one analyser sub-agent
(per `ticket-triage`'s analyser prompt) to produce the ranked
hypothesis tree before touching code.

### 5. Apply the minimal fix

Edit only the file(s) named by the analyser. Keep the diff under
ten lines unless the analyser explicitly justified more. No
adjacent refactors. No new dependencies. No defensive null guards
that the bug did not require.

### 6. Run the suite

    npm test

If the previously-failing reproducer now passes and no other
tests broke, continue. If anything fails, surface the output and
stop — do not commit a red suite.

### 7. Commit

Conventional message:

    git commit -m "fix(<area>): <one-line summary>

    Closes <KEY> on the Jira board.

    Repro: src/lib/__tests__/<key-lowercase>-repro.test.ts
    Cause: <one sentence>
    Fix: <one sentence, ten words or less>"

`<area>` is the top-level dir under `src/` that the fix touched
(e.g., `lib`, `components`).

### 8. Push and open draft PR

    git push -u origin fix/<key-lowercase>
    gh pr create --draft \
      --title "fix(<area>): <one-line>" \
      --body-file <(generate-body)

The PR body should include:

- Link to the Jira ticket (`<browseBase>/browse/<KEY>`, where
  `browseBase` comes from `getAccessibleAtlassianResources`)
- The customer's symptom in one paragraph
- The diagnosed cause in one paragraph
- The fix in one paragraph
- "Test plan" with the path of the reproducer test

Do not transition the Jira ticket. The user moves it.

### 9. Report

Reply with:

- Branch name
- Commit hash
- PR URL
- One-line summary

## Failure modes

- **Dirty working tree.** Stop. Ask user to commit or stash.
- **Reproducer fails to fail.** The bug repro is wrong, the bug
  is fixed already, or the symptom does not unit-test. Stop and
  surface the discrepancy.
- **Fix breaks unrelated tests.** Roll back the diff, surface
  the failures, ask the user. Do not commit a red suite.
- **gh not authenticated.** Stop after commit. Surface the manual
  PR command for the user to run.
- **Analyser hypothesis tree disagrees with itself.** If the top
  two candidates disagree on file path, do not apply a fix —
  spawn a fresh sub-agent for triangulation per the playbook.

## Notes

- Skill writes one fix at a time, one commit, one PR. No batching
  across tickets.
- Read-only access to Jira. Does not transition the ticket, does
  not comment on the issue.
- Pairs naturally with `adversarial-review` after the PR is open
  but before merging. Run that next.
