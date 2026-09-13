# Working in this repo

mars-two reconstructs an AI operating system over eight synthetic B2B SaaS portfolio
companies. Read `README.md` first for what it is, then `docs/adr/` for why it is
shaped this way.

## Commands

```bash
make setup            # deps, databases, migrations, seed
make test             # every suite: rspec, pytest, vitest, tsc, lint
make evals            # score the model-free detectors, refresh the case ledger
make dev              # all three services
make fixtures         # re-record LLM fixtures (requires ANTHROPIC_API_KEY, lands with the agents)

cd platform    && bundle exec rspec spec/path_spec.rb     # one Ruby spec
cd intelligence && uv run pytest tests/path_test.py -k name  # one Python test
```

Postgres runs locally on 5432 as role `mars`. Databases are `mars_two_development`
and `mars_two_test`.

## Architecture in one paragraph

`platform` is a Rails 8 API that owns Postgres, the tenant boundary, and every
computed number. `intelligence` is a Python FastAPI service that owns retrieval, the
agent runtime and the evals; it reads through `platform`'s API rather than touching
the database directly, so the tenant boundary is enforced in exactly one place. `web`
is React and TypeScript. See `docs/adr/0001-stack-split.md`.

## Invariants

These are not style preferences. Breaking one is a bug, and each has a test that
fails when it is broken.

**Models never do arithmetic.** Every figure that reaches an agent was computed in SQL
by `platform` and arrives as a labelled value. If an agent needs a sum, a ratio, a
growth rate or a rank, add a rollup to `platform` and a tool that returns it. Never
hand a model raw rows and ask for a total.

**Must-happen behaviour lives in code, not in prompts.** If correctness depends on a
model choosing to do something every single time, it will fail intermittently.
Pre-retrieve, pre-compute, and post-process instead. A prompt that says "always cite
your source" is not a citation system; a post-processor that rejects an artefact with
an uncited claim is.

**Tools are named, and their parameters are validated before execution.** Every tool
is declared in `intelligence/app/tools/registry.py` with a Pydantic schema. Unvalidated
arguments never reach a query.

**Every agent artefact carries its evidence.** Each claim links to the record, metric
or document chunk it came from. An artefact that cannot produce its evidence fails
validation and is not shown.

**Refusal beats invention.** When retrieval returns nothing relevant, the agent says
so. There is an eval case for this on every agent.

**Tenant isolation is enforced by Postgres, not by application code.** Row-level
security policies are the boundary. Application-level scoping is defence in depth, not
the mechanism. See `docs/adr/0002-tenancy-and-isolation.md`.

## Conventions

Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`).

Specs and failing tests are committed before the implementation that satisfies them,
so the history shows the loop rather than only the result. This is deliberate; do not
squash them together.

Any decision with a real alternative gets an ADR in `docs/adr/`, numbered, with the
alternatives and why they lost. Decisions without a real alternative do not.

Every module directory has a README naming the tradeoff it took and the Skills Map
skill it exercises.

Ruby is formatted by RuboCop, Python by Ruff, TypeScript by Prettier and ESLint. CI
runs all of them plus the eval suite, and the eval suite failing fails the build.

## Testing

Ruby uses RSpec. Python uses pytest. TypeScript uses Vitest.

LLM calls in tests replay recorded fixtures from `intelligence/fixtures/`. Tests must
pass with no API key and no network. A test that needs a live model is wrong; record a
fixture instead.

Evals are not tests of phrasing. Assert properties: did it find the planted defect,
does the stated figure match the SQL answer, is every claim cited, did it refuse when
it should have. Never assert on exact wording.

## What this repo is teaching

`docs/skills-map.md` maps each module to a skill. When adding a module, add its row.
