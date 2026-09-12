"""The tool registry, exposed over MCP.

One registry, two transports. The agent runtime calls these tools in process; an
MCP client calls the same objects over stdio. The tool list and the schemas are
generated from `app.tools.registry`, so a tool added for one is available to the
other and the two descriptions cannot drift apart. A second hand-written list
here would be a second thing to keep true.

What this does not do is widen anything. The server holds one platform token and
every call runs with that token's grant, enforced by Postgres. So the unit of
deployment is one server per grant: a group operator's server sees eight
companies because their token does, and a portfolio company's server sees one.
Sharing a group-wide token with a client that answers a portfolio company's
questions would hand it the whole portfolio, and nothing downstream would notice.

There is no tool here that reaches the eval answer key, for the same reason there
is no endpoint: a model that can read the answer key can pass the evals without
doing the work.
"""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

import mcp.types as types
from mcp.server.lowlevel import Server

from app.platform_client import PlatformClient
from app.tools.catalogue import registry as default_registry
from app.tools.registry import ToolContext, ToolRegistry

SERVER_NAME = "mars-two"
SERVER_VERSION = "0.1.0"

INSTRUCTIONS = """Portfolio operations over eight B2B SaaS companies.

Every figure these tools return was computed in SQL and arrives labelled with its
unit and the formula that produced it. Use the figures exactly as given: do not
recompute, convert, total or rank them yourself.

Companies define recurring revenue differently. Adding their ARR together without
saying which definitions were mixed produces a number that means nothing.

When a search returns nothing relevant, say so. Do not answer from memory."""


def _text(payload: Any) -> types.TextContent:
    return types.TextContent(type="text", text=json.dumps(payload, indent=2, default=str))


def build_server(
    registry: ToolRegistry | None = None,
    context: Callable[[], ToolContext] | None = None,
) -> Server:
    """Wire the registry to an MCP server.

    `context` is a callable rather than a value so that the platform client is
    built once per process and can be replaced wholesale in a test without the
    server holding a stale reference to it.
    """
    tools = registry or default_registry
    make_context = context or (lambda: ToolContext(platform=PlatformClient()))

    async def on_list_tools(_ctx: Any, _params: Any) -> types.ListToolsResult:
        return types.ListToolsResult(
            tools=[
                types.Tool(
                    name=definition["name"],
                    description=definition["description"],
                    input_schema=definition["input_schema"],
                )
                for definition in tools.definitions()
            ]
        )

    async def on_call_tool(
        _ctx: Any, params: types.CallToolRequestParams
    ) -> types.CallToolResult:
        # The registry validates before it executes and returns every failure as
        # a result rather than raising. An MCP client is another untrusted
        # caller, so it goes through the same door as the model does.
        result = tools.execute(params.name, dict(params.arguments or {}), make_context())

        if result.is_error:
            return types.CallToolResult(
                content=[types.TextContent(type="text", text=str(result.content))],
                is_error=True,
            )

        return types.CallToolResult(
            content=[_text(result.content)],
            structured_content=result.content if isinstance(result.content, dict) else None,
        )

    return Server(
        SERVER_NAME,
        version=SERVER_VERSION,
        instructions=INSTRUCTIONS,
        on_list_tools=on_list_tools,
        on_call_tool=on_call_tool,
    )


async def serve_stdio() -> None:
    import mcp.server.stdio

    server = build_server()
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main() -> None:
    import anyio

    anyio.run(serve_stdio)


if __name__ == "__main__":
    main()
