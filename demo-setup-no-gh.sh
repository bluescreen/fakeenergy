#!/usr/bin/env bash
# Demo setup for participants without the gh CLI.
# Run from the repo root: bash ./demo-setup-no-gh.sh
#
# This script does only the local-machine bits. The GitHub bits
# (fork, label, issues) are done via the web UI per the printed
# instructions below.

set -euo pipefail

step() { printf "\n==> %s\n" "$1"; }
note() { printf "    %s\n" "$1"; }

step "Verifying prerequisites"
command -v claude >/dev/null || { echo "Install Claude Code first."; exit 1; }
command -v node   >/dev/null || { echo "Install Node 18+ first."; exit 1; }
command -v git    >/dev/null || { echo "Install git first."; exit 1; }
note "claude, node, git present"

step "Installing deps (npm install --include=dev)"
NODE_ENV= npm install --include=dev --no-progress

step "Verifying vitest is callable"
if [ ! -x node_modules/.bin/vitest ]; then
  note "vitest not installed. retry:"
  note "  rm -rf node_modules package-lock.json"
  note "  NODE_ENV= npm install --include=dev"
  exit 1
fi
note "vitest present"

# Note: we don't run 'npm test' as a green-suite check here. One of
# the planted defects emits an unhandled rejection that makes vitest
# exit non-zero even though every test case passes content-wise.

step "Registering chrome-devtools MCP (if missing)"
if claude mcp list 2>/dev/null | grep -q '^chrome-devtools'; then
  note "already connected"
else
  claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest
  note "added — restart Claude Code so the MCP loads"
fi

step "Starting dev server on http://localhost:3000"
if curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
  note "already running"
else
  nohup npm run dev > /tmp/fakeenergy-dev.log 2>&1 &
  echo $! > .app.pid
  for i in $(seq 1 30); do
    sleep 1
    if curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
      note "up (pid $(cat .app.pid))"
      break
    fi
  done
  if ! curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
    note "timed out — check /tmp/fakeenergy-dev.log"
  fi
fi

step "Opening live site in browser"
open_url() {
  if   command -v open      >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open  >/dev/null 2>&1; then xdg-open "$1"
  else echo "    open manually: $1"
  fi
}
open_url "http://localhost:3000"
note "GitHub issues page: open YOUR fork in the browser yourself"

step "Local setup complete"

cat <<'EOF'

Now do these in the browser on YOUR fork (you forked the repo via
"Use this template" before running this script):

  1. ISSUES TAB ON YOUR FORK
     Click "Labels" near the search bar -> "New label"
       Name:  in-progress
       Color: #FBCA04
     Save.

  2. CREATE TWO DEMO ISSUES (just two — easy wins)
     Open docs/tickets/SLOP-2104-solar-auszahlung.md in your editor.
     Issues tab -> "New issue":
       Title: copy the H1 line minus "SLOP-2104 — "
       Body:  paste everything below the H1 (skip the meta table
              if you want, the customer email is what matters)
     Submit.

     Repeat for docs/tickets/SLOP-2127-treuebonus-stimmt-nicht.md.

  3. QUEUE BOTH AS "WORK THIS"
     Open issue #1, click "Labels" on the right sidebar, check
     in-progress. Same for #2.

  4. (If chrome-devtools was just registered) restart Claude Code.

  5. In Claude Code:
       /auto-fix-loop --max=2

  6. The auto-fix-loop runs the recipe — triage, reproduce, fix,
     adversarial review, learning write. Phase 7 (open PR) and
     Phase 8 (comment back) will report BLOCKED because there is
     no gh CLI. THIS IS EXPECTED. The recipe still ran. The
     interesting artifacts are local:

       git log --all --oneline                        # the fix branch and commit
       ls .claude/memory/learnings/

  7. To view the fix as a real PR, open the printed compare URL
     in your browser (the worker leaves it in the run log) and
     click "Create pull request".

EOF
