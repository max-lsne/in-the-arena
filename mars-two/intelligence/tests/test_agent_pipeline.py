"""The whole path: loop, tools, evidence, parse, validation.

The model is scripted rather than recorded, because no fixtures exist yet and
because what is under test here is everything except the model's judgement: that
tool results reach the evidence index, that a malformed reply is handed back
once, and that an artefact which states a number nobody returned is rejected even
though it is well formed and fully cited.

When a key arrives, the scripted model is replaced by a recorded one and these
same assertions carry over.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from app.agents.catalogue import CONTRACT_BILLING
from app.agents.pipeline import parse_artefact, run_agent
from app.agents.runtime import StopReason
from app.tools.catalogue import registry

DATA = Path(__file__).parent / "data"
CLAUSE_CITE = "Roomcast master subscription agreement ROO-0025 s.3"


class ScriptedModel:
    """Returns the next canned response and records what it was asked."""

    def __init__(self, *responses: dict[str, Any]) -> None:
        self._responses = list(responses)
        self.requests: list[dict[str, Any]] = []

    def create(self, **request: Any) -> dict[str, Any]:
        self.requests.append(request)
        if not self._responses:
            raise AssertionError("the agent made more calls than the script has responses")
        return self._responses.pop(0)


class FakePlatform:
    def __init__(self, reconciliation: dict | None = None, retrieval: dict | None = None) -> None:
        self.reconciliation = (
            reconciliation
            if reconciliation is not None
            else json.loads((DATA / "reconciliation_roomcast.json").read_text())
        )
        self.retrieval = (
            retrieval
            if retrieval is not None
            else json.loads((DATA / "retrieval_roo_0025.json").read_text())
        )
        self.paths: list[str] = []

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        self.paths.append(path)
        return self.reconciliation

    def post(self, path: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        self.paths.append(path)
        return self.retrieval


def uses(tool: str, arguments: dict[str, Any], block_id: str = "t1") -> dict[str, Any]:
    return {
        "stop_reason": "tool_use",
        "content": [{"type": "tool_use", "id": block_id, "name": tool, "input": arguments}],
        "usage": {"input_tokens": 10, "output_tokens": 5},
    }


def says(text: str) -> dict[str, Any]:
    return {
        "stop_reason": "end_turn",
        "content": [{"type": "text", "text": text}],
        "usage": {"input_tokens": 10, "output_tokens": 5},
    }


GOOD_ARTEFACT = json.dumps(
    {
        "agent": "contract_billing",
        "company": "roomcast",
        "title": "Contract to billing, Roomcast",
        "summary": "One contract is billing below its committed user terms.",
        "claims": [
            {
                "text": (
                    "ROO-0025 is billing €109,792.50 below its contracted amount "
                    "across 15 invoices, because the committed user count was exceeded "
                    "and the excess was never invoiced."
                ),
                "citations": [
                    {"kind": "finding", "ref": "ROO-0025"},
                    {"kind": "document", "ref": CLAUSE_CITE},
                ],
                "figures": [10979250],
            }
        ],
    }
)


# The same artefact without the clause citation, for scripts that never call
# search_documents. Citing a document no tool returned is itself a violation, and
# a test that tripped it would be testing the wrong rule.
FINDING_ONLY = json.dumps(
    {
        **json.loads(GOOD_ARTEFACT),
        "claims": [
            {
                **json.loads(GOOD_ARTEFACT)["claims"][0],
                "citations": [{"kind": "finding", "ref": "ROO-0025"}],
            }
        ],
    }
)


def run(*responses: dict[str, Any], platform: FakePlatform | None = None, **kwargs):
    model = ScriptedModel(*responses)
    used = platform or FakePlatform()
    outcome = run_agent(
        CONTRACT_BILLING,
        "Reconcile Roomcast's contracts against what was invoiced.",
        llm=model,
        registry=registry,
        platform=used,
        **kwargs,
    )
    return outcome, model, used


def test_a_complete_run_produces_a_valid_artefact() -> None:
    outcome, _, platform = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        uses("search_documents", {"query": "committed users", "source_ref": "ROO-0025"}, "t2"),
        says(GOOD_ARTEFACT),
    )

    assert outcome.ok, str(outcome.report)
    assert outcome.result.stop_reason is StopReason.COMPLETED
    assert platform.paths == [
        "/api/v1/reconciliation/contract_billing",
        "/api/v1/retrieval/search",
    ]


def test_tool_results_reach_the_evidence_index() -> None:
    outcome, _, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says(FINDING_ONLY),
    )

    assert "ROO-0025" in outcome.evidence.findings
    assert outcome.evidence.knows_number(Decimal(10979250))
    # In euros as well, which is how an artefact would state it.
    assert outcome.evidence.knows_number(Decimal("109792.50"))


# Well formed, fully cited, and wrong. The figure is the agent's own arithmetic,
# and nothing about the shape of the reply says so.
def test_an_invented_figure_is_rejected_even_though_the_artefact_is_well_formed() -> None:
    invented = json.loads(FINDING_ONLY)
    invented["claims"][0]["text"] = "ROO-0025 is short €7,319.50 per invoice."
    invented["claims"][0]["figures"] = []

    outcome, _, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says(json.dumps(invented)),
    )

    assert not outcome.ok
    assert [v.rule for v in outcome.report.violations] == ["number_not_in_evidence"]


def test_a_claim_citing_a_contract_no_tool_returned_is_rejected() -> None:
    wrong = json.loads(FINDING_ONLY)
    wrong["claims"][0]["citations"] = [{"kind": "finding", "ref": "VAU-0001"}]

    outcome, _, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says(json.dumps(wrong)),
    )

    assert not outcome.ok
    assert "unresolvable_citation" in [v.rule for v in outcome.report.violations]


def test_a_malformed_reply_is_handed_back_once_and_then_accepted() -> None:
    outcome, model, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says("Here you go:\n```json\n{not json at all}\n```"),
        uses("contract_billing_reconciliation", {"company": "roomcast"}, "t3"),
        says(FINDING_ONLY),
    )

    assert outcome.ok, str(outcome.report)
    assert len(outcome.parse_errors) == 1
    # The retry says what was wrong with the last reply, rather than repeating
    # the task and hoping.
    assert "not valid JSON" in model.requests[-1]["messages"][0]["content"]


def test_a_fenced_json_object_is_accepted_rather_than_treated_as_a_failure() -> None:
    outcome, _, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says(f"```json\n{FINDING_ONLY}\n```"),
    )

    assert outcome.ok, str(outcome.report)
    assert outcome.parse_errors == []


def test_a_tool_outside_the_agents_list_is_refused_and_the_run_continues() -> None:
    outcome, _, platform = run(
        uses("company_metrics", {"company": "roomcast"}),
        uses("contract_billing_reconciliation", {"company": "roomcast"}, "t2"),
        says(FINDING_ONLY),
    )

    assert outcome.ok, str(outcome.report)
    # The refused call never reached the platform.
    assert platform.paths == ["/api/v1/reconciliation/contract_billing"]
    refused = outcome.result.trace[0]["tool_calls"][0]
    assert refused["name"] == "company_metrics"
    assert refused["is_error"]


def test_refusal_beats_invention_when_nothing_comes_back() -> None:
    empty = FakePlatform(
        reconciliation={"findings": [], "total_findings": 0, "total_shortfall_cents": 0},
        retrieval={"results": []},
    )
    refusal = json.dumps(
        {
            "agent": "contract_billing",
            "company": "roomcast",
            "title": "Nothing to correct",
            "refused": True,
            "refusal_reason": "no contract disagrees with its invoices",
            "claims": [],
        }
    )

    outcome, _, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says(refusal),
        platform=empty,
    )

    assert outcome.ok, str(outcome.report)
    assert outcome.artefact is not None and outcome.artefact.refused


def test_a_company_outside_the_grant_fails_validation() -> None:
    outcome, _, _ = run(
        uses("contract_billing_reconciliation", {"company": "roomcast"}),
        says(FINDING_ONLY),
        granted_companies={"vaultline"},
    )

    assert not outcome.ok
    assert "company_outside_grant" in [v.rule for v in outcome.report.violations]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        (None, "no text"),
        ("", "no text"),
        ("just a sentence", "not valid JSON"),
        ("[1, 2, 3]", "expected a JSON object"),
        ('{"title": "t"}', "did not match the artefact shape"),
    ],
)
def test_parse_says_what_was_wrong(text, expected) -> None:
    artefact, problem = parse_artefact(text)

    assert artefact is None
    assert expected in problem
