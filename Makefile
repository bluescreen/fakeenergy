# Project Makefile — build-tool agnostic template
#
# Configure the variables in the CONFIG block for your project. Defaults
# assume a Spring Boot / Maven project; override BUILD_CMD, RUN_CMD, etc.
# for npm, gradle, cargo, go, …
#
# Examples:
#   Maven:   BUILD_CMD="mvn -q -DskipTests compile"
#            RUN_CMD="mvn -q -DskipTests spring-boot:run -Dserver.port=$(PORT)"
#   npm:     BUILD_CMD="npm run build"
#            RUN_CMD="npm start"  (or "node server.js")
#   gradle:  BUILD_CMD="./gradlew assemble"
#            RUN_CMD="./gradlew bootRun --args='--server.port=$(PORT)'"
#   go:      BUILD_CMD="go build -o ./bin/$(APP_NAME) ./..."
#            RUN_CMD="./bin/$(APP_NAME)"

# -------------------------------------------------------------------
# Template version — bump on shipped changes; surfaced in 'make help',
# 'make version', and the ai-ready report header.
# -------------------------------------------------------------------
MAKEFILE_VERSION := 0.8.1

# -------------------------------------------------------------------
# CONFIG  —  edit these for your project
# -------------------------------------------------------------------
APP_NAME     ?= $(notdir $(CURDIR))
PORT         ?= 8080
LOG_DIR      ?= ./logs
PID_FILE     ?= .app.pid

# Probe configuration
HEALTH_URL   ?= http://localhost:$(PORT)/
PROBE_PATHS  ?= /

# -------------------------------------------------------------------
# Stack auto-detection — picks BUILD_CMD/RUN_CMD/etc. defaults from
# project files. First match wins. Override with: STACK=node|maven|…
# Any *_CMD set on the command line or in env wins over the default.
# -------------------------------------------------------------------
# Server-side stacks first (pom/composer/python/go/rust). package.json is
# checked last because PHP/Java/Python apps often carry a Node-based asset
# pipeline (gulp/webpack/vite) — the server stack is the primary one.
ifneq ($(wildcard pom.xml),)
  STACK ?= maven
  STACK_TRIGGER ?= pom.xml
else ifneq ($(wildcard build.gradle build.gradle.kts),)
  STACK ?= gradle
  STACK_TRIGGER ?= $(firstword $(wildcard build.gradle build.gradle.kts))
else ifneq ($(wildcard composer.json),)
  STACK ?= php
  STACK_TRIGGER ?= composer.json
else ifneq ($(wildcard pyproject.toml requirements.txt),)
  STACK ?= python
  STACK_TRIGGER ?= $(firstword $(wildcard pyproject.toml requirements.txt))
else ifneq ($(wildcard go.mod),)
  STACK ?= go
  STACK_TRIGGER ?= go.mod
else ifneq ($(wildcard Cargo.toml),)
  STACK ?= rust
  STACK_TRIGGER ?= Cargo.toml
else ifneq ($(wildcard package.json),)
  STACK ?= node
  STACK_TRIGGER ?= package.json
else
  STACK ?= unknown
  STACK_TRIGGER ?= none
endif

ifeq ($(STACK),maven)
  # Prefer ./mvnw (Maven wrapper) when present — avoids relying on system mvn.
  MVN         ?= $(if $(wildcard ./mvnw),./mvnw,mvn)
  BUILD_CMD   ?= $(MVN) -q -DskipTests compile
  PACKAGE_CMD ?= $(MVN) -q -DskipTests package
  TEST_CMD    ?= $(MVN) test
  CLEAN_CMD   ?= $(MVN) -q clean
  RUN_CMD     ?= $(MVN) -q -DskipTests spring-boot:run -Dserver.port=$(PORT)
  RUN_PATTERN ?= spring-boot:run
else ifeq ($(STACK),gradle)
  BUILD_CMD   ?= ./gradlew assemble
  PACKAGE_CMD ?= ./gradlew bootJar
  TEST_CMD    ?= ./gradlew test
  CLEAN_CMD   ?= ./gradlew clean
  RUN_CMD     ?= ./gradlew bootRun --args='--server.port=$(PORT)'
  RUN_PATTERN ?= bootRun
else ifeq ($(STACK),node)
  BUILD_CMD   ?= npm run build --if-present
  PACKAGE_CMD ?= npm pack
  TEST_CMD    ?= npm test
  CLEAN_CMD   ?= rm -rf dist build .next .nuxt out node_modules/.cache
  RUN_CMD     ?= PORT=$(PORT) npm start
  RUN_PATTERN ?= node
else ifeq ($(STACK),php)
  BUILD_CMD   ?= composer install --no-progress --no-interaction
  PACKAGE_CMD ?= composer install --no-dev --no-progress --no-interaction --classmap-authoritative
  TEST_CMD    ?= vendor/bin/phpunit
  CLEAN_CMD   ?= rm -rf vendor
  RUN_CMD     ?= php -S 0.0.0.0:$(PORT) -t public
  RUN_PATTERN ?= php -S
else ifeq ($(STACK),python)
  BUILD_CMD   ?= pip install -e .
  PACKAGE_CMD ?= python -m build
  TEST_CMD    ?= pytest
  CLEAN_CMD   ?= rm -rf build dist *.egg-info __pycache__
  RUN_CMD     ?= python -m $(APP_NAME)
  RUN_PATTERN ?= python
else ifeq ($(STACK),go)
  BUILD_CMD   ?= go build ./...
  PACKAGE_CMD ?= go build -o ./bin/$(APP_NAME) ./...
  TEST_CMD    ?= go test ./...
  CLEAN_CMD   ?= rm -rf ./bin
  RUN_CMD     ?= ./bin/$(APP_NAME)
  RUN_PATTERN ?= $(APP_NAME)
else ifeq ($(STACK),rust)
  BUILD_CMD   ?= cargo build
  PACKAGE_CMD ?= cargo build --release
  TEST_CMD    ?= cargo test
  CLEAN_CMD   ?= cargo clean
  RUN_CMD     ?= cargo run
  RUN_PATTERN ?= target/debug/$(APP_NAME)
else
  BUILD_CMD   ?=
  PACKAGE_CMD ?=
  TEST_CMD    ?=
  CLEAN_CMD   ?=
  RUN_CMD     ?=
  RUN_PATTERN ?= $(APP_NAME)
endif

# -------------------------------------------------------------------
# Quality / typing — set per project. Empty = target prints "skip" and
# does nothing, so 'make ci' stays green on day one.
# Examples:
#   LINT_CMD      = ruff check .
#   LINT_CMD      = npx eslint .
#   LINT_CMD      = mvn -q checkstyle:check
#   TYPECHECK_CMD = mypy --strict src
#   TYPECHECK_CMD = npx tsc --noEmit
# -------------------------------------------------------------------
LINT_CMD      ?= npm run lint
TYPECHECK_CMD ?= npx tsc --noEmit
EVAL_CMD      ?=

# -------------------------------------------------------------------
# Security tools — all run in Docker so no local install required.
# -------------------------------------------------------------------
TRUFFLEHOG_IMAGE  ?= trufflesecurity/trufflehog:latest
TRUFFLEHOG        ?= docker run --rm -v "$(CURDIR):/pwd" -w /pwd $(TRUFFLEHOG_IMAGE)
TRUFFLEHOG_BIN    := $(firstword $(TRUFFLEHOG))

# Paths trufflehog should skip. Scan targets bootstrap a default
# .trufflehogignore with these entries if none exists in the project.
TRUFFLEHOG_IGNORE ?= .trufflehogignore
TRUFFLEHOG_IGNORE_DEFAULTS ?= target/ node_modules/ .next/ .nuxt/ dist/ build/ out/ .cache/ logs/ .git/ vendor/ .venv/ __pycache__/ .mvn/wrapper/maven-wrapper.jar .env.schema

# SAST — semgrep with auto-config (rules picked per language)
SEMGREP_IMAGE   ?= semgrep/semgrep:latest
SEMGREP_CONFIG  ?= auto
SEMGREP         ?= docker run --rm -v "$(CURDIR):/src" -w /src $(SEMGREP_IMAGE) semgrep --config=$(SEMGREP_CONFIG)

# Dependency vulnerability scan — trivy filesystem scan over the current tree.
# Pinned to v0.70.0 by digest (multi-arch manifest list) so 'make init' can't
# silently pull a tampered image. Bump tag + digest together; verify via:
#   docker buildx imagetools inspect aquasec/trivy:<new-tag>
TRIVY_VERSION ?= 0.70.0
TRIVY_DIGEST  ?= sha256:be1190afcb28352bfddc4ddeb71470835d16462af68d310f9f4bca710961a41e
TRIVY_IMAGE   ?= aquasec/trivy:$(TRIVY_VERSION)@$(TRIVY_DIGEST)
# Named volume holds the vuln + Java DBs across runs. Trivy auto-refreshes
# both when they're older than 24h, so the cache stays fresh on every scan;
# 'make scan-update' forces an immediate refresh out-of-band.
TRIVY_CACHE   ?= trivy-cache
TRIVY_DOCKER  ?= docker run --rm -v $(TRIVY_CACHE):/root/.cache/trivy $(TRIVY_IMAGE)
TRIVY         ?= docker run --rm -v "$(CURDIR):/src" -v $(TRIVY_CACHE):/root/.cache/trivy $(TRIVY_IMAGE) fs --scanners vuln --quiet /src

# Docker images pulled by 'make init'. Append your own:
#   DOCKER_IMAGES += selenium/standalone-chrome:latest
DOCKER_IMAGES ?= $(TRUFFLEHOG_IMAGE) $(SEMGREP_IMAGE) $(TRIVY_IMAGE)

# CLAUDE.md target written/updated by 'make init'
CLAUDE_MD ?= CLAUDE.md

# Project-shared Claude Code settings (committed). 'make init' bootstraps
# a security + productivity baseline if this file is missing.
CLAUDE_SETTINGS ?= .claude/settings.json

# .gitignore + git hooks paths managed by 'make init'.
GITIGNORE ?= .gitignore
GITHOOKS_DIR ?= .githooks

# -------------------------------------------------------------------
# Agent detection — Claude Code, Cursor, or unknown.
# Drives which agent config 'make init' bootstraps and which files
# 'make ai-ready' looks for. Override with: AGENT=claude|cursor|both
# -------------------------------------------------------------------
ifdef CLAUDECODE
  AGENT ?= claude
else ifdef CURSOR_TRACE_ID
  AGENT ?= cursor
else
  AGENT ?= both
endif

CURSOR_RULES_DIR  ?= .cursor/rules
CURSOR_RULES_FILE ?= $(CURSOR_RULES_DIR)/security.mdc

.DEFAULT_GOAL := help

# Run a shell command and append "✅ <label> (Ns)" on success. On failure
# the underlying tool's exit code propagates and no checkmark is printed.
# Usage in a recipe: $(call _stamp,build,$(BUILD_CMD))
define _stamp
	@_t=$$(date +%s); { $(2); } && echo "✅ $(1) ($$(($$(date +%s)-_t))s)"
endef

# -------------------------------------------------------------------
# init — pull required Docker images, document Make targets in CLAUDE.md
# -------------------------------------------------------------------
# Markers used to keep the CLAUDE.md section idempotent. Editing inside
# the markers will be preserved only until the next 'make init' run.
CLAUDE_MD_BEGIN := <!-- BEGIN: makefile-commands (managed by make init) -->
CLAUDE_MD_END   := <!-- END: makefile-commands -->

define CLAUDE_MD_SECTION

$(CLAUDE_MD_BEGIN)
## Make targets

**Make-first rule:** prefer these targets for build/run/test/scan/init operations. If the task isn't covered by a target, **stop and ask the user for permission** before invoking the underlying tool (mvn/npm/docker/git/etc.) directly. Do not bypass the Makefile to "save a step".

**Token rules:**
- Skip preambles ("I'll now…", "Let me…"); execute first, narrate sparingly.
- Cite by `path:line`; don't paste large file contents back.
- Silent success = success — don't echo "done" or re-summarize what the diff shows.
- Batch related tool calls in one round-trip; avoid read-think-read loops.
- Prefer `grep` / `make detect-stack` / `make ai-ready` over reading multiple files.
- Read large files (>500 lines) with `offset`/`limit`, not the whole file.
- Don't re-run a command that just succeeded; trust the exit code.

Silent on success; tools print to stderr on failure. Configure `*_CMD` vars in `Makefile`.

| Target | Purpose | Notes |
|---|---|---|
| `make run` | foreground run | `$$(RUN_CMD)` |
| `make start` / `stop` / `restart` | background run | PID `$(PID_FILE)`, health `$(HEALTH_URL)` |
| `make status` | `running pid=… port=…` or `stopped` | one line |
| `make logs` | `tail -f $(LOG_DIR)/run.out` | |
| `make build` / `package` / `test` / `clean` | build pipeline | `$$(BUILD_CMD)` etc. |
| `make probe` | `<http_code> <path>` per line | uses `$$(PROBE_PATHS)` |
| `make lint` / `typecheck` / `eval-quick` | quality gates | no-op if `*_CMD` unset |
| `make sast` | semgrep (Docker) | `--config=$(SEMGREP_CONFIG)` |
| `make deps-audit` | trivy fs (Docker) | vuln scanners only; DB cached in `$(TRIVY_CACHE)` volume, auto-refreshes >24h |
| `make scan-secrets` / `scan-secrets-verify` / `scan-history` | trufflehog (Docker), `Raw result:` redacted — safe for agent context | excludes via `$(TRUFFLEHOG_IGNORE)` |
| `make scan-secrets-raw` | trufflehog without redaction (humans only — leaks secret values) | use locally to inspect findings |
| `make redact-secrets` | rewrite detected secrets in files with `$(REDACTION_TAG)` | DRY-RUN by default; `APPLY=1` to write |
| `make scrub-history` | rewrite leaked secrets in git history with `git filter-repo` | scan-only by default; `CONFIRM=rotated` to rewrite a mirror clone; never auto-pushes |
| `make auth-check` | report active Anthropic auth identity | flags `ANTHROPIC_API_KEY` overriding Team/Enterprise OAuth (AVV-scope leak risk) |
| `make egress-check` | probe `api.anthropic.com` / `console.anthropic.com` / `claude.ai` | surfaces corporate-proxy / TLS-inspection / firewall friction |
| `make ci` | lint → typecheck → test → scan-secrets → sast → deps-audit → eval-quick | exits non-zero on first failure |
| `make verify` | `ai-ready` + `ci` | the single command to run before push |
| `make ai-ready` | config-posture check for secure agentic coding | PASS/WARN/FAIL per check, no scans |
| `make init` | docker pulls, this section, `$(CLAUDE_SETTINGS)`, `$(GITIGNORE)` block, pre-commit hook | rerun after editing |
| `make varlock-setup` | bootstrap `.env.schema` (varlock init) or validate if present | requires `varlock` on PATH |

Overrides: `PORT=… BUILD_CMD=… RUN_CMD=… LINT_CMD=… TYPECHECK_CMD=… EVAL_CMD=…`
$(CLAUDE_MD_END)
endef
export CLAUDE_MD_SECTION

define CLAUDE_SETTINGS_BASELINE
{
  "$$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(make:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git branch:*)",
      "Bash(git ls-files:*)",
      "Bash(ls:*)",
      "Bash(pwd)",
      "Bash(which:*)",
      "Bash(cat:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(wc:*)",
      "Bash(grep:*)",
      "Bash(rg:*)",
      "Bash(find:*)",
      "Bash(awk:*)",
      "Bash(sed:*)",
      "Bash(jq:*)",
      "Bash(echo:*)",
      "Bash(printf:*)",
      "Bash(sort:*)",
      "Bash(uniq:*)",
      "Bash(diff:*)",
      "Bash(test:*)",
      "Bash(curl -s:*)",
      "Bash(curl -sS:*)",
      "Bash(docker ps:*)",
      "Bash(docker image ls:*)",
      "Bash(docker image inspect:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(rm -fr:*)",
      "Bash(git push --force:*)",
      "Bash(git push -f:*)",
      "Bash(git push --force-with-lease:*)",
      "Bash(git reset --hard:*)",
      "Bash(git clean -fd:*)",
      "Bash(git clean -fdx:*)",
      "Bash(git checkout -- .)",
      "Bash(git restore .)",
      "Bash(git commit --no-verify:*)",
      "Bash(git commit -n:*)",
      "Bash(curl * | bash:*)",
      "Bash(curl * | sh:*)",
      "Bash(wget * | bash:*)",
      "Bash(wget * | sh:*)",
      "Bash(sudo:*)",
      "Bash(chmod 777:*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./**/*.pem)",
      "Read(./**/*.key)",
      "Read(./**/id_rsa*)",
      "Read(./**/credentials*.json)",
      "Read(./**/*.kdbx)",
      "Edit(./.env)",
      "Edit(./.env.*)",
      "Edit(./secrets/**)",
      "Write(./.env)",
      "Write(./.env.*)",
      "Write(./secrets/**)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Edit|Write|MultiEdit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "make -s claude-hook-redact"
          }
        ]
      }
    ]
  }
}
endef
export CLAUDE_SETTINGS_BASELINE

# -------------------------------------------------------------------
# claude-hook-redact — PreToolUse hook target. Reads tool-call JSON on
# stdin, blocks (exit 2) when input matches a known secret pattern.
# Settings.json wires this in as: command: "make -s claude-hook-redact".
#
# Default: fast regex tripwire (<30ms) for accidental paste of literal
# credentials. Heavyweight scanning stays in 'make scan-secrets'.
#
# Optional second pass: HOOK_TRUFFLEHOG=1 also pipes input through
# trufflehog (700+ detectors, catches what regex misses). Requires a
# LOCAL trufflehog binary on PATH — Docker is too slow for hook use.
# Install: 'go install github.com/trufflesecurity/trufflehog/v3@latest'
# or download from https://github.com/trufflesecurity/trufflehog/releases
# -------------------------------------------------------------------
SECRET_PATTERNS ?= AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{32,}|sk_(live|test)_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----
HOOK_TRUFFLEHOG ?=

.PHONY: claude-hook-redact
claude-hook-redact:
	@input=$$(cat); \
	hits=$$(printf '%s' "$$input" | grep -oE '$(SECRET_PATTERNS)' 2>/dev/null | sort -u | head -5); \
	if [ -z "$$hits" ] && [ -n "$(HOOK_TRUFFLEHOG)" ] && command -v trufflehog >/dev/null 2>&1; then \
	  tmp=$$(mktemp 2>/dev/null) && { \
	    printf '%s' "$$input" > "$$tmp"; \
	    hits=$$(trufflehog filesystem --no-update --no-verification "$$tmp" 2>/dev/null | grep -E '^Found' | head -3); \
	    rm -f "$$tmp"; \
	  }; \
	fi; \
	if [ -n "$$hits" ]; then \
	  echo "PreToolUse redact hook blocked — tool input contains secret-like content:" >&2; \
	  printf '%s\n' "$$hits" | sed 's/^/  - /' >&2; \
	  echo "" >&2; \
	  echo "Use an env var, vault reference, or placeholder. Do not paste literal secrets." >&2; \
	  exit 2; \
	fi

# -------------------------------------------------------------------
# .gitignore — secrets + build dirs, idempotent block.
# -------------------------------------------------------------------
# Note: \# escapes Make's comment char so the literal '# BEGIN…' survives.
GITIGNORE_BEGIN := \# BEGIN: makefile-managed (make init-gitignore)
GITIGNORE_END   := \# END: makefile-managed

define GITIGNORE_BLOCK

$(GITIGNORE_BEGIN)
# secrets — never commit
.env
.env.*
!.env.example
!.env.schema
*.pem
*.key
id_rsa*
*.p12
*.pfx
*.kdbx
secrets/
credentials*.json
# logs / runtime
logs/
*.log
$(PID_FILE)
# scrub-history work files (raw secrets until pushed; never commit)
.scrub/
# build output
target/
node_modules/
.next/
.nuxt/
dist/
build/
out/
.cache/
vendor/
.venv/
__pycache__/
*.pyc
# IDE / OS
.idea/
.vscode/
*.iml
.DS_Store
Thumbs.db
$(GITIGNORE_END)
endef
export GITIGNORE_BLOCK

.PHONY: init-gitignore
init-gitignore:
	@touch $(GITIGNORE)
	@if grep -qF '$(GITIGNORE_BEGIN)' $(GITIGNORE); then \
	  awk -v begin='$(GITIGNORE_BEGIN)' -v end='$(GITIGNORE_END)' \
	    'BEGIN{skip=0} { if (index($$0,begin)) {skip=1; next} if (skip && index($$0,end)) {skip=0; next} if (!skip) print }' \
	    $(GITIGNORE) > $(GITIGNORE).tmp && mv $(GITIGNORE).tmp $(GITIGNORE); \
	fi
	@echo "$$GITIGNORE_BLOCK" >> $(GITIGNORE)

# -------------------------------------------------------------------
# Git hooks — tracked under $(GITHOOKS_DIR), enabled via core.hooksPath.
# Pre-commit runs scan-secrets so accidental keys don't reach history.
# -------------------------------------------------------------------
define PRE_COMMIT_HOOK
#!/bin/sh
# Managed by Makefile (make hooks-install).
# Scans only files staged for THIS commit — fast even on huge repos.
# If docker / trufflehog image isn't available, the hook silently passes
# (don't block commits when the scanner can't run).
set -e
files=$$(git diff --cached --name-only --diff-filter=ACM)
[ -z "$$files" ] && exit 0
command -v docker >/dev/null 2>&1 || exit 0
docker info >/dev/null 2>&1 || exit 0
docker image inspect $(TRUFFLEHOG_IMAGE) >/dev/null 2>&1 || exit 0
exclude_arg=""
[ -f $(TRUFFLEHOG_IGNORE) ] && exclude_arg="--exclude-paths=$(TRUFFLEHOG_IGNORE)"
out=$$(docker run --rm -v "$$PWD:/pwd" -w /pwd $(TRUFFLEHOG_IMAGE) \
  filesystem $$files $$exclude_arg --no-update --no-verification 2>/dev/null)
if echo "$$out" | grep -qE 'Found (unverified|verified)'; then
  echo "❌ pre-commit: secrets detected in staged files. Commit aborted." >&2
  echo "$$out" | grep -E 'Found (unverified|verified)' >&2
  echo "Hint: 'make scan-secrets' for the full report; remove the secret and re-stage." >&2
  exit 1
fi
endef
export PRE_COMMIT_HOOK

.PHONY: hooks-install
hooks-install:
	@mkdir -p $(GITHOOKS_DIR)
	@echo "$$PRE_COMMIT_HOOK" > $(GITHOOKS_DIR)/pre-commit
	@chmod +x $(GITHOOKS_DIR)/pre-commit
	@git rev-parse --git-dir >/dev/null 2>&1 && git config core.hooksPath $(GITHOOKS_DIR) || true

.PHONY: init
init: init-preview init-docker init-claude-md init-agent-config init-gitignore hooks-install
	@echo "init complete:"
	@$(MAKE) -s detect-stack | sed 's/^/  /'

# init-preview — print warnings about pre-existing files / git state that
# init will touch. Doesn't prompt; doesn't modify anything. Set INIT_QUIET=1
# to suppress.
.PHONY: init-preview
init-preview:
	@if [ -z "$(INIT_QUIET)" ]; then \
	  if [ -f $(CLAUDE_MD) ] && ! grep -qF '$(CLAUDE_MD_BEGIN)' $(CLAUDE_MD) 2>/dev/null; then \
	    echo "ℹ️  $(CLAUDE_MD) exists; managed block will be appended"; \
	  fi; \
	  if [ -f $(GITIGNORE) ] && ! grep -qF '$(GITIGNORE_BEGIN)' $(GITIGNORE) 2>/dev/null; then \
	    echo "ℹ️  $(GITIGNORE) exists; managed block will be appended"; \
	  fi; \
	  current_hooks=`git config --get core.hooksPath 2>/dev/null || echo .git/hooks`; \
	  if [ "$$current_hooks" != "$(GITHOOKS_DIR)" ]; then \
	    if [ -f .git/hooks/pre-commit ] && [ ! -L .git/hooks/pre-commit ]; then \
	      echo "ℹ️  existing .git/hooks/pre-commit will be bypassed (core.hooksPath → $(GITHOOKS_DIR))"; \
	    fi; \
	    if [ "$$current_hooks" != ".git/hooks" ]; then \
	      echo "ℹ️  core.hooksPath is set to '$$current_hooks' — will be changed to '$(GITHOOKS_DIR)'"; \
	    fi; \
	  fi; \
	fi

# -------------------------------------------------------------------
# varlock-setup — bootstrap a varlock .env.schema for env validation.
# .env.schema is whitelisted in the managed .gitignore block (schema
# only, no values). Install varlock first:
#   npm i -g varlock     (or see https://varlock.dev)
# -------------------------------------------------------------------
.PHONY: varlock-setup
varlock-setup:
	@command -v varlock >/dev/null 2>&1 || { \
	  echo "varlock missing — install: 'npm i -g varlock' (or see https://varlock.dev)" >&2; exit 1; \
	}
	@if [ -f .env.schema ]; then \
	  echo "ℹ️  .env.schema present — validating with 'varlock load'"; \
	  varlock load; \
	else \
	  varlock init; \
	  echo "✅ wrote .env.schema — commit it; .env / .env.* values stay ignored"; \
	fi

# -------------------------------------------------------------------
# verify — single command before push: posture + full ci.
# -------------------------------------------------------------------
.PHONY: verify
verify: ai-ready ci

.PHONY: init-docker
init-docker:
	@command -v docker >/dev/null 2>&1 || { echo "docker missing; install Docker Desktop" >&2; exit 1; }
	@for img in $(DOCKER_IMAGES); do docker pull -q $$img >/dev/null; done

.PHONY: init-claude-md
init-claude-md:
	@touch $(CLAUDE_MD)
	@if grep -qF '$(CLAUDE_MD_BEGIN)' $(CLAUDE_MD); then \
	  awk -v begin='$(CLAUDE_MD_BEGIN)' -v end='$(CLAUDE_MD_END)' \
	    'BEGIN{skip=0} { if ($$0 ~ begin) {skip=1; next} if (skip && $$0 ~ end) {skip=0; next} if (!skip) print }' \
	    $(CLAUDE_MD) > $(CLAUDE_MD).tmp && mv $(CLAUDE_MD).tmp $(CLAUDE_MD); \
	fi
	@echo "$$CLAUDE_MD_SECTION" >> $(CLAUDE_MD)

.PHONY: init-claude-settings
init-claude-settings:
	@if [ ! -f $(CLAUDE_SETTINGS) ]; then \
	  mkdir -p $$(dirname $(CLAUDE_SETTINGS)); \
	  echo "$$CLAUDE_SETTINGS_BASELINE" > $(CLAUDE_SETTINGS); \
	  echo "wrote $(CLAUDE_SETTINGS) (security + productivity baseline)"; \
	fi

# Ensure the PreToolUse redact hook is present in $(CLAUDE_SETTINGS).
# Idempotent: no-op if already configured; jq-patches in if missing.
# Handles the upgrade path for projects whose settings.json predates the
# hook block. Skips with a warning if jq isn't available.
.PHONY: init-claude-hook
init-claude-hook:
	@[ -f $(CLAUDE_SETTINGS) ] || exit 0
	@command -v jq >/dev/null 2>&1 || { \
	  echo "ℹ️  jq missing — add PreToolUse hook to $(CLAUDE_SETTINGS) manually" >&2; exit 0; \
	}
	@if jq -e '.hooks.PreToolUse[]?.hooks[]? | select(.command == "make -s claude-hook-redact")' $(CLAUDE_SETTINGS) >/dev/null 2>&1; then \
	  : ; \
	else \
	  tmp=$$(mktemp); \
	  jq '.hooks //= {} | .hooks.PreToolUse //= [] | .hooks.PreToolUse += [{"matcher":"Bash|Edit|Write|MultiEdit|NotebookEdit","hooks":[{"type":"command","command":"make -s claude-hook-redact"}]}]' $(CLAUDE_SETTINGS) > $$tmp && mv $$tmp $(CLAUDE_SETTINGS); \
	  echo "patched $(CLAUDE_SETTINGS) — added PreToolUse redact hook"; \
	fi

# -------------------------------------------------------------------
# Cursor rules — equivalent baseline as .cursor/rules/security.mdc
# -------------------------------------------------------------------
define CURSOR_RULES_BASELINE
---
description: Security and productivity baseline (managed by make init)
globs:
  - "**/*"
alwaysApply: true
---

# Make-first rule
Prefer Makefile targets for build/run/test/scan/init operations. If the task isn't covered by a target, **stop and ask the user for permission** before invoking the underlying tool (mvn/npm/docker/git/etc.) directly. Do not bypass the Makefile to "save a step".

# Token economy
- Skip preambles ("I'll now…", "Let me…"); execute first, narrate sparingly.
- Cite by `path:line`; don't paste large file contents back.
- Silent success = success — don't echo "done" or re-summarize what the diff shows.
- Batch related tool calls in one round-trip; avoid read-think-read loops.
- Prefer `grep` / `make detect-stack` / `make ai-ready` over reading multiple files.
- Don't re-run a command that just succeeded; trust the exit code.

# Never read or write
- `.env`, `.env.*`
- `secrets/**`
- `**/*.pem`, `**/*.key`, `**/id_rsa*`
- `**/credentials*.json`, `**/*.kdbx`, `**/*.p12`, `**/*.pfx`

# Never run
- `rm -rf`, `rm -fr`
- `git push --force`, `git push -f`, `git push --force-with-lease`
- `git reset --hard`, `git clean -fd[x]`, `git checkout -- .`, `git restore .`
- `git commit --no-verify`, `git commit -n`
- `sudo`, `chmod 777`
- `curl ... | sh`, `curl ... | bash`, `wget ... | sh`, `wget ... | bash`
endef
export CURSOR_RULES_BASELINE

.PHONY: init-cursor-rules
init-cursor-rules:
	@if [ ! -f $(CURSOR_RULES_FILE) ]; then \
	  mkdir -p $(CURSOR_RULES_DIR); \
	  echo "$$CURSOR_RULES_BASELINE" > $(CURSOR_RULES_FILE); \
	  echo "wrote $(CURSOR_RULES_FILE) (security + productivity baseline)"; \
	fi

# Dispatch agent-specific bootstrap based on $(AGENT).
.PHONY: init-agent-config
init-agent-config:
	@case "$(AGENT)" in \
	  claude) $(MAKE) -s init-claude-settings init-claude-hook;; \
	  cursor) $(MAKE) -s init-cursor-rules;; \
	  both|*)  $(MAKE) -s init-claude-settings init-claude-hook init-cursor-rules;; \
	esac

# -------------------------------------------------------------------
# help
# -------------------------------------------------------------------
.PHONY: help
help:
	@echo "$(APP_NAME) — Makefile v$(MAKEFILE_VERSION) [stack=$(STACK), agent=$(AGENT)]"
	@echo ""
	@echo "Setup:    init           pull docker images + bootstrap CLAUDE.md, .gitignore, hook"
	@echo "          varlock-setup  bootstrap .env.schema (varlock); validates if present"
	@echo "          ai-ready       posture check (✅/⚠️/❌ per category)"
	@echo "          verify         ai-ready + ci — single command before push"
	@echo ""
	@echo "Build:    build / package / test / clean         pipeline (✅ <name> (Ns) on success)"
	@echo "          run / start / stop / restart           foreground / background process"
	@echo "          status / logs / probe / open           inspect"
	@echo ""
	@echo "Quality:  lint / typecheck / eval-quick          gated on \$$LINT_CMD/\$$TYPECHECK_CMD/\$$EVAL_CMD"
	@echo "          ci                                     chain all gates"
	@echo ""
	@echo "Security: scan-secrets / scan-secrets-verify     trufflehog (Docker, raw values redacted)"
	@echo "          scan-secrets-raw                       trufflehog with unredacted output (humans only)"
	@echo "          scan-history                           trufflehog over git history (redacted)"
	@echo "          redact-secrets                         rewrite secrets in files with REDACTION_TAG (DRY-RUN; APPLY=1)"
	@echo "          scrub-history                          rewrite leaked secrets in git history (CONFIRM=rotated)"
	@echo "          auth-check / egress-check              Anthropic auth identity + endpoint reachability"
	@echo "          sast                                   semgrep (Docker)"
	@echo "          deps-audit                             trivy CVE scan (Docker)"
	@echo ""
	@echo "Inspect:  detect-stack / version / help"
	@echo ""
	@echo "Override: PORT=9090, BUILD_CMD='npm run build', STACK=node, AGENT=cursor, INIT_QUIET=1"

.PHONY: version
version:
	@echo "$(MAKEFILE_VERSION)"

.PHONY: detect-stack
detect-stack:
	@echo "stack=$(STACK)"
	@echo "trigger=$(STACK_TRIGGER)"
	@echo "agent=$(AGENT)"

# -------------------------------------------------------------------
# build / test / package
# -------------------------------------------------------------------
.PHONY: build
build:
	$(call _stamp,build,$(BUILD_CMD))

.PHONY: package
package:
	$(call _stamp,package,$(PACKAGE_CMD))

.PHONY: test
test:
	$(call _stamp,test,$(TEST_CMD))

.PHONY: clean
clean:
	$(call _stamp,clean,$(CLEAN_CMD); rm -rf $(LOG_DIR)/*)

# -------------------------------------------------------------------
# Quality gates. Unset _CMD = silent skip (exit 0).
# -------------------------------------------------------------------
.PHONY: lint
lint:
	@if [ -z "$(LINT_CMD)" ]; then echo "⊘ lint (no LINT_CMD)"; else _t=$$(date +%s); $(or $(LINT_CMD),:) && echo "✅ lint ($$(($$(date +%s)-_t))s)"; fi

.PHONY: typecheck
typecheck:
	@if [ -z "$(TYPECHECK_CMD)" ]; then echo "⊘ typecheck (no TYPECHECK_CMD)"; else _t=$$(date +%s); $(or $(TYPECHECK_CMD),:) && echo "✅ typecheck ($$(($$(date +%s)-_t))s)"; fi

# -------------------------------------------------------------------
# SAST + dependency CVE scan. Tools print findings; silent on clean.
# -------------------------------------------------------------------
.PHONY: sast
sast:
	@command -v docker >/dev/null 2>&1 || { echo "docker missing; run 'make init'" >&2; exit 1; }
	$(call _stamp,sast,$(SEMGREP) --quiet --error --metrics=off /src)

.PHONY: deps-audit
deps-audit:
	@command -v docker >/dev/null 2>&1 || { echo "docker missing; run 'make init'" >&2; exit 1; }
	$(call _stamp,deps-audit,$(TRIVY))

# -------------------------------------------------------------------
# Eval. EVAL_CMD: e.g. 'python eval/run.py --quick' or 'npx promptfoo eval'.
# -------------------------------------------------------------------
.PHONY: eval-quick
eval-quick:
	@if [ -z "$(EVAL_CMD)" ]; then echo "⊘ eval-quick (no EVAL_CMD)"; else _t=$$(date +%s); $(or $(EVAL_CMD),:) && echo "✅ eval-quick ($$(($$(date +%s)-_t))s)"; fi

# -------------------------------------------------------------------
# ci — chain all gates. Silent on success; failing tool surfaces the error.
# -------------------------------------------------------------------
.PHONY: ci
ci: lint typecheck test scan-secrets sast deps-audit eval-quick

# -------------------------------------------------------------------
# ai-ready — config-posture check for secure agentic coding.
# Fast, no scans, no docker calls. Use 'make ci' for actual vuln scans.
# Output: PASS/WARN/FAIL per check, summary line. Exit 1 on any FAIL.
# -------------------------------------------------------------------
.PHONY: ai-ready
ai-ready: ensure-trufflehogignore
	@fail=0; warn=0; \
	chk() { case "$$1" in \
	    PASS) icon="✅";; \
	    WARN) icon="⚠️ "; warn=$$((warn+1));; \
	    FAIL) icon="❌"; fail=$$((fail+1));; \
	  esac; printf "  %s %s\n" "$$icon" "$$2"; }; \
	if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then \
	  docker_ok=1; \
	  docker image inspect $(TRUFFLEHOG_IMAGE) >/dev/null 2>&1 || { \
	    echo "(first run — pulling $(TRUFFLEHOG_IMAGE))"; \
	    docker pull -q $(TRUFFLEHOG_IMAGE) >/dev/null 2>&1 || true; \
	  }; \
	elif command -v docker >/dev/null 2>&1; then docker_ok=daemon; \
	else docker_ok=0; fi; \
	echo ""; \
	echo "── AI Readiness Report (Makefile v$(MAKEFILE_VERSION)) ──"; \
	echo ""; \
	echo "📦 Project"; \
	$(MAKE) -s detect-stack | sed 's/^/  /'; \
	echo ""; \
	echo "🔧 Infrastructure"; \
	case "$$docker_ok" in \
	  1) chk PASS "docker reachable";; \
	  daemon) chk FAIL "docker installed but daemon not reachable";; \
	  *) chk FAIL "docker missing (required for scan-secrets/sast/deps-audit)";; \
	esac; \
	echo ""; \
	echo "🤖 Agent context"; \
	[ -f $(CLAUDE_MD) ] \
	  && chk PASS "$(CLAUDE_MD) present" \
	  || chk FAIL "$(CLAUDE_MD) missing (run 'make init')"; \
	case "$(AGENT)" in \
	  claude) \
	    [ -f $(CLAUDE_SETTINGS) ] \
	      && chk PASS "$(CLAUDE_SETTINGS) present" \
	      || chk WARN "$(CLAUDE_SETTINGS) missing (no agent permissions allowlist)";; \
	  cursor) \
	    [ -f $(CURSOR_RULES_FILE) ] \
	      && chk PASS "$(CURSOR_RULES_FILE) present" \
	      || chk WARN "$(CURSOR_RULES_FILE) missing (no agent rules baseline)";; \
	  *) \
	    [ -f $(CLAUDE_SETTINGS) ] \
	      && chk PASS "$(CLAUDE_SETTINGS) present" \
	      || chk WARN "$(CLAUDE_SETTINGS) missing (Claude permissions allowlist)"; \
	    [ -f $(CURSOR_RULES_FILE) ] \
	      && chk PASS "$(CURSOR_RULES_FILE) present" \
	      || chk WARN "$(CURSOR_RULES_FILE) missing (Cursor rules baseline)";; \
	esac; \
	echo ""; \
	echo "🔐 Secrets"; \
	if [ -f .gitignore ] && grep -qE '^\.env' .gitignore; then \
	  chk PASS ".gitignore covers .env"; \
	else chk FAIL ".gitignore missing .env pattern"; fi; \
	tracked_env=`git ls-files 2>/dev/null | grep -E '(^|/)\.env(\..+)?$$' | grep -vE '\.(example|sample|dist|template)$$' || true`; \
	if [ -n "$$tracked_env" ]; then \
	  chk FAIL "tracked .env files in git: $$tracked_env"; \
	else chk PASS "no tracked .env files"; fi; \
	if [ "$$docker_ok" = "1" ] && docker image inspect $(TRUFFLEHOG_IMAGE) >/dev/null 2>&1; then \
	  th_out=`$(TRUFFLEHOG) filesystem . --exclude-paths=$(TRUFFLEHOG_IGNORE) --no-update --no-verification 2>/dev/null | grep -cE 'Found (unverified|verified)' || true`; \
	  if [ "$$th_out" -gt 0 ] 2>/dev/null; then \
	    chk FAIL "$$th_out secret(s) detected — 'make scan-secrets' for details"; \
	  else \
	    chk PASS "no secrets detected (trufflehog)"; \
	  fi; \
	else \
	  chk FAIL "secrets scan could not run"; \
	fi; \
	echo ""; \
	echo "🎯 Quality gates"; \
	[ -n "$(LINT_CMD)$(TYPECHECK_CMD)$(EVAL_CMD)" ] \
	  && chk PASS "quality gate configured" \
	  || chk WARN "no LINT_CMD/TYPECHECK_CMD/EVAL_CMD set"; \
	echo ""; \
	echo "─────────────────────────"; \
	if [ $$fail -gt 0 ]; then \
	  echo "❌ Project is NOT AI-ready — $$fail blocker(s), $$warn warning(s)." >&2; exit 1; \
	elif [ $$warn -gt 0 ]; then \
	  echo "✅ Project is AI-ready with $$warn optional improvement(s)."; \
	else echo "✅ Project is AI-ready for secure agentic coding."; fi

# -------------------------------------------------------------------
# Process management
# -------------------------------------------------------------------
.PHONY: run
run:
	@mkdir -p $(LOG_DIR)
	@$(RUN_CMD)

.PHONY: start
start:
	@if [ -f $(PID_FILE) ] && kill -0 `cat $(PID_FILE)` 2>/dev/null; then \
	  echo "already running pid=`cat $(PID_FILE)`" >&2; exit 1; \
	fi
	@mkdir -p $(LOG_DIR)
	@nohup $(RUN_CMD) > $(LOG_DIR)/run.out 2>&1 & echo $$! > $(PID_FILE)
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25; do \
	  if curl -sS -o /dev/null -w "%{http_code}" $(HEALTH_URL) 2>/dev/null | grep -q "^200$$"; then \
	    echo "started pid=`cat $(PID_FILE)`"; exit 0; \
	  fi; sleep 1; \
	done; \
	echo "timeout after 25s; see $(LOG_DIR)/run.out" >&2; exit 1

.PHONY: stop
stop:
	@if [ -f $(PID_FILE) ]; then \
	  PID=`cat $(PID_FILE)`; \
	  if kill -0 $$PID 2>/dev/null; then \
	    kill $$PID; sleep 2; \
	    kill -0 $$PID 2>/dev/null && kill -9 $$PID || true; \
	  fi; \
	  rm -f $(PID_FILE); \
	fi
	@pkill -f '$(RUN_PATTERN)' 2>/dev/null || true

.PHONY: restart
restart: stop start

.PHONY: status
status:
	@if [ -f $(PID_FILE) ] && kill -0 `cat $(PID_FILE)` 2>/dev/null; then \
	  echo "running pid=`cat $(PID_FILE)` port=$(PORT)"; \
	else \
	  echo "stopped"; \
	fi

.PHONY: logs
logs:
	@mkdir -p $(LOG_DIR)
	@touch $(LOG_DIR)/run.out
	@tail -f $(LOG_DIR)/run.out

# -------------------------------------------------------------------
# probe — emit "<code> <path>" per line
# -------------------------------------------------------------------
.PHONY: probe
probe:
	@for p in $(PROBE_PATHS); do \
	  code=`curl -sS -o /dev/null -w "%{http_code}" "http://localhost:$(PORT)$$p"`; \
	  echo "$$code $$p"; \
	done

.PHONY: open
open:
	@command -v open >/dev/null && open "$(HEALTH_URL)" || \
	 command -v xdg-open >/dev/null && xdg-open "$(HEALTH_URL)" || \
	 echo "$(HEALTH_URL)"

# -------------------------------------------------------------------
# Secret scanning (trufflehog via Docker by default)
# -------------------------------------------------------------------
# No local install needed — pulls $(TRUFFLEHOG_IMAGE) on first run.
# Refresh the image with 'make scan-update'. Override TRUFFLEHOG to use
# a local binary if you have one installed.
#
# Excludes node_modules, .next, build dirs etc. by default — see
# TRUFFLEHOG_IGNORE_DEFAULTS in the CONFIG block. A project-level
# $(TRUFFLEHOG_IGNORE) file overrides those defaults if it exists.
.PHONY: ensure-trufflehog
ensure-trufflehog:
	@command -v $(TRUFFLEHOG_BIN) >/dev/null 2>&1 || { \
	  echo "$(TRUFFLEHOG_BIN) missing; run 'make init' or set TRUFFLEHOG=<binary>" >&2; exit 1; \
	}
	@if [ "$(TRUFFLEHOG_BIN)" = "docker" ]; then \
	  docker image inspect $(TRUFFLEHOG_IMAGE) >/dev/null 2>&1 || docker pull -q $(TRUFFLEHOG_IMAGE) >/dev/null; \
	fi

.PHONY: scan-update
scan-update:
	@[ "$(TRUFFLEHOG_BIN)" = "docker" ] && docker pull -q $(TRUFFLEHOG_IMAGE) >/dev/null || true
	@command -v docker >/dev/null 2>&1 || { echo "docker missing; run 'make init'" >&2; exit 1; }
	@$(TRIVY_DOCKER) image --download-db-only --quiet
	@$(TRIVY_DOCKER) image --download-java-db-only --quiet

.PHONY: ensure-trufflehogignore
ensure-trufflehogignore:
	@if [ ! -f $(TRUFFLEHOG_IGNORE) ]; then \
	  for p in $(TRUFFLEHOG_IGNORE_DEFAULTS); do echo "$$p"; done > $(TRUFFLEHOG_IGNORE); \
	fi

# Redact 'Raw result:' lines from trufflehog text output so agents can
# safely run scan-secrets without the actual secret values landing in
# their context. Detector type, file, and line stay intact — enough to
# act on the finding. Use 'scan-secrets-raw' to see the unredacted
# values locally.
REDACT_SECRETS ?= sed -E 's/^(Raw( verified)? result:).*/\1 [REDACTED]/'

.PHONY: scan-secrets
scan-secrets: ensure-trufflehog ensure-trufflehogignore
	$(call _stamp,scan-secrets,$(TRUFFLEHOG) filesystem . --exclude-paths=$(TRUFFLEHOG_IGNORE) --no-update --no-verification 2>/dev/null | $(REDACT_SECRETS))

.PHONY: scan-secrets-raw
scan-secrets-raw: ensure-trufflehog ensure-trufflehogignore
	$(call _stamp,scan-secrets-raw,$(TRUFFLEHOG) filesystem . --exclude-paths=$(TRUFFLEHOG_IGNORE) --no-update --no-verification 2>/dev/null)

.PHONY: scan-secrets-verify
scan-secrets-verify: ensure-trufflehog ensure-trufflehogignore
	$(call _stamp,scan-secrets-verify,$(TRUFFLEHOG) filesystem . --exclude-paths=$(TRUFFLEHOG_IGNORE) --no-update 2>/dev/null | $(REDACT_SECRETS))

.PHONY: scan-history
scan-history: ensure-trufflehog
	$(call _stamp,scan-history,$(TRUFFLEHOG) git file:///pwd --no-update --no-verification 2>/dev/null | $(REDACT_SECRETS))

# -------------------------------------------------------------------
# redact-secrets — find secrets in working-tree files and replace each
# raw value with $(REDACTION_TAG) in-place. Reuses trufflehog detection.
# DRY-RUN by default; pass APPLY=1 to actually rewrite files.
# Multi-line secrets (RSA keys etc.) are handled via perl slurp mode.
# -------------------------------------------------------------------
REDACTION_TAG ?= [REDACTED-BY-MAKE]

.PHONY: redact-secrets
redact-secrets: ensure-trufflehog ensure-trufflehogignore
	@command -v jq >/dev/null 2>&1 || { echo "jq missing — install jq" >&2; exit 1; }
	@command -v perl >/dev/null 2>&1 || { echo "perl missing" >&2; exit 1; }
	@mode="DRY-RUN"; [ -n "$(APPLY)" ] && mode="APPLY"; \
	pairs=$$($(TRUFFLEHOG) filesystem . --exclude-paths=$(TRUFFLEHOG_IGNORE) --no-update --no-verification --json 2>/dev/null \
	  | jq -rc 'select(.Raw != null) | [.SourceMetadata.Data.Filesystem.file, .DetectorName, .Raw] | @base64'); \
	if [ -z "$$pairs" ]; then echo "✅ no secrets found"; exit 0; fi; \
	echo "── redact-secrets ($$mode) — tag=$(REDACTION_TAG) ──"; \
	echo "$$pairs" | while read -r pair; do \
	  decoded=$$(echo "$$pair" | base64 -d); \
	  file=$$(echo "$$decoded" | jq -r '.[0]'); \
	  detector=$$(echo "$$decoded" | jq -r '.[1]'); \
	  raw=$$(echo "$$decoded" | jq -r '.[2]'); \
	  [ -z "$$file" ] || [ -z "$$raw" ] && continue; \
	  rel=$${file#/pwd/}; \
	  if [ ! -f "$$rel" ]; then echo "  ⚠️  skip $$detector — $$rel not on disk"; continue; fi; \
	  if [ -z "$(APPLY)" ]; then \
	    echo "  would redact $$detector in $$rel"; \
	  else \
	    if RAW="$$raw" TAG="$(REDACTION_TAG)" perl -i -0777 -pe 's/\Q$$ENV{RAW}\E/$$ENV{TAG}/g' "$$rel"; then \
	      echo "  ✅ redacted $$detector in $$rel"; \
	    else \
	      echo "  ❌ failed to redact $$detector in $$rel" >&2; \
	    fi; \
	  fi; \
	done; \
	if [ -z "$(APPLY)" ]; then \
	  echo "DRY-RUN complete — pass APPLY=1 to rewrite files."; \
	else \
	  echo "Done. Review with 'git diff' before committing."; \
	fi

# -------------------------------------------------------------------
# scrub-history — find leaked secrets in git history and rewrite them.
#
#   make scrub-history                  # scan + summary, no changes
#   make scrub-history CONFIRM=rotated  # rewrites in mirror, prints push cmd
#
# CONFIRM=rotated is the gate AND the reminder: rotate the secret first.
# History rewrite is NOT remediation — clones, reflogs, CI artifacts,
# registries, and leak scrapers all still have the value.
#
# Never auto-pushes. Operates on a fresh --mirror clone; original repo
# untouched until you manually run the printed 'git push --force --mirror'.
#
# Requires: git-filter-repo (pipx install git-filter-repo), jq, docker.
# -------------------------------------------------------------------
SCRUB_DIR        ?= .scrub
SCRUB_MIRROR_DIR ?= $(SCRUB_DIR)/mirror

.PHONY: scrub-history
scrub-history: ensure-trufflehog
	@command -v jq >/dev/null 2>&1 || { echo "jq missing" >&2; exit 1; }
	@git rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ not a git repo" >&2; exit 1; }
	@mkdir -p $(SCRUB_DIR)
	@echo "── fetching all refs (so remote-only branches are covered) ──"
	@git fetch --all --prune --quiet 2>/dev/null || echo "  ⚠️  fetch failed — scanning local refs only"
	@echo "── scanning git history ──"
	@$(TRUFFLEHOG) git file:///pwd --no-update --no-verification --json \
	  | jq -r 'select(.Raw != null and (.Raw | length) > 0) | [.DetectorName, .Raw] | @tsv' \
	  | sort -u > $(SCRUB_DIR)/findings.tsv
	@n=$$(wc -l < $(SCRUB_DIR)/findings.tsv | tr -d ' '); \
	if [ "$$n" = "0" ]; then \
	  echo "✅ no secrets in history"; rm -rf $(SCRUB_DIR); exit 0; \
	fi; \
	echo ""; \
	echo "found $$n unique secret(s):"; \
	cut -f1 $(SCRUB_DIR)/findings.tsv | sort | uniq -c | sed 's/^/  /'; \
	echo ""; \
	if [ "$(CONFIRM)" != "rotated" ]; then \
	  echo "⚠️  Rewrite is NOT remediation — copies exist in clones, CI, registries, backups."; \
	  echo "   Rotate the secret first, then re-run: make scrub-history CONFIRM=rotated"; \
	  exit 0; \
	fi; \
	command -v git-filter-repo >/dev/null 2>&1 || { \
	  echo "❌ git-filter-repo missing — pipx install git-filter-repo" >&2; exit 1; \
	}; \
	if [ -n "$$(git status --porcelain)" ]; then \
	  echo "❌ working tree not clean — commit or stash first" >&2; exit 1; \
	fi; \
	origin=$$(git config --get remote.origin.url); \
	[ -n "$$origin" ] || { echo "❌ no origin remote" >&2; exit 1; }; \
	awk -F'\t' -v tag='$(REDACTION_TAG)' '{ print $$2 "==>" tag }' $(SCRUB_DIR)/findings.tsv > $(SCRUB_DIR)/replacements.txt; \
	rm -rf $(SCRUB_MIRROR_DIR); \
	echo "── cloning mirror & rewriting ──"; \
	git clone --mirror "$$origin" $(SCRUB_MIRROR_DIR); \
	cp $(SCRUB_DIR)/replacements.txt $(SCRUB_MIRROR_DIR)/replacements.txt; \
	(cd $(SCRUB_MIRROR_DIR) && git filter-repo --replace-text replacements.txt --force); \
	echo ""; \
	echo "✅ rewritten in $(SCRUB_MIRROR_DIR)"; \
	echo ""; \
	echo "Push when coordinated (DESTRUCTIVE — invalidates open MRs and pinned SHAs):"; \
	echo "  cd $(SCRUB_MIRROR_DIR) && git push --force --mirror"; \
	echo ""; \
	echo "After push: every contributor must re-clone (no rebase). Trigger GitLab housekeeping."

# -------------------------------------------------------------------
# auth-check — verify which Anthropic auth identity is active.
#
# Under Team / Enterprise plans (with AVV in place), $$ANTHROPIC_API_KEY
# in the dev shell SILENTLY overrides Claude Code's OAuth/SSO. Effect:
# requests route under a personal API key instead of the Team account,
# bypassing the org's audit trail and pulling traffic OUT of AVV scope.
# This target surfaces the override before it becomes a compliance event.
# -------------------------------------------------------------------
.PHONY: auth-check
auth-check:
	@echo "── auth-check ──"
	@if [ -n "$$ANTHROPIC_API_KEY" ]; then \
	  prefix=$$(printf '%s' "$$ANTHROPIC_API_KEY" | cut -c1-12); \
	  echo "  ⚠️  ANTHROPIC_API_KEY set ($$prefix..., len $${#ANTHROPIC_API_KEY})"; \
	  echo "     → silently overrides Claude Code OAuth/SSO"; \
	  echo "     → personal keys break Team-plan audit trail (AVV scope leak)"; \
	  if command -v curl >/dev/null 2>&1; then \
	    code=$$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
	      -H "x-api-key: $$ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \
	      https://api.anthropic.com/v1/models 2>/dev/null || echo FAIL); \
	    case "$$code" in \
	      200)       echo "  ✅ API key authenticates";; \
	      401|403)   echo "  ❌ API key rejected (HTTP $$code)";; \
	      FAIL|000)  echo "  ⚠️  api.anthropic.com unreachable — run 'make egress-check'";; \
	      *)         echo "  ⚠️  unexpected response (HTTP $$code)";; \
	    esac; \
	  fi; \
	else \
	  echo "  ✅ ANTHROPIC_API_KEY not in env — Claude Code uses OAuth/SSO"; \
	fi
	@for f in "$$HOME/.claude/credentials.json" "$$HOME/.config/claude/credentials.json"; do \
	  if [ -f "$$f" ]; then echo "  ℹ️  OAuth credentials present: $$f"; fi; \
	done
	@echo "  verify identity: console.anthropic.com → Settings → Members"

# -------------------------------------------------------------------
# egress-check — verify Anthropic endpoints are reachable.
# Surfaces corporate-proxy / TLS-inspection / firewall friction before
# the dev hits it inside Claude Code. Cowork desktop ignores HTTPS_PROXY
# (open issue) — for that flow use the CLI or fix the proxy at OS level.
# -------------------------------------------------------------------
.PHONY: egress-check
egress-check:
	@echo "── egress-check ──"
	@proxy="$${HTTPS_PROXY:-$${https_proxy:-none}}"; \
	echo "  HTTPS_PROXY: $$proxy"; \
	[ -n "$$NODE_EXTRA_CA_CERTS" ] && echo "  NODE_EXTRA_CA_CERTS: $$NODE_EXTRA_CA_CERTS" || true; \
	[ -n "$$REQUESTS_CA_BUNDLE" ] && echo "  REQUESTS_CA_BUNDLE: $$REQUESTS_CA_BUNDLE" || true
	@for host in api.anthropic.com console.anthropic.com claude.ai; do \
	  code=$$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://$$host/" 2>/dev/null || echo FAIL); \
	  case "$$code" in \
	    200|301|302|401|403|404) printf "  ✅ %-25s HTTP %s\n" "$$host" "$$code";; \
	    FAIL|000)                printf "  ❌ %-25s unreachable (proxy/firewall?)\n" "$$host";; \
	    *)                       printf "  ⚠️  %-25s HTTP %s\n" "$$host" "$$code";; \
	  esac; \
	done
