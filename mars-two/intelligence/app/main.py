"""The intelligence service.

Small on purpose. This process owns retrieval, the agent runtime and the evals;
it owns no data and holds no database credentials, so what it exposes over HTTP
is what it can answer about itself and about the tools it offers.

`/health` answers the question an operator actually has at 7am, which is not "is
the process up" but "would a run work right now": which model mode is configured,
whether the fixtures it would replay are present, and whether the platform it
reads through is reachable. A health check that returns ok while the platform is
down is worse than none, because it moves the search somewhere else.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI

from app.llm.client import LlmMode
from app.tools.catalogue import registry

FIXTURE_DIR = Path(os.environ.get("MARS_FIXTURE_DIR", Path(__file__).parent.parent / "fixtures"))

app = FastAPI(title="mars-two intelligence", version="0.1.0")


def _platform_status(timeout: float = 2.0) -> dict[str, Any]:
    """Reachability, not authorisation.

    `/up` needs no token, so this says whether the platform is answering. Whether
    a given caller may read a given company is Postgres's answer to give, per
    request, and is not something a health check can pre-empt.
    """
    url = os.environ.get("MARS_PLATFORM_URL", "http://localhost:3000").rstrip("/")
    try:
        response = httpx.get(f"{url}/up", timeout=timeout)
    except httpx.HTTPError as exc:
        return {"url": url, "reachable": False, "detail": f"{type(exc).__name__}: {exc}"}

    return {
        "url": url,
        "reachable": response.status_code < 400,
        "detail": f"{response.status_code}",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    mode = os.environ.get("MARS_LLM_MODE", LlmMode.REPLAY.value)
    fixtures = sorted(FIXTURE_DIR.glob("*.json")) if FIXTURE_DIR.exists() else []
    platform = _platform_status()

    # Replay needs fixtures on disk and nothing else. record and live need a key.
    # Saying which of those is missing is the whole value of the endpoint.
    blockers = []
    if not platform["reachable"]:
        blockers.append(f"platform unreachable at {platform['url']}")
    if mode == LlmMode.REPLAY.value and not fixtures:
        blockers.append("no fixtures recorded; a replay run would miss on its first call")
    if mode in (LlmMode.RECORD.value, LlmMode.LIVE.value) and not os.environ.get(
        "ANTHROPIC_API_KEY"
    ):
        blockers.append(f"MARS_LLM_MODE={mode} calls the API and ANTHROPIC_API_KEY is not set")

    return {
        "ok": not blockers,
        "blockers": blockers,
        "llm_mode": mode,
        "fixtures": len(fixtures),
        "fixture_dir": str(FIXTURE_DIR),
        "tools": len(registry.tools()),
        "platform": platform,
    }


@app.get("/v1/tools")
def tools() -> dict[str, Any]:
    """The tool surface, as declared to a model.

    The same list the MCP server advertises and the same list the agent runtime
    sends, because all three read the one registry.
    """
    return {"tools": registry.definitions()}
