from __future__ import annotations

from collections.abc import AsyncGenerator

import httpx
import pytest

from app import main
from app.tools.catalogue import registry


# Driven through ASGI rather than through starlette's TestClient: the suite runs
# with warnings as errors, and TestClient's threading portal emits a deprecation
# on import. This also keeps the request on the real HTTP path.
@pytest.fixture
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://intelligence") as http:
        yield http


async def test_health_reports_ok_when_a_run_would_work(client, monkeypatch, tmp_path) -> None:
    (tmp_path / "abc.json").write_text("{}")
    monkeypatch.setattr(main, "FIXTURE_DIR", tmp_path)
    monkeypatch.setattr(main, "_platform_status", lambda: {"url": "x", "reachable": True})
    monkeypatch.setenv("MARS_LLM_MODE", "replay")

    body = (await client.get("/health")).json()

    assert body["ok"] is True
    assert body["blockers"] == []
    assert body["fixtures"] == 1


# A health check that returns ok while the platform is down moves the search
# somewhere else, which costs more than having no health check at all.
async def test_health_is_not_ok_when_the_platform_is_unreachable(
    client, monkeypatch, tmp_path
) -> None:
    (tmp_path / "abc.json").write_text("{}")
    monkeypatch.setattr(main, "FIXTURE_DIR", tmp_path)
    monkeypatch.setattr(
        main, "_platform_status", lambda: {"url": "http://localhost:3000", "reachable": False}
    )

    body = (await client.get("/health")).json()

    assert body["ok"] is False
    assert any("unreachable" in blocker for blocker in body["blockers"])


async def test_health_names_the_missing_key_rather_than_the_mode(
    client, monkeypatch, tmp_path
) -> None:
    monkeypatch.setattr(main, "FIXTURE_DIR", tmp_path)
    monkeypatch.setattr(main, "_platform_status", lambda: {"url": "x", "reachable": True})
    monkeypatch.setenv("MARS_LLM_MODE", "record")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    body = (await client.get("/health")).json()

    assert body["ok"] is False
    assert any("ANTHROPIC_API_KEY" in blocker for blocker in body["blockers"])


async def test_replay_with_no_fixtures_is_a_blocker(client, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(main, "FIXTURE_DIR", tmp_path)
    monkeypatch.setattr(main, "_platform_status", lambda: {"url": "x", "reachable": True})
    monkeypatch.setenv("MARS_LLM_MODE", "replay")

    body = (await client.get("/health")).json()

    assert body["ok"] is False
    assert any("fixtures" in blocker for blocker in body["blockers"])


def test_platform_status_reports_the_failure_rather_than_raising(monkeypatch) -> None:
    def explode(*_args, **_kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx, "get", explode)

    status = main._platform_status()

    assert status["reachable"] is False
    assert "ConnectError" in status["detail"]


async def test_tools_endpoint_serves_the_one_registry(client) -> None:
    body = (await client.get("/v1/tools")).json()

    assert [tool["name"] for tool in body["tools"]] == [
        definition["name"] for definition in registry.definitions()
    ]
