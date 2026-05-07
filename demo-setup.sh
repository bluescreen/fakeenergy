#!/usr/bin/env bash
# Demo setup for fakeenergy participants.
# Run from the repo root: bash ./demo-setup.sh

set -euo pipefail

step() { printf "\n==> %s\n" "$1"; }

step "Verifying prerequisites"
command -v gh     >/dev/null || { echo "Install gh CLI first."; exit 1; }
command -v claude >/dev/null || { echo "Install Claude Code first."; exit 1; }
command -v node   >/dev/null || { echo "Install Node 18+ first."; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Run 'gh auth login' first."; exit 1; }

REPO=$(gh repo view --json owner,name --jq '.owner.login + "/" + .name')
echo "    repo: $REPO"

step "Installing deps (npm install --include=dev)"
NODE_ENV= npm install --include=dev --no-progress

step "Verifying vitest is callable"
if ! npm test --silent --help >/dev/null 2>&1 && [ ! -x node_modules/.bin/vitest ]; then
  echo "    vitest not installed. retry:"
  echo "      rm -rf node_modules package-lock.json"
  echo "      NODE_ENV= npm install --include=dev"
  exit 1
fi
echo "    vitest present"

# Note: we don't run 'npm test' as a green-suite check here. The
# demo branch carries planted bugs (e.g., B6 audit drop) that
# trigger an unhandled rejection in the bot-UA test, which makes
# vitest exit non-zero even though all 46 tests pass content-wise.
# Workers verify their own reproducer before any fix, that is the
# real green-suite gate.

step "Creating 'in-progress' label on $REPO"
if gh label list --repo "$REPO" --limit 100 | grep -q '^in-progress'; then
  echo "    already exists"
else
  gh label create in-progress --repo "$REPO" --color FBCA04 \
    --description "User-signaled work-this ticket"
  echo "    created"
fi

step "Mirroring demo issues onto $REPO"
EXISTING=$(gh issue list --repo "$REPO" --limit 1 --json number --jq 'length')
if [ "$EXISTING" -gt 0 ]; then
  echo "    issues already present, skipping"
else
  for f in docs/tickets/SLOP-*.md; do
    title=$(head -1 "$f" | sed 's/^# SLOP-[0-9]* — //')
    body_file=$(mktemp)
    tail -n +3 "$f" > "$body_file"
    gh issue create --repo "$REPO" --title "$title" --body-file "$body_file" >/dev/null
    rm "$body_file"
    echo "    + $title"
  done
fi

step "Registering chrome-devtools MCP (if missing)"
if claude mcp list 2>/dev/null | grep -q '^chrome-devtools'; then
  echo "    already connected"
else
  claude mcp add --transport stdio chrome-devtools -- npx -y chrome-devtools-mcp@latest
  echo "    added — restart Claude Code so the MCP loads"
fi

step "Starting dev server on http://localhost:3000"
if curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
  echo "    already running"
else
  nohup npm run dev > /tmp/fakeenergy-dev.log 2>&1 &
  echo $! > .app.pid
  for i in $(seq 1 30); do
    sleep 1
    if curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
      echo "    up (pid $(cat .app.pid))"
      break
    fi
  done
  if ! curl -fsS -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "    timed out — check /tmp/fakeenergy-dev.log"
  fi
fi

step "Opening browser tabs"
open_url() {
  if   command -v open      >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open  >/dev/null 2>&1; then xdg-open "$1"
  else echo "    open manually: $1"
  fi
}
open_url "http://localhost:3000"
open_url "https://github.com/$REPO/issues"
echo "    live site + issues board"

step "Setup complete"
cat <<EOF

Next steps:

  1. (If chrome-devtools was just added) restart Claude Code.
  2. Queue four tickets to in-progress:
       for n in 1 3 4 8; do gh issue edit "\$n" --add-label in-progress; done
  3. In Claude Code:
       /auto-fix-loop --max=4

Lean back, listen to the talk. ~10 min wall clock for the workers
to land their PRs.

EOF
