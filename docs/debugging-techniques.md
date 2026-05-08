# Agentic debugging techniques

Notes for the fakeenergy debugging demo. Each technique below maps to a
class of failure where it pays off, and to a recommended starting prompt
for an agent.

## 1. Hypothesis tree, ranked by cheapest probe

List every plausible cause first. Then rank by how cheaply you can
falsify each one. Run the cheapest probe, eliminate, repeat. The aim
is to keep the search frontier wide while only paying for the cheapest
move at each step.

- Good for: bugs with multiple plausible explanations.
- Anti-pattern: committing to the first hypothesis that "feels right".
- Agent prompt: "Before touching anything, list 5 candidate causes for
  this symptom and rank them by the cost of the cheapest probe that
  would falsify each one. Run the cheapest probe first."

## 2. Input bisection to a minimal repro

Take the failing input. Halve it. Re-run. If the failure persists,
halve again. If it disappears, restore the half you cut. Keep going
until any further reduction makes the bug vanish. The minimal repro
is half the fix.

- Good for: bugs with one large input where the trigger is unclear.
- Anti-pattern: reasoning about the bug from the original input.
- Agent prompt: "Reduce this failing input to the smallest payload
  that still triggers the bug. Halve fields one at a time. Stop when
  no further reduction works."

## 3. Tracer-bullet logging across one suspect path

Instrument the entire suspected call path with one consistent log
prefix before stepping through anything. Run once. Read the trace.
You will usually see the divergence at a glance.

- Good for: multi-file bugs where the call graph is the obstacle.
- Anti-pattern: starting in a debugger before the trace is in place.
- Agent prompt: "Add `[TRACE]` log lines at every entry, branch, and
  return on the path from `processFunnelSubmission` to
  `calculateInvoice`. Run once. Read the trace."

## 4. Differential debugging

Hold two invocations side by side. One that works, one that does not.
Diff inputs, environment, dependency versions, time. The first cell
that differs is your suspect.

- Good for: "works on staging, fails in prod" or "works for user A,
  fails for user B".
- Anti-pattern: explaining the failure without ever looking at a
  passing run.
- Agent prompt: "Find one input that produces the correct output and
  one that does not. Diff the two inputs. The first field that
  differs is the lead."

## 5. Failing test first

Encode the symptom as a regression test before any fix. A symptom
that cannot be reduced to a failing test is not yet understood. The
test is also the contract that prevents the regression from coming
back.

- Good for: any bug, but especially intermittent ones.
- Anti-pattern: "I think I see it" followed by a code change with no
  test.
- Agent prompt: "Write a vitest case that fails today and passes
  after the fix. Show the failure first. Only then change source."

## 6. Causal chain past the first plausible cause

Five whys. The first cause you find is rarely the root. Keep asking
why until the next answer would be "that is just how it is" or
"someone designed it that way and that decision is the issue".

- Good for: bugs where the obvious fix would mask a deeper invariant
  violation.
- Anti-pattern: stopping at the first commit that, when reverted,
  removes the symptom.
- Agent prompt: "You found a probable cause. Ask why one more time.
  And once more. Stop only when the answer is a design decision, not
  a code line."

## 7. Subagent rubber duck

Spawn a fresh agent with no context except the symptom and the
relevant files. The fresh agent is not anchored on the priors that
sent the main agent down a dead end. Their first three observations
are usually the most valuable.

- Good for: long debugging sessions that have stalled.
- Anti-pattern: continuing to push the same agent that has already
  committed to a wrong hypothesis.
- Agent prompt: "Spawn a sub-agent with `subagent_type=Explore`. Hand
  it only the symptom and the suspected files. Ask for three
  candidate explanations and the cheapest probe for each."

## 8. State snapshot and replay

Capture intermediate state at key points during a failing run. Pickle
it, dump it, log it as JSON, whatever the runtime allows. Then
inspect offline at leisure rather than racing live. Especially
valuable when the bug is in cross-call state, not in any single
call.

- Good for: bugs that mutate or carry state across calls.
- Anti-pattern: stepping through live, in real time, hoping to spot
  the moment of corruption.
- Agent prompt: "Dump `recommendation` and `invoice` as JSON at every
  early-return. Run the suite. Inspect the dumps offline."

## 9. Concurrency repro under contention

For race conditions, single-call probes will not reproduce. You need
to fire the suspected operation at the suspected concurrency level
and inspect the aggregate. In Node, `Promise.all` of N invocations
of an async function will queue every caller at the first `await`,
so any read-modify-write that straddles an `await` will race
deterministically.

Once you have the repro, capture the relevant state at the read,
the await, and the write. Most contention bugs are check-then-act:
the gate is checked before the await, but the post-await write
assumes the gate is still valid. It is not.

- Good for: budget overruns, dedupe leaks, cap leaks, idempotency
  violations, anything where "works in test, breaks in prod under
  traffic".
- Anti-pattern: reasoning about the race from the source alone.
  Microtask ordering is hard to keep in your head. Reproduce it.
- Agent prompt: "Fire 1500 concurrent invocations of the suspected
  function via `Promise.all`. Count the successes against the cap.
  If the count exceeds the cap, you have the race. Then capture
  the value of the gate variable at the read and at the write."

## How these map to the planted bugs

The bugs on `main` are picked so each one rewards a different
technique. The mapping is held privately by the presenter for
post-workshop review.
