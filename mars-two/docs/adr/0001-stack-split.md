# 0001. Three languages: Ruby, Python, TypeScript

Status: accepted
Date: 2026-09-12

## Context

The brief was to build on whichever stack Aries Global is likely to use, rather than
whichever stack is most convenient.

Aries publishes this in its own job specs. The Software Engineer posting says backend
work is "APIs, data models, and integrations in Ruby and Python that pull structured
and unstructured data from acquired companies into Aries One", frontend work is "the
React interfaces that surface real-time operational intelligence", and states that the
codebase is "90%+ Ruby". The company describes two engineering teams: the Aries One
team on the core platform, and Central Engineering deploying forward into group
companies.

An earlier draft of this project proposed a single TypeScript monorepo, on the
reasoning that one language is cheaper to operate. That reasoning was sound and the
conclusion was wrong, because it optimised for the build rather than for the stack the
work actually sits on.

## Decision

Three services.

`platform` is Rails 8 in API-only mode. It owns Postgres, the tenant boundary, role
scoping, every metric rollup, and the integrations that pull data out of portfolio
companies. Rails is the right shape for this: the work is schema, migrations,
associations, authorisation and CRUD-heavy integration code, which is what Rails is
densest at, and it matches where 90% of the real codebase lives.

`intelligence` is Python on FastAPI. It owns retrieval, the tool registry, the agent
runtime and the eval harness. It reads through `platform`'s HTTP API and never
connects to Postgres directly.

`web` is React with TypeScript on Vite.

## Alternatives considered

**Everything in Ruby.** Fewer moving parts, and it matches the 90% figure most
closely. Rejected because the evaluation and retrieval ecosystem is overwhelmingly
Python, and the eval harness is the centre of this project rather than a side concern.
Rebuilding embedding, chunking and grading primitives in Ruby would cost weeks and
teach nothing about AI engineering.

**Everything in Python.** Comfortable, and the fastest route to working agents.
Rejected because it contradicts the brief and would skip the Rails and Postgres
fundamentals that the Software Engineering Fundamentals skill is about.

**A single TypeScript monorepo.** The original proposal, and the easiest to run.
Rejected on evidence once the job specs were read.

## Consequences

The service boundary between `platform` and `intelligence` is now load-bearing rather
than decorative, which is a benefit and a cost.

The benefit: the tenant boundary is enforced in exactly one process. `intelligence`
holds no database credentials, so an agent that is prompt-injected into requesting
another tenant's data gets a 403 from `platform` rather than a result set. That is a
stronger guarantee than any amount of careful application code in a single process.

The cost: every piece of data an agent needs must exist as an API endpoint first. This
is slower than reaching into the database, and it is the point. It forces the "models
never do arithmetic" invariant to be structural rather than aspirational, because the
only things an agent can see are things `platform` chose to compute and expose.

Three toolchains in CI. Three dependency files. A contract between `platform` and
`intelligence` that can drift, which is why the API contract is typed on both sides and
tested from `intelligence` against a running `platform`.
