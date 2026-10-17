"""The agent loop.

Written by hand rather than delegated to the SDK's tool runner, because every
run has to be reconstructable afterwards: the error analysis surface shows an
agent's inputs, its tool calls, its output and the grader's verdict side by side,
and the runner does not expose the history it keeps. See
docs/adr/0007-agent-loop-and-fixtures.md.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from app.tools.registry import ToolContext, ToolRegistry


class StopReason(StrEnum):
    COMPLETED = "completed"
    MAX_ITERATIONS = "max_iterations"


@dataclass(frozen=True)
class AgentSpec:
    key: str
    system: str
    tools: list[str]
    max_iterations: int = 8
    effort: str = "high"


@dataclass
class AgentResult:
    agent_key: str
    output: str | None
    stop_reason: StopReason
    iterations: int
    tool_calls: int
    messages: list[dict[str, Any]] = field(default_factory=list)
    trace: list[dict[str, Any]] = field(default_factory=list)


class AgentRuntime:
    MODEL = "claude-opus-5"
    MAX_TOKENS = 16000

    def __init__(self, llm: Any, registry: ToolRegistry, ctx: ToolContext) -> None:
        self.llm = llm
        self.registry = registry
        self.ctx = ctx

    def run(self, spec: AgentSpec, task: str) -> AgentResult:
        messages: list[dict[str, Any]] = [{"role": "user", "content": task}]
        trace: list[dict[str, Any]] = []
        tool_calls = 0

        for iteration in range(1, spec.max_iterations + 1):
            response = self.llm.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=spec.system,
                # A snapshot, not the live list. Passing the working list by
                # reference means the request keeps changing after it was sent:
                # anything that records it, a fixture or a trace, ends up
                # describing a later state of the conversation rather than the
                # one the model actually answered.
                messages=list(messages),
                tools=self._tool_definitions(spec),
                # Adaptive rather than a fixed budget: the model decides how much
                # thinking a step needs, and effort sets the overall ceiling.
                thinking={"type": "adaptive"},
                output_config={"effort": spec.effort},
            )

            stop_reason = response.get("stop_reason")
            content = response.get("content", [])

            if stop_reason == "end_turn":
                trace.append(self._trace_entry(iteration, stop_reason, [], response))
                messages.append({"role": "assistant", "content": content})
                return AgentResult(
                    agent_key=spec.key,
                    output=self._text_of(content),
                    stop_reason=StopReason.COMPLETED,
                    iterations=iteration,
                    tool_calls=tool_calls,
                    messages=messages,
                    trace=trace,
                )

            messages.append({"role": "assistant", "content": content})

            # A server-side tool ran out of its own iteration budget mid-turn.
            # Nothing to execute: resending the history resumes it.
            if stop_reason == "pause_turn":
                trace.append(self._trace_entry(iteration, stop_reason, [], response))
                continue

            requested = [b for b in content if b.get("type") == "tool_use"]
            results, called = self._execute(requested, spec)
            tool_calls += called

            trace.append(self._trace_entry(iteration, stop_reason, results, response))

            # Every result in one user message. Splitting them across messages
            # silently teaches the model to stop making parallel calls.
            messages.append({"role": "user", "content": [r["block"] for r in results]})

        return AgentResult(
            agent_key=spec.key,
            output=None,
            stop_reason=StopReason.MAX_ITERATIONS,
            iterations=spec.max_iterations,
            tool_calls=tool_calls,
            messages=messages,
            trace=trace,
        )

    def _tool_definitions(self, spec: AgentSpec) -> list[dict[str, Any]]:
        allowed = set(spec.tools)
        return [d for d in self.registry.definitions() if d["name"] in allowed]

    def _execute(
        self, requested: list[dict[str, Any]], spec: AgentSpec
    ) -> tuple[list[dict[str, Any]], int]:
        allowed = set(spec.tools)
        results = []

        for block in requested:
            name = block.get("name", "")
            arguments = block.get("input") or {}

            # The agent's own list is the boundary, not the registry's. A tool
            # the registry has but this agent was not given is refused here, so
            # widening one agent's reach cannot widen another's by accident.
            if name not in allowed:
                offered = ", ".join(sorted(allowed)) or "none"
                result_content = (
                    f"tool {name!r} is not available to this agent. Available: {offered}"
                )
                is_error = True
            else:
                outcome = self.registry.execute(name, arguments, self.ctx)
                result_content = outcome.content
                is_error = outcome.is_error

            results.append(
                {
                    "name": name,
                    "input": arguments,
                    "is_error": is_error,
                    "block": {
                        "type": "tool_result",
                        "tool_use_id": block.get("id"),
                        "content": self._as_text(result_content),
                        "is_error": is_error,
                    },
                }
            )

        return results, len(results)

    @staticmethod
    def _as_text(content: Any) -> str:
        return content if isinstance(content, str) else json.dumps(content, default=str)

    @staticmethod
    def _text_of(content: list[dict[str, Any]]) -> str | None:
        parts = [b.get("text", "") for b in content if b.get("type") == "text"]
        joined = "\n".join(p for p in parts if p)
        return joined or None

    @staticmethod
    def _trace_entry(
        iteration: int, stop_reason: str | None, results: list[dict[str, Any]], response: dict
    ) -> dict[str, Any]:
        return {
            "iteration": iteration,
            "stop_reason": stop_reason,
            "usage": response.get("usage", {}),
            "tool_calls": [
                {"name": r["name"], "input": r["input"], "is_error": r["is_error"]} for r in results
            ],
        }
