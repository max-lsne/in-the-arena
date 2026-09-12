# API v1

The surface `intelligence` and `web` read through. `platform` holds the database
credentials; nothing else does.

Skills Map: **Software engineering fundamentals** (security and privacy, API
design) and **Building and deploying AI applications** (grounding models with
data, operating in production).

## Tradeoff taken

Every piece of data an agent needs must exist as an endpoint before an agent can
use it. Reaching into the database directly would be faster to write, and is the
thing this design refuses.

The cost is real: adding a metric is a schema change, a rollup and an endpoint,
not a prompt edit. The benefit is that an agent's reachable surface is exactly
what `platform` chose to expose, so "models never do arithmetic" holds because
raw rows are not on offer, rather than because a prompt asked nicely.

## How tenancy works here

`BaseController` authenticates the bearer token, reads the user's grants, and
sets `mars.company_ids` on the Postgres session for the duration of the request.
Below that line, controllers query normally and the database filters them.

`Mars::Tenancy.with` restores the previous value in an `ensure`, so a pooled
connection is never handed on carrying a request's grant, including when the
action raises. Two request specs assert this, one on the success path and one on
the failure path, because a leak here is a cross-tenant read with no attacker
involved.

A company outside the caller's grant returns 404 rather than 403. The caller does
not learn whether it exists.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/companies` | Every company the grant covers, with each one's own ARR definition |
| GET | `/api/v1/companies/:slug` | 404 outside the grant |
| GET | `/api/v1/metrics` | Filter by `company`, `keys`, `grain`, `from`. Capped at 500 |
| POST | `/api/v1/retrieval/search` | `query` required; `source_ref` scopes to one document; limit capped at 20 |

## Why metric responses look the way they do

```json
{
  "metric_key": "arr_cents",
  "value": "1097197248.0",
  "unit": "eur_cents",
  "formula": "sum(subscriptions.mrr_cents active at period_end) * 12",
  "input_count": 92
}
```

The unit is there because `1097197248` alone leaves a model to infer euros,
cents or something else, and a model that infers will occasionally infer wrong
inside a sentence that reads perfectly. The formula and input count are there so
an artefact can show its working, and so a grader can check a stated figure
against its source rather than against a model's recollection of it.

A metric with no computed value returns an empty set rather than a zero. Absence
has to stay distinguishable from measurement, or an agent reports a median of
zero days as time to value.

## Retrieval takes two steps

Every uplift clause in a contract corpus is worded identically, so similarity
cannot say which contract is in breach. It ranks near-identical clauses in
essentially arbitrary order.

So the caller identifies the contract from precomputed figures, then passes
`source_ref` to find the clause inside that contract. The first step is SQL, the
second is retrieval, and neither does the other's job.

## Development

```bash
bin/rails synthetic:seed     # portfolio and documents
bin/rails metrics:rollup     # monthly figures
bin/rails mars:users         # three personas, prints their tokens
bin/rails server
```

`mars:users` refuses to run outside development.
