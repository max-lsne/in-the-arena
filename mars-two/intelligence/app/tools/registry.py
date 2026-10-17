"""The boundary between a model's intentions and the system.

Everything crossing it is untrusted JSON that a language model produced, in some
cases after reading a customer's support ticket. So nothing reaches a handler
before it has been validated against a declared schema, and every failure becomes
a result the model can read and retry from rather than an exception that ends the
run.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, ValidationError


class UnknownToolError(KeyError):
    """No tool is registered under that name."""


@dataclass(frozen=True)
class ToolResult:
    content: Any
    is_error: bool = False


@dataclass(frozen=True)
class ToolContext:
    """What a tool is allowed to reach.

    The platform client carries the caller's token, so a tool's effective
    permissions are the caller's permissions, enforced by Postgres one layer
    below anything a model can influence.
    """

    platform: Any | None = None


@dataclass(frozen=True)
class RegisteredTool:
    name: str
    description: str
    params: type[BaseModel]
    handler: Callable[..., Any]
    path: str = ""

    def definition(self) -> dict[str, Any]:
        schema = self.params.model_json_schema()
        schema.pop("title", None)
        for prop in schema.get("properties", {}).values():
            prop.pop("title", None)
        # Declared to the model as well as enforced below, so a model that would
        # have invented a parameter is told the shape up front.
        schema["additionalProperties"] = False
        schema.setdefault("required", [])
        return {"name": self.name, "description": self.description, "input_schema": schema}


@dataclass
class ToolRegistry:
    _tools: dict[str, RegisteredTool] = field(default_factory=dict)

    def register(
        self,
        name: str,
        description: str,
        params: type[BaseModel],
        path: str = "",
    ) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        if name in self._tools:
            raise ValueError(f"a tool named {name!r} is already registered")

        def decorate(handler: Callable[..., Any]) -> Callable[..., Any]:
            self._tools[name] = RegisteredTool(
                name=name, description=description, params=params, handler=handler, path=path
            )
            return handler

        return decorate

    def tools(self) -> list[RegisteredTool]:
        return list(self._tools.values())

    def get(self, name: str) -> RegisteredTool:
        try:
            return self._tools[name]
        except KeyError as exc:
            raise UnknownToolError(name) from exc

    def definitions(self) -> list[dict[str, Any]]:
        return [tool.definition() for tool in self._tools.values()]

    def execute(self, name: str, arguments: dict[str, Any], ctx: ToolContext) -> ToolResult:
        """Validate, then run. Never the other way round.

        Every failure path returns rather than raises. A model that hallucinates
        a tool name, omits a required field or invents a parameter should be told
        what went wrong and given the chance to correct it; ending the run
        instead turns a recoverable mistake into a failed task.
        """
        try:
            tool = self.get(name)
        except UnknownToolError:
            known = ", ".join(sorted(self._tools)) or "none"
            return ToolResult(f"unknown tool {name!r}. Available tools: {known}", is_error=True)

        unexpected = set(arguments) - set(tool.params.model_fields)
        if unexpected:
            allowed = ", ".join(sorted(tool.params.model_fields))
            return ToolResult(
                f"unexpected parameters for {name}: {', '.join(sorted(unexpected))}. "
                f"Accepted parameters: {allowed}",
                is_error=True,
            )

        try:
            validated = tool.params.model_validate(arguments)
        except ValidationError as exc:
            problems = "; ".join(
                f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()
            )
            return ToolResult(f"invalid parameters for {name}: {problems}", is_error=True)

        try:
            return ToolResult(tool.handler(validated, ctx))
        # Broad on purpose: a tool failure is a result the model can read and
        # retry from, not a crash that ends the run.
        except Exception as exc:
            return ToolResult(f"{name} failed: {exc}", is_error=True)
