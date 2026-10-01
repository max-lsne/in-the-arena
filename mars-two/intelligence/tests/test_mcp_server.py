"""The MCP surface, exercised through a real client session.

Calling the handlers directly would test the functions. What matters is the
protocol: that a client which knows nothing about this code can list the tools,
call one, and be told what went wrong without the connection dying. So these run
over memory streams with the SDK's own client on the other end.
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import anyio
import pytest
from mcp import ClientSession
from mcp.shared.memory import create_client_server_memory_streams

from app.mcp_server import build_server
from app.tools.catalogue import registry
from app.tools.registry import ToolContext


class FakePlatform:
    """Stands in for the Rails API. Records what was asked of it."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self.calls.append(("GET", path, params or {}))
        return {"companies": [{"slug": "vaultline", "arr_definition": "contracted_arr"}]}

    def post(self, path: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        self.calls.append(("POST", path, data or {}))
        return {"results": []}


@asynccontextmanager
async def connected(platform: FakePlatform) -> AsyncGenerator[ClientSession, None]:
    server = build_server(context=lambda: ToolContext(platform=platform))

    async with create_client_server_memory_streams() as (client_streams, server_streams):
        client_read, client_write = client_streams
        server_read, server_write = server_streams

        async with anyio.create_task_group() as tg:
            tg.start_soon(
                lambda: server.run(
                    server_read,
                    server_write,
                    server.create_initialization_options(),
                    raise_exceptions=True,
                )
            )

            async with ClientSession(client_read, client_write) as session:
                await session.initialize()
                yield session

            tg.cancel_scope.cancel()


async def test_advertises_exactly_the_registry() -> None:
    # One registry, two transports. A second hand-written list here is a second
    # thing to keep true, and it would drift the first time a tool changed.
    async with connected(FakePlatform()) as session:
        listed = await session.list_tools()

    assert sorted(tool.name for tool in listed.tools) == sorted(
        definition["name"] for definition in registry.definitions()
    )


async def test_carries_the_schema_the_registry_declares() -> None:
    async with connected(FakePlatform()) as session:
        listed = await session.list_tools()

    by_name = {tool.name: tool for tool in listed.tools}
    metrics = by_name["company_metrics"]

    assert metrics.input_schema["additionalProperties"] is False
    assert "keys" in metrics.input_schema["properties"]
    assert metrics.description


async def test_calls_the_platform_with_the_callers_arguments() -> None:
    platform = FakePlatform()

    async with connected(platform) as session:
        result = await session.call_tool("company_metrics", {"company": "vaultline", "limit": 3})

    assert result.is_error is not True
    assert platform.calls[0][1] == "/api/v1/metrics"
    assert platform.calls[0][2]["company"] == "vaultline"
    assert json.loads(result.content[0].text)


async def test_an_unknown_tool_is_an_error_result_not_a_dropped_connection() -> None:
    # A client that guesses a tool name should be told, and should still be able
    # to make the next call. Raising would end the session instead.
    async with connected(FakePlatform()) as session:
        result = await session.call_tool("summarise_everything", {})
        assert result.is_error
        assert "unknown tool" in result.content[0].text

        after = await session.call_tool("list_companies", {})
        assert after.is_error is not True


async def test_an_invalid_argument_names_the_parameter() -> None:
    async with connected(FakePlatform()) as session:
        result = await session.call_tool("company_metrics", {"limit": 9_000})

    assert result.is_error
    assert "limit" in result.content[0].text


async def test_an_invented_parameter_is_refused_rather_than_ignored() -> None:
    async with connected(FakePlatform()) as session:
        result = await session.call_tool("list_companies", {"include_answer_key": True})

    assert result.is_error
    assert "include_answer_key" in result.content[0].text


@pytest.mark.parametrize("forbidden", ["ground_truth", "eval", "sql", "query"])
async def test_exposes_no_tool_that_reaches_the_answer_key(forbidden: str) -> None:
    """The third lock on the same door.

    The answer key is revoked from the runtime role and has no endpoint. This
    asserts the MCP surface adds neither a general query tool nor anything named
    for the answer key, because an agent that can read the key passes the evals
    without doing the work.
    """
    async with connected(FakePlatform()) as session:
        listed = await session.list_tools()

    assert not [tool for tool in listed.tools if forbidden in tool.name]
