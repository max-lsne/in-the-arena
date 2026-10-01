# platform

The Rails API. It owns Postgres, the tenant boundary, and every computed number.

Skills Map: **Software engineering fundamentals**, particularly data store design
and security, and the half of **Building and deploying AI applications** that is
about grounding a model in figures it cannot invent.

## Tradeoff taken

Tenant isolation is a Postgres row-level security policy, not a `where` clause.

Application-level scoping is faster to write and easier to read, and it fails the
first time somebody adds a query that forgets it. A policy cannot be forgotten: a
missing scope produces an empty result rather than another company's data. The
cost is that the schema can no longer be dumped as `schema.rb`, because Ruby's
schema format cannot express a policy, and that every developer needs two
database roles locally. Both are paid once. See `docs/adr/0002`.

The second tradeoff follows from the first. Every figure an agent can reach was
computed here in SQL and arrives labelled with its unit, its formula and how many
rows it came from. That is slower than handing a model rows and asking for a
total, and it is the only version where the total is right every time.

## Endpoints

All of them require a bearer token and return only what that token's grant
allows. A company outside the grant is a 404, not a 403: the caller learns
nothing about whether it exists.

| Path | What it answers |
| --- | --- |
| `GET /api/v1/companies` | The portfolio, each with its own definition of ARR |
| `GET /api/v1/metrics` | Precomputed monthly figures, with unit and formula |
| `GET /api/v1/initiatives` | The value creation plan, with checkable progress |
| `POST /api/v1/retrieval/search` | Vector search over contracts, minutes and transcripts |
| `GET /api/v1/reconciliation/contract_billing` | Contracts whose invoices disagree with their terms |
| `GET /api/v1/detections/crm_hygiene` | CRM records that contradict something else on the record |
| `GET /api/v1/detections/onboarding_stalls` | Onboardings that stopped, and the step they stopped at |
| `GET /api/v1/detections/churn_risk` | Accounts ranked by risk, with the signals behind each score |
| `GET /api/v1/evals/cases` | The recorded per-case eval ledger, filtered to the caller's grant |

Retrieval runs here rather than in the Python service so that row-level security
applies to it. A vector search is still a query.

The detectors take `as_of` and parse it with `strptime`, not `parse`.
`Date.parse("last tuesday")` returns a date rather than raising, so a mistyped
parameter would quietly change the answer.

## Roles

Two Postgres roles. `mars` owns the schema and has `BYPASSRLS`; the eval harness
and migrations use it. `mars_app` is the runtime role, has neither `SUPERUSER`
nor `BYPASSRLS`, and has no grant at all on `ground_truths`. The answer key is
not reachable from a request, by design and by test.

`pg_dump` writes schema, not privileges, so every `GRANT` and `REVOKE` is lost
when a database is rebuilt from `structure.sql`. `bin/rails mars:harden` reapplies
them and is hooked onto `db:migrate` and `db:test:prepare`.

## Running it

```bash
bin/rails db:prepare          # migrate and harden
bin/rails synthetic:seed      # eight companies, EUR 70.0M ARR, planted defects
bin/rails mars:users          # three personas and their tokens. Development only
bin/rails server -p 3000

bundle exec rspec
bundle exec rubocop
bin/rails evals:detectors     # the gate
bin/rails evals:record        # re-record the baseline and the case ledger
```
