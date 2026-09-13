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

## Structural validation

`app/artefacts/` is Layer 2 of ADR 0003: the properties an artefact must have
whatever it says. A prompt that asks for citations is not a citation system. An
artefact that cannot produce its evidence fails here and is not shown.

The rule that does the most work is the last one. Every number in a claim's prose
has to be a number the platform returned, in a unit it returned it in: as
written, times a hundred, or divided by a hundred, which covers euros quoted
against cents and a percentage quoted against a ratio. It does not cover
addition. An agent that sums two cited figures and states the total produces a
number no tool ever said, and it fails even though both inputs are cited.

The mirror of that is worth stating: a total the platform computed is evidence
like any other figure. The invariant is not "no totals", it is "no totals the
model worked out".

The tests run against payloads captured from a running platform rather than
written by hand, because a validator tested against an imagined payload passes
until the first real one arrives.

## The MCP surface

`app/mcp_server.py` exposes the same registry over MCP, so an MCP client calls the
objects the agent runtime calls in process. The tool list and the schemas are
generated from the registry: a tool added for one is available to the other, and
the two descriptions cannot drift apart.

The server holds one platform token and every call runs with that token's grant.
So the unit of deployment is one server per grant. A group operator's server sees
eight companies because their token does; a portfolio company's server sees one.
Handing a group-wide token to a client that answers a portfolio company's
questions would give it the whole portfolio, and nothing downstream would notice.

```jsonc
// claude_desktop_config.json
{
  "mcpServers": {
    "mars-two": {
      "command": "uv",
      "args": ["--directory", "/path/to/mars-two/intelligence", "run", "mars-two-mcp"],
      "env": {
        "MARS_PLATFORM_URL": "http://localhost:3000",
        "MARS_PLATFORM_TOKEN": "mars_..."
      }
    }
  }
}
```

The tests drive it through the SDK's own client over memory streams rather than
calling the handlers, because what matters is the protocol: that a client which
knows nothing about this code can list the tools, call one, and be told what went
wrong without the connection dying.

## Layout

| Path | What lives there |
| --- | --- |
| `app/llm/` | The three-mode client and the fixture store |
| `app/tools/` | The validated tool registry |
| `app/agents/` | The agent runtime |
| `app/artefacts/` | Structural validation of what an agent hands back |
| `app/mcp_server.py` | The same registry, over MCP |
| `app/evals/` | The three-layer eval harness |
| `fixtures/` | Recorded model responses, committed |

## Running it

```bash
uv sync
uv run pytest -q
uv run ruff check . && uv run ruff format --check .
uv run uvicorn app.main:app --reload --port 8000
uv run mars-two-mcp   # the MCP server, over stdio
```
