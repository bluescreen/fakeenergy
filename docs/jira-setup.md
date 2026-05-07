# Jira-in-Docker setup for the fakeenergy tickets

This brings up a local Jira Software instance and pushes the seven
markdown tickets in `docs/tickets/` into it via the REST API. The
result is a realistic Jira project that an agent can be pointed at
during the debugging demo.

## What you'll get

- A Jira Software 9.x server on `http://localhost:8090`
- Postgres backing store
- Project key `SLOP`, seven Bug issues mirroring `docs/tickets/*.md`
- Original IDs preserved as summary prefix and label

## What you'll need

- Docker Desktop running, ~3 GB free RAM
- An Atlassian eval license (free 30-day, no credit card required)
- Node 18+ (or the bundled Node from this repo's `package.json`)
- ~10 minutes wall clock for first boot plus the wizard

## 1 — Start the stack

```bash
docker compose -f docker/jira/docker-compose.yml up -d
docker compose -f docker/jira/docker-compose.yml logs -f jira
```

First boot takes 2–4 minutes. Wait until the log line
`Server startup logs are located in [...]/atlassian-jira.log` and
the wizard URL becomes reachable.

## 2 — Run the Jira setup wizard

Open `http://localhost:8090`. The wizard walks through:

1. **Setup mode** — choose "I'll set it up myself".
2. **Database** — already configured by the compose env, click next.
3. **License** — click "generate a Jira evaluation license" inside
   the wizard. It round-trips to `my.atlassian.com`. Sign in (or
   create) an Atlassian account, generate a Jira Software (Data
   Center) eval key, and the wizard pastes it back. The eval is
   30 days.
4. **Admin user** — pick an email + password. Remember the
   password. This becomes the API caller.
5. **Email server** — skip, click "Later".

After login:

6. **Create the project**. Top nav → Projects → Create project.
   Template: "Bug tracking" or "Scrum software development". Project
   name "Slopwerk Energy", project **key must be `SLOP`** (the
   push script uses this key). Lead: yourself.

## 3 — Generate a Personal Access Token

User profile (top right avatar) → Personal Access Tokens → Create
token. Name it something like "fakeenergy-push", no expiry for
demo purposes. Copy the token. Treat it like a password.

## 4 — Push the tickets

From the repo root:

```bash
export JIRA_URL=http://localhost:8090
export JIRA_TOKEN=<the-PAT-you-just-copied>
node scripts/push-tickets.mjs
```

Expected output:

```
OK    SLOP-2104 -> SLOP-1  http://localhost:8090/browse/SLOP-1
OK    SLOP-2118 -> SLOP-2  http://localhost:8090/browse/SLOP-2
OK    SLOP-2127 -> SLOP-3  http://localhost:8090/browse/SLOP-3
OK    SLOP-2133 -> SLOP-4  http://localhost:8090/browse/SLOP-4
OK    SLOP-2141 -> SLOP-5  http://localhost:8090/browse/SLOP-5
OK    SLOP-2152 -> SLOP-6  http://localhost:8090/browse/SLOP-6
OK    SLOP-2168 -> SLOP-7  http://localhost:8090/browse/SLOP-7

7 ok, 0 failed
```

The original IDs (`SLOP-2104` etc.) survive in:

- The summary prefix (`[SLOP-2104] Auszahlung Solar viel zu...`)
- A label (`slop-2104`)
- The first lines of the description (`*Original ticket ID:* SLOP-2104`)

To dry-run without posting, prepend `DRY_RUN=1`:

```bash
DRY_RUN=1 node scripts/push-tickets.mjs
```

## 5 — Verify

Open `http://localhost:8090/issues/?jql=project%3DSLOP+ORDER+BY+key+ASC`.

You should see seven Bug issues with German descriptions.

## Teardown

```bash
docker compose -f docker/jira/docker-compose.yml down
```

This stops containers but **keeps** the named volumes
(`jira_home`, `jira_db`), so the license, tickets, and admin user
survive a restart.

To wipe everything (including the eval license) and force a fresh
setup:

```bash
docker compose -f docker/jira/docker-compose.yml down -v
```

## Troubleshooting

- **Wizard hangs on "license"** — Click the "trial" link inside
  the wizard. It opens `my.atlassian.com` in a new tab. Generate a
  Jira Software (Data Center) eval key there, paste it back.
- **Port 8090 already in use** — Edit the host port in
  `docker/jira/docker-compose.yml` (left side of `8090:8080`) and
  re-run.
- **Out of memory at boot** — Raise Docker Desktop's memory
  allocation to at least 4 GB. If your machine is tight, drop
  `JVM_MAXIMUM_MEMORY` to `1024m`. Below 1024m Jira tends to OOM
  during plugin init.
- **Push script returns 401** — PAT mistyped or expired. Regenerate.
- **Push script returns 400 on priority** — Some Jira project
  configurations don't expose Priority on Bug. Either add it via
  Project Settings → Issue Types → Bug → Field configuration, or
  remove the `priority` line from the payload in
  `scripts/push-tickets.mjs`.
- **Push script returns 400 on issuetype "Bug"** — The Scrum
  template uses "Story", "Task", "Bug". The Bug-tracking template
  uses "Bug" only. If you picked Kanban with a custom set, change
  the `issuetype.name` in the script payload.
- **Description shows raw markdown markers** — Server/DC stores
  the description as wiki markup. The script writes it as plain
  text with `*bold*` and `----` markers. Headings (`##`) won't
  render — Jira wiki uses `h2.` for headings. If you care about
  perfect rendering, run the bodies through a markdown→Jira-wiki
  converter before posting (e.g. `markdown-to-jira` on npm).

## Atlassian Cloud alternative

If you don't want Docker locally, Atlassian Cloud has a free tier
for up to 10 users.

To target Cloud with this script you'd need two changes:

1. Auth: basic auth, where `JIRA_USER` is your Atlassian email and
   `JIRA_TOKEN` is an API token from
   `id.atlassian.com/manage-profile/security/api-tokens`. The
   script already handles this — set `JIRA_USER` and `JIRA_PASSWORD`
   (use the API token as the password) and unset `JIRA_TOKEN`.
2. Description format: Cloud requires ADF (Atlassian Document
   Format), not plain text. The current script writes plain text,
   which Cloud will store but render as a single paragraph. To get
   proper formatting on Cloud, swap the `description` string for
   an ADF document. There are converters on npm
   (`@atlaskit/editor-markdown-transformer`) but they pull a heavy
   dependency tree.

For the simplest path: stay with Server/DC via Docker as above.

## Security notes

- The compose file uses a hardcoded DB password (`jiradbpw`). Fine
  for a local demo, never for anything that touches real data.
- Treat the PAT like a password. Do not commit it. The script
  reads it from the environment so a `.env.local` (gitignored) is
  the natural home.
- The eval license is tied to the Atlassian account that generated
  it. If you tear down the volumes, you'll need to generate a new
  eval (or extend the existing one).
