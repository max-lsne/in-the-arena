# Decisions

Settled. Do not reopen without a reason that is new.

## Scope

Eight fictional portfolio companies, totalling EUR 70.0M ARR exactly. Synthetic
data throughout, deterministic under a fixed seed. Multiple agents, evals and
metrics. The folder is `mars-two/`.

## Stack

Ruby and Rails for the platform, Python for the intelligence service, React and
TypeScript for the web. Chosen from evidence rather than taste: Aries Global's
own job specs say the codebase is 90%+ Ruby, with Python for backend work and
React on the front end. An earlier recommendation of a TypeScript monorepo was
made without checking and was wrong. See `docs/adr/0001-stack-split.md`.

## Boundaries

Tenant isolation is Postgres row-level security, not application scoping.
The eval answer key is revoked from the runtime role and has no endpoint.
Every figure an agent can state was computed in SQL first.
Retrieval runs in the platform, because a vector search is still a query.

## Working agreements

Local and GitHub only. Deployment comes later.

Pull requests are not opened unless asked. PR #84 is the one that exists, and
pushing to `claude/wonderful-davinci-gl6s4o` updates it.

No message, comment or email is sent anywhere without the exact text being
approved first.
