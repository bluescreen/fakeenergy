# Presenter runbook — Debugging and Memory

Workshop format: participants run their own bug-fix fleet on
their own laptops while you talk theory. ~40 minutes total.

**The trick.** You don't run a live demo. They do. You hide LLM
latency behind their wait, give every participant a personal "my
agent opened a PR" moment, and use the ~20 minutes of agent
runtime as your talking slot. Your job is to keep them oriented
and supply the theory their agents are illustrating in the
background.

## Before the workshop

One-time setup on your end:

```bash
# Mark fakeenergy as a GitHub template so "Use this template" works
gh repo edit bluescreen/fakeenergy --template

# Verify the participant runbook and setup script are on demo/hard-bugs
ls docs/participant-runbook.md demo-setup.sh
```

Send participants the repo URL ahead of time so they can clone
during arrival.

## Slot plan

| Time | What you do |
|---|---|
| 0:00–0:05 | Frame the workshop, point at the repo + participant runbook |
| 0:05–0:10 | Everyone runs `bash ./demo-setup.sh`, ask for thumbs-up |
| 0:10–0:11 | Everyone queues four tickets and runs `/auto-fix-loop --max=4` |
| 0:11–0:30 | **You talk.** Their agents work. (19 min of content) |
| 0:30–0:33 | Memory beat: `ls` and `cat` the learnings dir together |
| 0:33–0:36 | Optional second-pass live: queue two more tickets, watch Phase 0 read prior learnings |
| 0:36–0:40 | Q&A and close |

## Opening (5 min)

*"This is a Next.js app for a fictional Cologne energy company.
Nine production-shaped customer complaints in the issue tracker,
in German, in customer voice. Most blame the wrong thing. The
actual bugs are in code."*

*"You won't watch me solve them. You'll fork the repo, run a
single skill, and watch your own agents do the work — triage the
German, ignore the misdirection, find the file, write a failing
test, fix it, review their own diff, open a draft PR, comment
back to the issue, and write a learning to memory."*

Direct them to the participant runbook. Five steps:

```
https://github.com/bluescreen/fakeenergy/blob/demo/hard-bugs/docs/participant-runbook.md
```

For anyone without the `gh` CLI, point at the no-gh variant
instead — same recipe, GitHub bits via web UI:

```
https://github.com/bluescreen/fakeenergy/blob/demo/hard-bugs/docs/participant-runbook-no-gh.md
```

## What to say while their agents work (19 min)

Pick from these in any order. Calibrate to the room.

### TAC overview (5 min)

Tactical Agentic Coding — eight parts, four directly relevant to
what they're running:

- **§6 Thread Taxonomy.** They are running a B-Thread:
  orchestrator + sub-agents. F-Thread (competing fixes on stall)
  is the next escalation if a worker blocks.
- **§9 Three-Agent Harness.** Planner / Generator / Evaluator. A
  worker runs the inline version: triage agent observes,
  reproducer falsifies, fixer changes code, adversarial reviewer
  attacks the diff.
- **§11 Sub-Agents as Context Firewalls.** Each phase gets fresh
  context, condensed return. The Explore subagent finds bugs the
  main session would have missed because the main session is
  full of demo chatter.
- **§21 Verify-Before-Work.** The failing reproducer is the
  contract. No reproducer, no fix. The worker bails before any
  source change if the test does not actually fail.

### The harness shape (5 min)

What you have to give the agent so it can be autonomous:

- **In-progress label** as the work signal. Same gesture as
  dragging a Kanban card.
- **Worktree isolation** as the parallelism primitive. Each
  worker gets a clean checkout. No conflicts.
- **Reproducer-before-fix** as the bail-early contract.
- **Adversarial review** as the second pair of eyes — a separate
  agent so the fixer cannot rationalise its own work.
- **Source-aware commenting** so the issue tracker is the source
  of truth for the human reviewer. They never have to leave the
  ticket.
- **Memory write** as the cross-session lesson capture.

### Slop prevention (5 min)

Lopopolo's four detection layers, ordered by marginal cost:

| Layer | Mechanism | Enforcement |
|---|---|---|
| 1. Mechanical | Lints, type checks, formatters | 100% |
| 2. Structural | Tests about the source code itself | 100% |
| 3. Review-agent | LLM persona reading a doc | 70–90% |
| 4. Human-signal | Logged interventions | source of truth |

**Folk number.** CLAUDE.md instructions are followed ~70% of the
time. Hooks and lints are 100%. If you need a rule obeyed, make
it a lint, not a sentence.

Lopopolo's Friday ritual: every human intervention this week
becomes a Layer 1 or 2 guard. The harness gets stricter over
time, the agent's behaviour gets more predictable.

### Memory theory (4 min)

"Memory" sounds mystical. It isn't. It is a directory the agent
reads before acting and writes after.

The Phase 0 / Phase 9 pattern in `auto-fix-loop`:

- **Phase 0:** glob the learnings directory. Use prior entries as
  priors. If a previous worker blocked on this key, try a
  different strategy.
- **Phase 9:** write one durable file. Symptom, hypothesis,
  technique, outcome, **one-line lesson for the next worker**.

The lesson outlives the session. The diary of how you got there
doesn't. Diaries grow noisy; rules accumulate clean.

TAC §17 calls this Per-Phase Expertise — one file for what worked
(`patterns`), one file for what blocked (`pitfalls`). Future
sessions skip dead ends and reuse winning strategies. Same shape
as a senior engineer's intuition, externalised.

## When agents return (3 min)

Quick room sweep:

- Who got 4 PRs?
- Anyone hit BLOCKED? Click that issue together. Read the
  comment. Note the suggested next step.
- Anyone's run took longer than 12 min? What was the slow phase?

Then the memory beat. Have everyone run:

```bash
ls ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/
cat ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/*.md
```

Read your own learning file aloud as an example. Point at the
**Lesson** line.

*"This is the artifact that makes memory matter. Diaries grow,
rules accumulate. The next worker reads the rule, not the diary."*

## Optional second-pass beat (3 min)

If the room finished fast, have everyone queue two more tickets:

```bash
for n in 2 5; do gh issue edit "$n" --add-label in-progress; done
```

```
/auto-fix-loop --max=2
```

Each worker's Phase 0 will read the prior learnings. The
orchestrator's confirm prompt should call out tickets with prior
entries.

*"Same skill. Different inputs. Agents are not retraining, they
are reading. Memory is just files. The skill says 'glob this
directory before triaging' and the agent obeys. That is enough."*

## Close (1 min)

*"What did the agent get? Triage, repro, fix, review, PR, comment,
learning. What did the harness give the agent? An in-progress
queue as the work signal. Worktree isolation for parallelism. A
reproducer contract that bails before any source change. An
adversarial pass so the fixer can't rationalise. A run log AND a
learnings file so the next session inherits context."*

*"The point isn't autonomy. The point is that a well-shaped
harness turns one agent into a pipeline that produces reviewable
artifacts at one click — and remembers what it learned so the
second click is cheaper than the first. Debugging without memory
is groundhog day. With memory, every block becomes a permanent
prevention."*

## Q&A — be ready for

- *"Can it merge automatically?"* → No, intentionally. Draft PR
  + human merge is the contract.
- *"What does it cost?"* → ~$2-5 per run on a Pro sub.
- *"What if my agent loops forever?"* → 5-min cap per worker, then
  ERROR.
- *"Can it work on real production code?"* → Yes if your repo has
  a green test suite and you accept draft-PR review discipline.
- *"How do I add my own bug categories?"* → Patterns + pitfalls
  files; Phase 0 reads them.
- *"Does the second-pass effect always help?"* → No. Memory helps
  when new symptoms resemble stored ones. One-off bugs get little
  benefit.

## Backup beats — when something fails

- **Half the room can't run the setup script.** Pivot to a single
  live demo at the front (you run `/auto-fix-loop --max=2`).
  Their copy still works after the talk; they can run later.
- **Setup script fails on `gh auth`.** Walk them through
  `gh auth login`, then re-run.
- **One participant's agent hangs.** Tell them to cancel.
  *"5-minute cap is the harness's doom-loop detection."*
- **Chrome-devtools MCP not loaded for someone.** Beat 4 (visible
  bug repro) becomes verbal for them.
- **Network is unstable.** Have a pre-recorded screen-capture of
  one full run as a backup, can play it without LLM dependency.

## Cleanup (after)

You don't need to clean up participants' forks — they keep them.
Clean your template repo:

```bash
# Drop in-progress labels on bluescreen/fakeenergy
for n in $(gh issue list --repo bluescreen/fakeenergy --label in-progress --json number --jq '.[].number'); do
  gh issue edit "$n" --repo bluescreen/fakeenergy --remove-label in-progress
done
```

The participant repos with their fix branches and PRs are theirs
to keep, prune, or merge as they like.
