# Participant runbook — Debugging and Memory

Five steps. ~5 minutes hands-on, ~10-15 minutes watching, ~5
minutes reviewing artifacts.

You will need: Claude Code (your own sub), `gh` CLI authenticated,
Node 18+, git.

---

## 1. Make your copy

Click **"Use this template"** on
`https://github.com/bluescreen/fakeenergy`, create a new
repository under your account, public or private. Then:

```bash
git clone <your-fork-url>
cd <your-fork-name>
```

## 2. Run the setup

```bash
bash ./demo-setup.sh
```

Installs deps, verifies the suite is green, creates the
`in-progress` label, mirrors the nine demo issues onto your fork,
registers the `chrome-devtools` MCP if missing. ~2 min.

If the script asks you to restart Claude Code, do that now.

## 3. Queue tickets

```bash
for n in 1 3; do gh issue edit "$n" --add-label in-progress; done
```

Two tickets — the easy wins. Skip #6 and #7 (the hard ones)
unless you want to see BLOCKED in action. If you are on a Max
plan or comfortable with API spend, queue four (`1 3 4 8`).

## 4. Send the fleet

In Claude Code:

```
/auto-fix-loop --max=2
```

Confirm at the summarise gate. ~6-9 minutes wall clock. Each
ticket gets one worker that triages, reproduces, fixes,
self-reviews, opens a draft PR, comments back, and writes a
learning to memory.

Lean back. Listen to the talk.

> **Cost note for the $20 Pro plan.** The 5-hour rolling message
> window is the practical ceiling. `--max=2` on two tickets fits
> comfortably. `--max=4` on four tickets is borderline — half the
> room may rate-limit mid-run. Stay at 2 for the workshop. You
> can run a second pass if your window allows.

## 5. Review

When the orchestrator returns:

```bash
# Your draft PRs
gh pr list

# The learnings directory — durable cross-session memory
ls .claude/memory/learnings/
cat .claude/memory/learnings/*.md
```

Read the **Lesson** line on one of the learning files. That is
what the next worker will read before triaging.

If you finished early, queue two more tickets (e.g., 2, 5, 9) and
run `/auto-fix-loop --max=2` again. Watch the workers' Phase 0
read your learnings.

---

## If something goes wrong

- **Setup script fails on `gh auth status`** → run `gh auth login`,
  then re-run the script.
- **`chrome-devtools` MCP not connected after restart** → run
  `claude mcp list`. If absent, run
  `claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest`
  and restart Claude Code again.
- **Agent hangs > 5 minutes** → cancel it. The orchestrator's
  built-in cap will mark it as `ERROR: timeout`.
- **Tests fail before any agent work** → reset:
  `git reset --hard origin/demo/hard-bugs && npm install`.

That's it.
