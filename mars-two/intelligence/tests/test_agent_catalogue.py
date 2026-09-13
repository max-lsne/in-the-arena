"""Properties of the agent definitions themselves.

A mistyped tool name does not fail at import. It fails halfway through a run,
when the model asks for a tool the runtime then refuses, and the symptom is an
agent that behaves oddly rather than an error anyone can find.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from app.agents.catalogue import ARTEFACT_CONTRACT, BY_KEY
from app.agents.pipeline import run_agent
from app.artefacts.evidence import EvidenceIndex
from app.tools.catalogue import registry

DATA = Path(__file__).parent / "data"


@pytest.mark.parametrize("spec", BY_KEY.values(), ids=list(BY_KEY))
def test_every_tool_an_agent_is_given_exists(spec) -> None:
    known = {definition["name"] for definition in registry.definitions()}

    assert set(spec.tools) <= known, f"{spec.key} names a tool the registry does not have"


@pytest.mark.parametrize("spec", BY_KEY.values(), ids=list(BY_KEY))
def test_every_agent_is_told_the_artefact_shape(spec) -> None:
    # The parse is unforgiving, so an agent that was never told the shape fails
    # every run. Cheaper to assert here than to discover it in a fixture.
    assert ARTEFACT_CONTRACT in spec.system


@pytest.mark.parametrize("spec", BY_KEY.values(), ids=list(BY_KEY))
def test_no_agent_reaches_the_answer_key(spec) -> None:
    assert not [tool for tool in spec.tools if "eval" in tool or "ground_truth" in tool]


class TestDetectorPayloadsAreCitable:
    """Whatever a detector returns, an agent must be able to cite it.

    Captured from a running platform. A payload whose identifiers the evidence
    index does not recognise produces an agent that cannot cite anything, and the
    failure appears as every claim being rejected rather than as a missing key.
    """

    @pytest.mark.parametrize(
        ("fixture", "reference"),
        [
            ("crm_hygiene_roomcast", "ROO-A0005"),
            ("churn_risk_roomcast", "ROO-C0076"),
            ("onboarding_stalls_roomcast", "ROO-C0026"),
        ],
    )
    def test_an_identifier_from_each_detector_resolves(self, fixture, reference) -> None:
        index = EvidenceIndex().record(json.loads((DATA / f"{fixture}.json").read_text()))

        assert index.resolves("finding", reference)

    def test_a_churn_score_is_quotable_and_a_derived_one_is_not(self) -> None:
        index = EvidenceIndex().record(json.loads((DATA / "churn_risk_roomcast.json").read_text()))

        assert index.knows_number(Decimal("0.8482"))
        # The mean of the top three. Nothing returned it, so nothing may state it.
        assert not index.knows_number(Decimal("0.8031"))


def test_the_churn_brief_runs_end_to_end_and_validates() -> None:
    payload = json.loads((DATA / "churn_risk_roomcast.json").read_text())
    top = payload["accounts"][0]

    class Platform:
        def get(self, path, params=None):
            return payload

        def post(self, path, data=None):
            return {"results": []}

    class Model:
        def __init__(self):
            self.replies = [
                {
                    "stop_reason": "tool_use",
                    "content": [
                        {
                            "type": "tool_use",
                            "id": "t1",
                            "name": "churn_risk_ranking",
                            "input": {"company": "roomcast", "as_of": "2026-09-12"},
                        }
                    ],
                },
                {
                    "stop_reason": "end_turn",
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(
                                {
                                    "agent": "churn_brief",
                                    "company": "roomcast",
                                    "title": "Accounts worth a call this week",
                                    "summary": "Three accounts lead the ranking.",
                                    "claims": [
                                        {
                                            "text": (
                                                f"{top['customer_ref']} ranks first at "
                                                f"{top['score']}, on falling usage and "
                                                f"overdue invoices."
                                            ),
                                            "citations": [
                                                {"kind": "finding", "ref": top["customer_ref"]}
                                            ],
                                            "figures": [top["score"]],
                                        }
                                    ],
                                }
                            ),
                        }
                    ],
                },
            ]

        def create(self, **request):
            return self.replies.pop(0)

    outcome = run_agent(
        BY_KEY["churn_brief"],
        "Who is worth a call at Roomcast this week?",
        llm=Model(),
        registry=registry,
        platform=Platform(),
        granted_companies={"roomcast"},
    )

    assert outcome.ok, str(outcome.report)
