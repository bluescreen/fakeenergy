---
name: bisect-symptom
description: Halve a failing input or a commit range to find the minimal trigger of a bug. Two modes — input bisection (give it a payload, get back the smallest version that still fails) and commit bisection via git bisect run. Use when the user says "/bisect-symptom", "bisect this", "find the minimal repro", or "when did this start failing".
---

# bisect-symptom

Implements technique 2 from `docs/debugging-techniques.md`. The
minimal repro is half the fix — once the trigger is reduced to
its smallest payload (or the regression is pinned to a single
commit), the cause is usually visible at a glance.

Two modes. The skill picks based on the argument shape.

## Mode A — Input bisection

Use when the user has a large failing input and wants the smallest
subset that still fails.

### Inputs

- A path to a JSON / JS / shell script that runs the failing case
  and exits non-zero on failure
- Or a JSON object inline

The probe script is the contract. The skill halves the input,
re-runs the probe, observes pass or fail, and recurses.

### Procedure

1. Read the probe script. Confirm it's a single-shot runner that
   exits 0 on pass, non-zero on fail. If unclear, ask the user.
2. Run the probe once with the full input. Confirm it fails.
3. Halve the input. Two strategies depending on input shape:
   - **Object**: drop half the keys
   - **Array**: drop half the elements
   - **String**: drop half the characters at a chosen split
4. Run the probe with each half. Three outcomes:
   - First half fails → recurse into first half
   - Second half fails → recurse into second half
   - Both halves pass → minimum lives at the boundary; return the
     full input minus one element at a time (linear walk)
5. Stop when no further reduction makes the bug vanish, or the
   input is smaller than five elements, whichever comes first.
6. Report the minimal input and the probe-pass-count.

### Output

- **Minimal failing input** (verbatim)
- **Probe runs:** N (so the user sees the cost)
- **Pattern observed:** one sentence on what the minimum has in
  common with the original failure

## Mode B — Commit bisection

Use when the user knows the bug exists at HEAD but believes it
worked at some earlier commit.

### Inputs

- A commit-ish that's known good (e.g., `main~50` or a tag)
- A test command that exits 0 when good, non-zero when bad

### Procedure

1. Confirm the test command exits 0 at the known-good commit and
   non-zero at HEAD. If either fails, abort with a clear message.
2. Run:

       git bisect start
       git bisect bad HEAD
       git bisect good <known-good>
       git bisect run <test-command>

3. Capture the output. The first bad commit is reported by git.
4. Run `git bisect reset` to return to HEAD.
5. Show the user:
   - First bad commit hash
   - One-line subject and author
   - Files changed in that commit
   - Suggested next probe (read those files, look for the trigger)

### Output

- **First bad commit:** hash + subject
- **Files changed:** list (max 10)
- **Suggested cheapest next probe:** one shell command

## Mode picking

If the argument is a file path or starts with `{`, use Mode A.
If the argument starts with a commit-ish (`HEAD~`, a tag, a
hash), use Mode B. Otherwise ask which mode the user wants.

## Failure modes

- **Probe is non-deterministic.** Mode A halts immediately and
  asks the user to wrap the probe in N runs with majority vote
  before continuing. A flaky probe leads bisection astray.
- **Bisection range is huge** (>500 commits). Warn the user about
  the cost and ask before starting.
- **Multiple bugs in the range.** Mode B may converge on a
  refactor commit that touched everything. Surface the result
  and offer to bisect a narrower range or a different file.
- **Test command itself broken.** If the test fails on the
  known-good commit, the test is the bug. Surface that.

## Notes

- Skill is observation-only. Does not commit, does not push.
- For Mode B, the skill leaves the working tree as it found it.
  `git bisect reset` is mandatory before reporting back.
- Pairs well with `fix-from-ticket` (after pinning the regressing
  commit, the fix is usually a one-line revert or a targeted
  change in the named file).
