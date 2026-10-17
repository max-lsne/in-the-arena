"""Layer 2 of ADR 0003, against payloads the platform actually returned.

The two JSON files in tests/data were captured from a running platform rather
than written by hand, so the shapes the validator indexes are the shapes it will
meet. A validator tested against an imagined payload passes until the first real
one arrives.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from app.artefacts.evidence import EvidenceIndex
from app.artefacts.models import Artefact, Citation, Claim
from app.artefacts.validator import numbers_in, validate

DATA = Path(__file__).parent / "data"
CLAUSE_CITE = "Roomcast master subscription agreement ROO-0025 s.3"


@pytest.fixture
def evidence() -> EvidenceIndex:
    index = EvidenceIndex()
    index.record(json.loads((DATA / "reconciliation_roomcast.json").read_text()))
    index.record(json.loads((DATA / "retrieval_roo_0025.json").read_text()))
    return index


def artefact(*claims: Claim, **kwargs) -> Artefact:
    return Artefact(
        agent="contract_billing",
        company="roomcast",
        title="Contract to billing, Roomcast",
        claims=list(claims),
        **kwargs,
    )


def test_a_well_formed_artefact_passes(evidence) -> None:
    # Every figure is one the platform returned: the shortfall in euros against
    # cents, and the invoice count as given.
    good = artefact(
        Claim(
            text="ROO-0025 is billing €109,792.50 below its contracted amount, across 15 invoices.",
            citations=[
                Citation(kind="finding", ref="ROO-0025"),
                Citation(kind="document", ref=CLAUSE_CITE),
            ],
            figures=[10979250],
        )
    )

    assert validate(good, evidence).ok


def test_a_claim_without_a_citation_fails(evidence) -> None:
    report = validate(
        artefact(Claim(text="Billing looks wrong on this account.")),
        evidence,
    )

    assert [v.rule for v in report.violations] == ["uncited_claim"]


def test_a_citation_to_something_no_tool_returned_fails(evidence) -> None:
    report = validate(
        artefact(
            Claim(
                text="ROO-0099 is under-billed.",
                citations=[Citation(kind="finding", ref="ROO-0099")],
            )
        ),
        evidence,
    )

    assert [v.rule for v in report.violations] == ["unresolvable_citation"]


# The rule that does the most work. The citation is real, the inputs are real,
# and the average is a number no tool ever returned: 10,979,250 cents over 15
# invoices is arithmetic, and arithmetic is not the model's job.
def test_a_figure_the_agent_computed_fails_even_though_its_inputs_are_cited(evidence) -> None:
    report = validate(
        artefact(
            Claim(
                text="That is €7,319.50 of missed billing per invoice.",
                citations=[Citation(kind="finding", ref="ROO-0025")],
            )
        ),
        evidence,
    )

    assert [v.rule for v in report.violations] == ["number_not_in_evidence"]


# The mirror of the rule above, and the reason it is worth stating separately: a
# total the platform computed is evidence like any other figure. The invariant is
# not "no totals", it is "no totals the model worked out".
def test_a_total_the_platform_returned_is_evidence(evidence) -> None:
    report = validate(
        artefact(
            Claim(
                text="Roomcast is short €130,189.98 in total.",
                citations=[Citation(kind="finding", ref="ROO-0025")],
            )
        ),
        evidence,
    )

    assert report.ok, str(report)


def test_a_figure_field_is_checked_as_well_as_the_prose(evidence) -> None:
    report = validate(
        artefact(
            Claim(
                text="The gap is material.",
                citations=[Citation(kind="finding", ref="ROO-0025")],
                figures=[999999],
            )
        ),
        evidence,
    )

    assert [v.rule for v in report.violations] == ["figure_not_in_evidence"]


def test_cents_and_euros_are_the_same_number(evidence) -> None:
    # The platform returns 3006800 cents. An artefact quoting €30,068.00 is
    # quoting the same figure, not computing a new one.
    report = validate(
        artefact(
            Claim(
                text="Invoice ROO-INV-000520 was expected to be €30,068.00.",
                citations=[Citation(kind="finding", ref="ROO-0025")],
            )
        ),
        evidence,
    )

    assert report.ok, str(report)


def test_a_ratio_quoted_as_a_percentage_is_the_same_number() -> None:
    index = EvidenceIndex().record(
        {
            "metrics": [
                {
                    "company": "vaultline",
                    "metric_key": "net_revenue_retention",
                    "period_start": "2026-09-01",
                    "value": "1.028",
                    "unit": "ratio",
                }
            ]
        }
    )

    report = validate(
        Artefact(
            agent="benchmark",
            company="vaultline",
            title="t",
            claims=[
                Claim(
                    text="Net revenue retention is 102.8%.",
                    citations=[
                        Citation(kind="metric", ref="vaultline:net_revenue_retention:2026-09-01")
                    ],
                )
            ],
        ),
        index,
    )

    assert report.ok, str(report)


def test_refusal_beats_invention(evidence) -> None:
    empty = EvidenceIndex().record({"results": []})

    report = validate(
        artefact(Claim(text="There are no problems here.", citations=[])),
        empty,
    )

    assert "unsupported_artefact" in [v.rule for v in report.violations]


def test_a_refusal_with_nothing_retrieved_is_valid() -> None:
    empty = EvidenceIndex().record({"results": []})

    report = validate(
        Artefact(
            agent="churn_brief",
            title="Nothing to report",
            refused=True,
            refusal_reason="retrieval returned no passage about this account",
        ),
        empty,
    )

    assert report.ok, str(report)


def test_an_artefact_cannot_both_refuse_and_assert(evidence) -> None:
    report = validate(
        artefact(
            Claim(text="ROO-0025 is short.", citations=[Citation(kind="finding", ref="ROO-0025")]),
            refused=True,
        ),
        evidence,
    )

    assert "refused_but_claiming" in [v.rule for v in report.violations]


def test_a_company_outside_the_grant_is_named_as_a_violation(evidence) -> None:
    report = validate(artefact(), evidence, granted_companies={"vaultline"})

    assert "company_outside_grant" in [v.rule for v in report.violations]


class TestNumberExtraction:
    """What counts as a number a claim is asserting."""

    @pytest.mark.parametrize(
        ("text", "expected"),
        [
            ("€109,792.50 short", [Decimal("109792.50")]),
            ("uplift of 4.0% missed", [Decimal("4.0")]),
            ("coverage fell to 2.1x", [Decimal("2.1")]),
            ("15 invoices", [Decimal(15)]),
        ],
    )
    def test_reads_a_quantity(self, text, expected) -> None:
        assert numbers_in(text) == expected

    @pytest.mark.parametrize(
        "text",
        [
            "contract ROO-0025 was signed",
            "the period starting 2026-05-01",
            "invoice ROO-INV-000520",
            "clause s.3 of the agreement",
        ],
    )
    def test_ignores_an_identifier(self, text) -> None:
        # These digits mean nothing arithmetically. Demanding evidence for them
        # would make every citation a violation.
        assert numbers_in(text) == []
