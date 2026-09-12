# intelligence

Retrieval, tools, agents and evals over the mars-two platform. Python, FastAPI.

Skills Map: **Building and deploying AI applications**, all six sub-skills, and
the evaluation-driven development one in particular.

## Tradeoff taken

No database credentials. This service reads through `platform`'s HTTP API, so an
agent's effective permissions are its caller's permissions, enforced one layer
below anything a model can influence. An agent that is prompt-injected into
asking for another company's data gets a 404 from Postgres, not a result set.

The cost is that every fact an agent needs must exist as an endpoint before the
agent can use it. That is slower than reaching into the database and is the
point: the only things reachable are the things `platform` chose to compute and
expose, which is what makes "models never do arithmetic" structural rather than
aspirational.

## The three LLM modes

```bash
MARS_LLM_MODE=replay   # default: recorded fixtures, no key, no network
MARS_LLM_MODE=record   # calls the API and writes fixtures. Needs a key
MARS_LLM_MODE=live     # calls the API, writes nothing. For exploration
```

Replay never falls through to a live call. A fixture miss raises and names the
missing key. A client that quietly fell back would pass on a developer's machine,
fail in CI, and bill someone for a test run.

Fixtures are content-addressed: the key is a hash of the whole request, so a
changed prompt, model or tool surface misses rather than silently reusing the
previous answer. Re-record with `make fixtures` from the repo root.

They are committed, and they are review artefacts. The diff when a prompt changes
shows exactly how the model's answer changed.

## Layout

| Path | What lives there |
| --- | --- |
| `app/llm/` | The three-mode client and the fixture store |
| `app/tools/` | The validated tool registry |
| `app/agents/` | The agent runtime |
| `app/evals/` | The three-layer eval harness |
| `fixtures/` | Recorded model responses, committed |

## Running it

```bash
uv sync
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
uv run uvicorn app.main:app --reload --port 8000
```
