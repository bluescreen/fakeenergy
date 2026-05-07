# Participant runbook (no gh CLI) — Debugging and Memory

For participants who don't have the `gh` CLI installed. Same five
steps, GitHub bits done via the web UI.

You will need: Claude Code (your own sub), git, Node 18+, a
browser, a GitHub account.

> **Note.** The recipe runs end-to-end without `gh`, but Phase 7
> (open draft PR) and Phase 8 (comment back to the issue) will
> report `BLOCKED: pr create failed` and a comment-post warning.
> This is expected. The interesting artifacts — fix branch,
> learning entry — are still produced locally.

---

## 1. Make your copy

In the browser, open
`https://github.com/bluescreen/fakeenergy`. Click
**"Use this template" → "Create a new repository"**, name it
whatever, public or private. Then locally:

```bash
git clone <your-fork-url>
cd <your-fork-name>
```

## 2. Run the setup

```bash
bash ./demo-setup-no-gh.sh
```

Installs deps, verifies the suite is green, registers the
`chrome-devtools` MCP if missing. ~2 min. Then prints the web-UI
steps below, also reproduced here for reference.

If the script asks you to restart Claude Code, do that now.

## 3. Set up labels and tickets via the web UI

On your fork's GitHub page:

1. **Issues tab → "Labels" → "New label"**
   - Name: `in-progress`
   - Color: `#FBCA04`
   - Save.

2. **Create two demo issues.** For each of these two ticket files,
   open the markdown in your editor and create a matching GitHub
   issue:
   - `docs/tickets/SLOP-2104-solar-auszahlung.md`
   - `docs/tickets/SLOP-2127-treuebonus-stimmt-nicht.md`

   For each one:
   - **Title:** the H1 line of the markdown file, minus the
     `SLOP-XXXX —` prefix.
   - **Body:** paste everything below the H1.
   - Submit.

3. **Queue both as work-this.** Open issue #1, click "Labels" on
   the right sidebar, check `in-progress`. Repeat for issue #2.

If you want more tickets in the run, create matching issues for
the other markdown files under `docs/tickets/`. For a 40-min
workshop, two is plenty.

## 4. Send the fleet

In Claude Code:

```
/auto-fix-loop --max=2
```

Confirm at the summarise gate. ~6-9 minutes wall clock. Each
ticket gets one worker that triages, reproduces, fixes,
self-reviews, then writes a learning to memory. Phases 7 and 8
will report `BLOCKED` (no gh CLI). The compare URL the worker
leaves in the run log lets you open the PR via the browser.

## 5. Review

When the orchestrator returns:

```bash
# Local fix branches and commits
git log --all --oneline | head -20

# The learnings directory — durable cross-session memory
ls ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/
cat ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/learnings/*.md
```

Read the **Lesson** line on one learning file. That is what the
next worker will read before triaging.

To open one of the agent's fixes as a real PR, copy the compare
URL from the run log (or run
`tail ~/.denkvis/memory/01-projects/fakeenergy-debugging-demo/runs/auto-fix-*.md`)
and click "Create pull request" in the browser.

If you finished early, label two more issues `in-progress` and
run `/auto-fix-loop --max=2` again. Phase 0 of each new worker
reads your learnings before triaging.

---

## If something goes wrong

- **Setup script fails on `npx vitest`** → reset:
  `git reset --hard origin/demo/hard-bugs && npm install` and
  re-run.
- **`chrome-devtools` MCP not connected after restart** → run
  `claude mcp list`. If absent:
  `claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest`
  and restart Claude Code again.
- **Agent hangs > 5 minutes** → cancel. The orchestrator's cap
  marks it `ERROR: timeout`.
- **`git push` fails on the worker's fix branch** → you may not
  have remote write access via plain git (no `gh` to use the
  saved token). Either add an SSH key to your GitHub account, or
  install `gh` after all and re-run the worker.

If you want the full GitHub-integrated path (auto draft PR + auto
comment), install `gh` (one liner on most platforms) and switch
to `docs/participant-runbook.md`.
