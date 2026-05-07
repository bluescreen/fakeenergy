# Changelog

Date: 2026-05-05.

## 0.8.1
Trim managed CLAUDE.md rules to 7 essentials. Drop coding-rules duplicates of Claude defaults.

## 0.8.0
Add coding + extra token rules (mostly trimmed back in 0.8.1; only `Read with offset/limit` survived).

## 0.7.2
`claude-hook-redact`: optional trufflehog second pass via `HOOK_TRUFFLEHOG=1` (requires local trufflehog binary; Docker too slow for hook use).

## 0.7.1
PreToolUse hook lives entirely in the Makefile (no separate `.claude/hooks/*.sh`). `make init` idempotently patches existing `.claude/settings.json` via jq for the upgrade path.

## 0.7.0
PreToolUse redact hook in `.claude/settings.json` baseline — regex tripwire (AKIA, ghp_, sk-, PEM, etc.) blocks tool calls containing literal secrets, returns stderr feedback to Claude.

## 0.6.0
- `make auth-check` — flags `ANTHROPIC_API_KEY` overriding Team/Enterprise OAuth (AVV-scope leak)
- `make egress-check` — probes `api.anthropic.com` / `console.anthropic.com` / `claude.ai`

## 0.5.0
- `make scrub-history` — rewrite leaked secrets in git history via `git filter-repo` on a fresh `--mirror` clone. `CONFIRM=rotated` gate; never auto-pushes (prints the force-push command for human approval). Auto-fetches all refs first so preview matches rewrite coverage.
- `MAKEFILE.md` quickstart added
- `.scrub/` added to managed `.gitignore`

## 0.4.0
`make redact-secrets` — replace secrets in working files with `$(REDACTION_TAG)`. DRY-RUN by default; `APPLY=1` to write. Multi-line secrets handled via perl slurp mode.

## 0.3.0 — pre-session baseline
Stack auto-detect, agent-aware `init`, Docker-pinned trivy, redacted trufflehog scans, `make ai-ready` posture report, `make verify` pre-push gate.
