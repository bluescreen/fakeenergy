---
name: adversarial-review
description: Spawn a fresh sub-agent prompted to find one reason a proposed fix is wrong. Reviews the diff between the current branch and main with no priors. Use when the user says "/adversarial-review", "find a reason this fix is wrong", or "second-opinion this fix" after a change is staged or committed.
---

# adversarial-review

Variant of technique 7 from `docs/debugging-techniques.md`. The
fixing agent is anchored on the hypothesis that produced the fix
and tends to skip inconvenient edge cases. A fresh sub-agent
prompted as "find one reason this is wrong" surfaces the cases
the fixer rationalised away.

Pairs naturally with `fix-from-ticket` after the PR is open but
before merging.

## Inputs

- **No required argument.** By default, reviews
  `git diff main...HEAD` plus any staged-but-not-committed
  changes.
- **Optional argument:** a path or glob to scope the review (e.g.,
  `src/lib/billing.ts`).

## Procedure

### 1. Gather the diff

Run, in order:

    git fetch origin main --quiet
    git diff origin/main...HEAD          # committed changes on this branch
    git diff --staged                    # staged but not committed
    git diff                             # unstaged

If all three are empty, stop with "No diff to review on this
branch vs main."

If a scope argument was given, narrow each diff to that path.

### 2. Identify the symptom claim

Look at the most recent commit message on this branch. If it
references a Jira key (e.g., `<projectKey>-3`), fetch the ticket via
`mcp__atlassian__searchJiraIssuesUsingJql` for context. If no
Jira key, use the commit message body as the claimed symptom.

### 3. Spawn the adversary

Call the `Agent` tool once with `subagent_type: "general-purpose"`
and the prompt below. The sub-agent gets only the diff and the
symptom claim, no context from this conversation, no priors from
the fixing agent.

Prompt template (substitute `{DIFF}` and `{SYMPTOM}`):

> You are an adversarial reviewer. The author of this diff
> believes it fixes the symptom below. Your job is to find one
> concrete reason the fix is wrong, incomplete, or introduces a
> new problem. Do not be polite. Be specific. If you genuinely
> cannot find anything, say so explicitly.
>
> **Symptom the author claims to fix:**
> {SYMPTOM}
>
> **Diff:**
> ```
> {DIFF}
> ```
>
> Steps:
>
> 1. Read the diff carefully. Do not assume the author considered
>    obvious cases.
> 2. List edge cases the diff does NOT handle. For each, name a
>    concrete input that would break the new code.
> 3. Check the test coverage in the diff. Does any new test
>    actually fail before the fix and pass after? Or is it a
>    tautology?
> 4. Check for unintended side effects: did the fix change
>    behaviour for inputs that were not part of the symptom?
> 5. Check whether the fix would have been caught by an existing
>    invariant somewhere — e.g., did the codebase have a sibling
>    branch that already handled this case differently?
>
> Output, under 250 words:
>
> - **One concrete reason this is wrong**, or "Nothing concrete
>   to flag."
> - **Specific failing input** if applicable, e.g., a vitest case
>   that would expose the gap.
> - **Severity:** "must-fix" / "should-discuss" / "nit".
> - One-sentence suggested counter-fix or extra test.

### 4. Aggregate

Surface the sub-agent's report to the user verbatim. Do not
summarise it, do not soften it, do not add caveats. The point is
to land the adversarial signal undiluted.

End with one line stating the severity verdict and asking the
user how to proceed:

- "must-fix" → recommend stopping merge until addressed
- "should-discuss" → suggest a comment on the PR
- "nit" → user's call

Do not auto-revert. Do not auto-comment. Surface and stop.

## Failure modes

- **Empty diff.** Stop. Nothing to review.
- **Adversary returns a vague answer** ("could potentially be
  improved"). Re-prompt once with "Be more specific. Name an
  input." If still vague, surface as-is and note the weakness.
- **Adversary finds nothing.** Report that, do not invent
  problems. A clean "nothing concrete to flag" is a valid result.

## Notes

- The skill never modifies code. It does not commit. It does not
  comment on the PR.
- One adversary per invocation. If the user wants triangulation,
  re-invoke and the second adversary will see the first
  adversary's response (because it's now in conversation
  context). That's a feature, not a bug — the second adversary
  can attack the first adversary's blind spots too.
- Best invoked right after `fix-from-ticket` and before merging.
