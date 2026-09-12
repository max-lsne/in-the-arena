"""The agent loop.

Written against a scripted model rather than a real one, because the properties
worth testing are about the loop's behaviour when the model does something
awkward: calls a tool that does not exist, asks for more turns than it is
allowed, or pauses mid-turn. None of those need a live model to reproduce, and
all of them are how an agent fails in production.
"""

import pytest

from app.agents.runtime import AgentRuntime, AgentSpec, StopReason
from app.tools.registry import ToolContext, ToolRegistry
from pydantic import BaseModel, Field


class LookupParams(BaseModel):
    company: str = Field(description="Company slug")


@pytest.fixture
def registry():
    reg = ToolRegistry()

    @reg.register("lookup", "Look a company up.", LookupParams)
    def lookup(params: LookupParams, ctx: ToolContext) -> dict:
        return {"company": params.company, "arr_cents": 1_200_000_000}

    @reg.register("forbidden", "Not offered to this agent.", LookupParams)
    def forbidden(params: LookupParams, ctx: ToolContext) -> dict:
        return {"secret": True}

    return reg


class ScriptedLlm:
    """Returns prepared responses in order and records what it was sent."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []

    def create(self, **request):
        self.requests.append(request)
        if not self.responses:
            raise AssertionError("the loop asked for more turns than the script provides")
        return self.responses.pop(0)


def text_turn(text):
    return {"stop_reason": "end_turn", "content": [{"type": "text", "text": text}], "usage": {}}


def tool_turn(name, arguments, block_id="tu_1"):
    return {
        "stop_reason": "tool_use",
        "content": [{"type": "tool_use", "id": block_id, "name": name, "input": arguments}],
        "usage": {},
    }


SPEC = AgentSpec(key="test_agent", system="You test things.", tools=["lookup"])


def run(llm, registry, task="do the thing", spec=SPEC):
    return AgentRuntime(llm=llm, registry=registry, ctx=ToolContext()).run(spec=spec, task=task)


def test_a_run_with_no_tool_calls_returns_the_text(registry):
    result = run(ScriptedLlm(text_turn("done")), registry)

    assert result.output == "done"
    assert result.stop_reason is StopReason.COMPLETED
    assert result.tool_calls == 0


def test_a_tool_call_is_executed_and_fed_back(registry):
    llm = ScriptedLlm(tool_turn("lookup", {"company": "vaultline"}), text_turn("Vaultline is EUR 12.0M"))

    result = run(llm, registry)

    assert result.output == "Vaultline is EUR 12.0M"
    assert result.tool_calls == 1
    followup = llm.requests[1]["messages"][-1]
    assert followup["role"] == "user"
    assert followup["content"][0]["type"] == "tool_result"
    assert "1200000000" in str(followup["content"][0]["content"])


def test_parallel_tool_results_go_back_in_one_user_message(registry):
    """Splitting them teaches the model to stop making parallel calls."""
    parallel = {
        "stop_reason": "tool_use",
        "content": [
            {"type": "tool_use", "id": "a", "name": "lookup", "input": {"company": "vaultline"}},
            {"type": "tool_use", "id": "b", "name": "lookup", "input": {"company": "meterpath"}},
        ],
        "usage": {},
    }
    llm = ScriptedLlm(parallel, text_turn("both read"))

    result = run(llm, registry)

    followup = llm.requests[1]["messages"][-1]
    assert len(followup["content"]) == 2
    assert {b["tool_use_id"] for b in followup["content"]} == {"a", "b"}
    assert result.tool_calls == 2


def test_a_tool_error_is_returned_to_the_model_and_the_run_continues(registry):
    llm = ScriptedLlm(tool_turn("lookup", {}), text_turn("I could not read that"))

    result = run(llm, registry)

    block = llm.requests[1]["messages"][-1]["content"][0]
    assert block["is_error"] is True
    assert "company" in str(block["content"])
    assert result.stop_reason is StopReason.COMPLETED


def test_a_tool_the_agent_was_not_given_is_refused(registry):
    """The agent's tool list is the boundary, not the registry's."""
    llm = ScriptedLlm(tool_turn("forbidden", {"company": "vaultline"}), text_turn("ok"))

    run(llm, registry)

    block = llm.requests[1]["messages"][-1]["content"][0]
    assert block["is_error"] is True
    assert "forbidden" in str(block["content"])


def test_only_the_agents_tools_are_offered_to_the_model(registry):
    llm = ScriptedLlm(text_turn("done"))

    run(llm, registry)

    assert [t["name"] for t in llm.requests[0]["tools"]] == ["lookup"]


def test_the_iteration_cap_stops_the_loop_and_says_so(registry):
    spec = AgentSpec(key="loopy", system="s", tools=["lookup"], max_iterations=3)
    llm = ScriptedLlm(*[tool_turn("lookup", {"company": "vaultline"}) for _ in range(3)])

    result = run(llm, registry, spec=spec)

    assert result.stop_reason is StopReason.MAX_ITERATIONS
    assert result.iterations == 3
    assert result.output is None


def test_a_paused_turn_is_resumed_without_running_tools(registry):
    paused = {"stop_reason": "pause_turn", "content": [{"type": "text", "text": "…"}], "usage": {}}
    llm = ScriptedLlm(paused, text_turn("finished"))

    result = run(llm, registry)

    assert result.output == "finished"
    assert result.tool_calls == 0


def test_the_trace_records_every_turn_and_every_tool_call(registry):
    llm = ScriptedLlm(tool_turn("lookup", {"company": "vaultline"}), text_turn("done"))

    result = run(llm, registry)

    assert len(result.trace) == 2
    assert result.trace[0]["stop_reason"] == "tool_use"
    assert result.trace[0]["tool_calls"][0]["name"] == "lookup"
    assert result.trace[0]["tool_calls"][0]["is_error"] is False
    assert result.trace[1]["stop_reason"] == "end_turn"


def test_the_task_is_the_first_user_message(registry):
    llm = ScriptedLlm(text_turn("done"))

    run(llm, registry, task="reconcile MTR-2231")

    assert llm.requests[0]["messages"][0] == {"role": "user", "content": "reconcile MTR-2231"}
    assert llm.requests[0]["system"] == "You test things."


def test_the_model_and_effort_come_from_the_spec(registry):
    spec = AgentSpec(key="a", system="s", tools=["lookup"], effort="low")
    llm = ScriptedLlm(text_turn("done"))

    run(llm, registry, spec=spec)

    assert llm.requests[0]["model"] == AgentRuntime.MODEL
    assert llm.requests[0]["output_config"]["effort"] == "low"
