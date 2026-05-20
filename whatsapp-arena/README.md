# WhatsApp Arena

Personal AI layer over WhatsApp. A bot scans your chats for interesting
messages and pre-drafts replies in your voice; a web dashboard lets you
review and approve them.

## Architecture

```
                  +-------------------+
                  |   WhatsApp Web    |
                  +---------+---------+
                            | (QR auth, persistent session)
                            v
+-------------+      +------+------+      +-------------+
|  Web UI     |<---->|  Postgres   |<-----|  Bot        |
|  (Next.js)  |      |   (RDS)     |      |  (Node +    |
|             |      |             |      |  Chromium)  |
+-------------+      +------+------+      +------+------+
                            ^                    |
                            |                    | Anthropic API
                            +--------------------+
```

Two long-running services share one Postgres database. The DB *is* the
job queue: bot writes messages → scanner marks them interesting →
drafter writes pending Drafts → user approves in UI → sender picks up
APPROVED drafts and sends via WhatsApp.

## Repo layout

- `apps/web` — Next.js 15 dashboard (Inbox, Drafts, Persona)
- `apps/bot` — Node service running whatsapp-web.js + scanner + sender
- `packages/db` — Prisma schema and client, shared by both apps
- `packages/ai` — Anthropic SDK wrapper, scan + draft prompts
- `packages/shared` — shared TypeScript types
- `infra/docker` — Dockerfiles for ECS deployment

## Local setup

```bash
# 1. Install deps
pnpm install

# 2. Start Postgres (any way — Docker is easiest)
docker run -d --name arena-pg -p 5432:5432 \
  -e POSTGRES_USER=arena -e POSTGRES_PASSWORD=arena -e POSTGRES_DB=arena \
  postgres:16

# 3. Configure env
cp .env.example .env  # fill in ANTHROPIC_API_KEY

# 4. Migrate DB
pnpm db:migrate

# 5. Run bot (scan QR with WhatsApp)
pnpm --filter @arena/bot dev

# 6. In another terminal, run web UI
pnpm --filter @arena/web dev
# open http://localhost:3000
```

## AWS deployment (manual)

| Piece           | AWS service                                   |
| --------------- | --------------------------------------------- |
| Bot             | ECS Fargate task (1 task, no autoscale)       |
| Bot WA session  | EFS volume mounted at `/app/apps/bot/sessions`|
| Web UI          | ECS Fargate behind ALB, OR Amplify            |
| Database        | RDS Postgres (db.t4g.micro is enough)         |
| Secrets         | Secrets Manager → injected as env vars        |
| Container image | ECR (push from local or via GitHub Actions)   |

Steps the first time:

1. Create an RDS Postgres instance, copy the connection string.
2. Create an ECR repo for `arena-bot` and `arena-web`. Push images:
   ```bash
   docker build -f infra/docker/bot.Dockerfile -t arena-bot .
   # tag + push to ECR
   ```
3. Create an EFS filesystem; mount target in the same VPC as the bot.
4. Create an ECS cluster (Fargate). Define two task definitions:
   - `arena-bot`: 1 vCPU / 2 GB RAM, env vars from Secrets Manager,
     mount EFS at `/app/apps/bot/sessions`.
   - `arena-web`: 0.5 vCPU / 1 GB RAM, behind an ALB on port 3000.
5. Run the bot task once with logs visible, scan the QR from CloudWatch
   logs (it's printed as ASCII). Future restarts reuse the EFS session.
6. Run migrations: `pnpm db:migrate` against the RDS URL from your
   laptop (allow your IP temporarily in the RDS security group).

## Learning roadmap

If you're new to full-stack, work through it in this order:

1. **DB & types** — read `packages/db/prisma/schema.prisma`. This is
   the contract between everything else.
2. **Bot ingestion** — `apps/bot/src/handlers/onMessage.ts`. See how
   external events become DB rows.
3. **Background jobs** — `apps/bot/src/scanner/loop.ts`. The DB-as-queue
   pattern: poll for unscanned rows, do work, update them.
4. **Server-rendered pages** — `apps/web/app/inbox/page.tsx`. Async
   React Server Components reading directly from Prisma.
5. **Client interactivity** — `apps/web/components/DraftRow.tsx`. A
   "use client" component calling a route handler.
6. **API routes** — `apps/web/app/api/drafts/[id]/route.ts`. The
   server-side mutation endpoint.
7. **Deploy** — package as Docker, push to ECR, run on ECS.

## What's intentionally missing

This scaffold is a starting point. You'll want to add as you go:

- Auth (currently single-user, no login — fine on a private VPC)
- Rate limiting and retries around Anthropic calls
- Per-chat scan rules (the `Chat.scanEnabled` / `Chat.tone` fields exist
  but no UI yet)
- Group-chat news digest (currently one draft per interesting message —
  you may want a daily summary instead)
- Tests
