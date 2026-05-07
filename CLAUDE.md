
<!-- BEGIN: makefile-commands (managed by make init) -->
## Make targets

**Make-first rule:** prefer these targets for build/run/test/scan/init operations. If the task isn't covered by a target, **stop and ask the user for permission** before invoking the underlying tool (mvn/npm/docker/git/etc.) directly. Do not bypass the Makefile to "save a step".

**Agent rules:** Execute first, narrate sparingly. Cite `path:line`, no long pastes. Silent success. Batch tools, avoid read-think loops. Trust exit codes. Configure `*_CMD` vars in `Makefile`.

| Target | Purpose | Notes |
|---|---|---|
| `make run` | foreground run | `$(RUN_CMD)` |
| `make start` / `stop` / `restart` | background run | PID `.app.pid`, health `http://localhost:8080/` |
| `make status` | `running pid=… port=…` or `stopped` | one line |
| `make logs` | `tail -f ./logs/run.out` | |
| `make build` / `package` / `test` / `clean` | build pipeline | `$(BUILD_CMD)` etc. |
| `make probe` | `<http_code> <path>` per line | uses `$(PROBE_PATHS)` |
| `make lint` / `typecheck` / `eval-quick` | quality gates | no-op if `*_CMD` unset |
| `make sast` | semgrep (Docker) | `--config=auto` |
| `make deps-audit` | trivy fs (Docker) | vuln scanners only; DB cached in `trivy-cache` volume, auto-refreshes >24h |
| `make scan-secrets` / `scan-secrets-verify` / `scan-history` | trufflehog (Docker), `Raw result:` redacted — safe for agent context | excludes via `.trufflehogignore` |
| `make scan-secrets-raw` | trufflehog without redaction (humans only — leaks secret values) | use locally to inspect findings |
| `make redact-secrets` | rewrite detected secrets in files with `[REDACTED-BY-MAKE]` | DRY-RUN by default; `APPLY=1` to write |
| `make scrub-history` | rewrite leaked secrets in git history with `git filter-repo` | scan-only by default; `CONFIRM=rotated` to rewrite a mirror clone; never auto-pushes |
| `make auth-check` | report active Anthropic auth identity | flags `ANTHROPIC_API_KEY` overriding Team/Enterprise OAuth (AVV-scope leak risk) |
| `make egress-check` | probe `api.anthropic.com` / `console.anthropic.com` / `claude.ai` | surfaces corporate-proxy / TLS-inspection / firewall friction |
| `make ci` | lint → typecheck → test → scan-secrets → sast → deps-audit → eval-quick | exits non-zero on first failure |
| `make verify` | `ai-ready` + `ci` | the single command to run before push |
| `make ai-ready` | config-posture check for secure agentic coding | PASS/WARN/FAIL per check, no scans |
| `make init` | docker pulls, this section, `.claude/settings.json`, `.gitignore` block, pre-commit hook | rerun after editing |
| `make varlock-setup` | bootstrap `.env.schema` (varlock init) or validate if present | requires `varlock` on PATH |

Overrides: `PORT=… BUILD_CMD=… RUN_CMD=… LINT_CMD=… TYPECHECK_CMD=… EVAL_CMD=…`
<!-- END: makefile-commands -->
