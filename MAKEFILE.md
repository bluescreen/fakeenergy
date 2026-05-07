# Makefile Quickstart

```bash
make init        # one-time: docker images + CLAUDE.md + .gitignore + pre-commit hook
make ai-ready    # posture check (✅/⚠️/❌ per category, exits non-zero on blockers)
make verify      # ai-ready + ci — run before pushing
```

**Daily:** `build` · `test` · `package` · `clean` · `run` · `start` · `stop` · `status` · `logs` · `probe`

**Security scans (all Docker, no local installs):** `scan-secrets` · `sast` · `deps-audit`

**Redaction (DRY-RUN by default):** `redact-secrets` (`APPLY=1` to rewrite files) · `scrub-history` (`CONFIRM=rotated` to rewrite git history on a mirror clone — rotate the secret first; never auto-pushes)

**Quality:** `lint` · `typecheck` · `eval-quick` · `ci` — set `LINT_CMD` / `TYPECHECK_CMD` / `EVAL_CMD` in `Makefile`

**Inspect:** `make detect-stack` · `make version` · `make help`

**Override anything:** `PORT=9090 make run` · `BUILD_CMD="npm run build" make build` · `STACK=node make build` · `AGENT=cursor make init` · `REDACTION_TAG="<<SECRET>>" make redact-secrets`

Every completion command prints `✅ <name> (Ns)` on success. Skipped quality gates print `⊘ <name> (no FOO_CMD)`. Failures propagate the underlying exit code.
