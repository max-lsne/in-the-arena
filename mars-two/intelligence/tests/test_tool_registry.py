"""The tool registry is the boundary between a model's intentions and the system.

Everything a model asks for arrives as untrusted JSON that a language model
produced, sometimes after reading a customer's support ticket. So the properties
here are about what happens when that JSON is wrong, hostile, or names something
that does not exist.

The loop must survive all three. A tool error is a result the model can read and
retry from, not an exception that ends the run.
"""

import pytest
from pydantic import BaseModel, Field

from app.tools.registry import ToolContext, ToolRegistry, UnknownToolError


class EchoParams(BaseModel):
    company: str = Field(description="Company slug")
    limit: int = Field(default=5, ge=1, le=20, description="How many rows")


@pytest.fixture
def registry():
    reg = ToolRegistry()

    @reg.register("echo", "Echo the validated parameters back.", EchoParams)
    def echo(params: EchoParams, ctx: ToolContext) -> dict:
        return {"company": params.company, "limit": params.limit}

    return reg


def test_definitions_are_generated_from_the_model(registry):
    """Hand-written JSON schemas drift from the code that consumes them."""
    definition = registry.definitions()[0]

    assert definition["name"] == "echo"
    assert definition["description"] == "Echo the validated parameters back."
    assert "company" in definition["input_schema"]["properties"]
    assert definition["input_schema"]["required"] == ["company"]


def test_definitions_carry_the_field_descriptions(registry):
    schema = registry.definitions()[0]["input_schema"]
    assert schema["properties"]["company"]["description"] == "Company slug"


def test_valid_arguments_reach_the_handler_typed(registry):
    result = registry.execute("echo", {"company": "vaultline", "limit": 3}, ToolContext())

    assert result.is_error is False
    assert result.content == {"company": "vaultline", "limit": 3}


def test_defaults_are_applied(registry):
    result = registry.execute("echo", {"company": "vaultline"}, ToolContext())
    assert result.content["limit"] == 5


def test_an_unknown_tool_is_an_error_result_not_a_crash(registry):
    """A model that hallucinates a tool name should get told, not end the run."""
    result = registry.execute("no_such_tool", {}, ToolContext())

    assert result.is_error is True
    assert "no_such_tool" in result.content


def test_invalid_arguments_return_a_message_the_model_can_act_on(registry):
    result = registry.execute("echo", {"limit": 3}, ToolContext())

    assert result.is_error is True
    assert "company" in result.content


def test_out_of_range_arguments_are_rejected_before_the_handler_runs(registry):
    """The bound is on the schema, so an oversized limit never reaches a query."""
    result = registry.execute("echo", {"company": "vaultline", "limit": 5000}, ToolContext())

    assert result.is_error is True
    assert "limit" in result.content


def test_unexpected_arguments_are_rejected(registry):
    result = registry.execute("echo", {"company": "vaultline", "drop_table": "users"}, ToolContext())

    assert result.is_error is True


def test_a_handler_that_raises_becomes_an_error_result(registry):
    @registry.register("boom", "Always fails.", EchoParams)
    def boom(params: EchoParams, ctx: ToolContext) -> dict:
        raise RuntimeError("upstream exploded")

    result = registry.execute("boom", {"company": "vaultline"}, ToolContext())

    assert result.is_error is True
    assert "upstream exploded" in result.content


def test_registering_the_same_name_twice_is_refused(registry):
    with pytest.raises(ValueError, match="echo"):

        @registry.register("echo", "A second echo.", EchoParams)
        def echo_again(params: EchoParams, ctx: ToolContext) -> dict:
            return {}


def test_lookup_of_a_missing_tool_raises_for_callers_that_want_it(registry):
    with pytest.raises(UnknownToolError):
        registry.get("nope")


# ADR 0004: an agent that can read the planted answer key scores perfectly and
# tells you nothing. The runtime role has no grant on that table and there is no
# endpoint for it, so this asserts the third layer: nothing in the registry even
# names it.
def test_no_tool_reaches_the_eval_answer_key():
    from app.tools import catalogue

    surface = " ".join(
        [d["name"] + " " + d["description"] + str(d["input_schema"]) for d in catalogue.registry.definitions()]
    ).lower()

    assert "ground_truth" not in surface
    for tool in catalogue.registry.tools():
        assert "ground_truth" not in tool.path.lower(), f"{tool.name} targets the answer key"
