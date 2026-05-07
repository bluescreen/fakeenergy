# Agent debugging playbook

Companion to `docs/debugging-techniques.md`. That doc covers the
techniques an agent should use. This doc covers the techniques you
use *on the agent* to keep a debugging session productive.

The goal is to make the agent fast, honest, and falsifiable. Most
agent debugging sessions fail not because the bug is hard, but
because the agent commits to the first plausible cause and then
spends the rest of the session defending it.

---

## Phase 1 — Triage prompt

Hand the agent only the symptom. No file paths. No suspected cause.
No "I think it might be...". The agent should reach the suspect set
on its own. Anchoring early kills hypothesis breadth.

**Good:**

> Solar refunds came in roughly 19 percent under expectation last
> month. Find the cause. Do not change code yet.

**Bad:**

> I think the VAT line in `billing.ts` is wrong. Can you check?

The bad version pre-commits the agent to one branch of the hypothesis
tree. The agent will find evidence for your hypothesis whether or
not it is correct. Confirmation bias is the dominant failure mode.

---

## Phase 2 — Hypothesis enumeration

Force the agent to enumerate before probing. Three to five plausible
causes, ranked by cost-to-falsify, before any tool calls beyond
reading files. If the agent jumps straight to a fix, stop and roll
back to enumeration.

**Driver prompt:**

> Before any code change or test run, list five plausible causes,
> ranked by the cheapest probe that would falsify each one. Run the
> cheapest probe first.

If the agent's list is shorter than five or skews toward one file,
it has anchored. Spawn a subagent (`Explore`) on the same symptom
with no priors and compare the lists.

---

## Phase 3 — Cheapest-probe loop

Each iteration: pick the top item, run one probe, eliminate or
confirm, re-rank. The probe should be small. A grep, a one-line log,
a single test invocation. If the probe is "let me refactor this
module to add observability", the agent has skipped a level.

Watch for:

- **Probe inflation.** The agent runs three commands when one would
  do. Cut it off and ask which single command would have been
  decisive.
- **Probe substitution.** The agent runs a probe for a different
  hypothesis than the one on top of the list. Stop and ask why.
- **Premature fix.** The agent edits source mid-probe. Roll back.
  Probes do not write.

---

## Phase 4 — Reproducible test before fix

The agent must produce a failing test before changing source. A
symptom that cannot be reduced to a failing test is a symptom that
is not yet understood. The test is also the contract that prevents
the regression.

**Driver prompt:**

> Write a vitest case that fails on `main` (or this branch) and
> would pass after the fix. Show me the failure first. Do not edit
> source yet.

Reject any "fix" that does not come with a failing test. There are
narrow exceptions (timezone bugs, unhandled rejections in async
code) where the test harness will not catch the symptom directly.
In those cases the agent must explain why and propose alternative
verification.

---

## Phase 5 — Fix and verify

The fix should be the minimum delta that makes the test pass. If
the diff is larger than ten lines, ask the agent to justify each
hunk. Refactoring during a fix is a separate task.

**Driver prompt:**

> Apply the smallest diff that makes the test pass. Show the diff.
> Do not refactor adjacent code. Do not add comments. Do not delete
> dead code.

After the fix, run the full test suite and the type checker. If
either fails, the fix is not done. Do not let the agent stop at
"the new test passes."

---

## Anti-patterns to interrupt

These show up across agentic debugging. Each one is a place to stop
the agent and reset.

### Anchoring on the first plausible cause

The agent finds something that looks like it could be the bug, then
spends the rest of the session arguing it is. Symptom: every probe
"confirms" the hypothesis. Reset by spawning a subagent with no
priors.

### Hallucinated repro

The agent claims a repro without actually running it. Symptom: the
session has no test invocation but the agent says "this fails on
main". Always verify by running the suggested repro yourself before
accepting the fix.

### Code-blindness via Read

The agent reads a file in chunks and misses content past the
window. Symptom: the agent says "there is no `auditFraudEvent` in
this file" when there is. Force a `grep` instead of a read for
existence checks.

### Fix-without-repro

The agent changes code and reports the fix without running the
failing test. Symptom: no test invocation in the trace. Reject and
demand the failing-then-passing trace.

### Subagent overuse

The agent delegates everything to subagents and loses thread.
Symptom: the main session has no probes of its own. Subagents are
for parallel hypothesis branches and for fresh-context rubber-duck.
Not a substitute for the main agent doing the work.

### Tool-budget waste

The agent runs `npm install` or rebuilds the entire project to
investigate a one-line bug. Symptom: ten-second probes turn into
multi-minute waits. Cap tool budget per phase. Fast probes only
until the hypothesis is narrowed.

### Premature confidence

The agent reports "fixed" before the verification step. Symptom:
"I fixed the bug" with no test pass shown. Always require the
green test output in the same response as the fix claim.

---

## Multi-agent patterns

### Triangulation

Spawn two `Explore` subagents on the same symptom with disjoint
file scopes. Compare their first three observations. If they
converge, you have a strong lead. If they diverge, the bug is
either cross-cutting (good for technique 6, causal chain) or the
symptom is ambiguous (re-state).

### Fresh-context rubber duck

Long sessions accumulate priors that bias the agent. When stuck,
spawn a fresh subagent with only the symptom and the suspected
files (not the session history). The subagent's first read is
often the most valuable observation in the whole session.

### Adversarial review

After the fix lands, spawn a subagent prompted as "find a reason
this fix is wrong". Adversarial framing surfaces edge cases that
the fixing agent skipped because they were inconvenient.

---

## Stop conditions

Know when to abandon the session.

- **Three failed hypothesis cycles.** The agent has burned through
  three top candidates without progress. The model of the system is
  wrong. Re-state the symptom from scratch with a fresh agent.
- **Cost exceeds value.** Tool calls have piled up beyond the bug's
  importance. Bail and triage manually.
- **Fix candidate that breaks invariants.** The agent proposes a
  fix that requires touching more than three files for a one-line
  symptom. The hypothesis is probably wrong. Re-enumerate.
- **Disagreement between subagents.** Two fresh subagents on the
  same symptom give incompatible explanations. The symptom is
  underspecified. Reproduce more tightly before continuing.

---

## Quality checklist before accepting a fix

Before you mark the bug closed, confirm the agent produced all of
these. Missing any one is a refusal condition.

- [ ] Repro that fails on `main` or the broken branch.
- [ ] Failing-then-passing test in the suite.
- [ ] Diff that is the minimum needed for the test.
- [ ] Full test suite still green after the change.
- [ ] Type check still clean.
- [ ] Reasoning that names the root cause, not the symptom.
- [ ] One-line risk note: what else this change could affect.

If the agent skips any of these, the bug is not closed. The fix
might still be correct, but the session is not done.
