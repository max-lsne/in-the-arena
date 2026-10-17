"""Everything the platform said during a run, indexed for checking.

The agent's figures have to come from somewhere, and the only somewhere allowed
is a tool result. So every result is walked as it arrives and two things are
kept: the identifiers that can legitimately be cited, and every number the
platform actually returned.

Nothing here interprets a result. It does not know what a shortfall is. It knows
that 4120000 was a number the platform said, and that is the whole question a
validator needs answered.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

# Keys whose values are numbers a claim may quote. Everything numeric is
# collected anyway; this list exists so a reader can see what the common ones
# are, not to restrict them.
COUNTABLE_KEYS = ("findings", "results", "metrics", "companies", "initiatives")


def _as_decimal(value: Any) -> Decimal | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return Decimal(str(value))
    if isinstance(value, str):
        text = value.strip()
        # A metric value arrives as a string so a float cannot round it. A date
        # is also a string, and "2026-09-01" must not become a number.
        try:
            return Decimal(text)
        except (InvalidOperation, ValueError):
            return None
    return None


class EvidenceIndex:
    """Citable identifiers and quotable numbers, gathered from tool results."""

    def __init__(self) -> None:
        self.metrics: set[str] = set()
        self.findings: set[str] = set()
        self.documents: set[str] = set()
        self.companies: set[str] = set()
        self.numbers: set[Decimal] = set()
        self.results: int = 0

    @property
    def is_empty(self) -> bool:
        """Nothing was retrieved, so nothing can be asserted."""
        return not (self.metrics or self.findings or self.documents)

    def record(self, payload: Any) -> EvidenceIndex:
        self.results += 1
        self._walk(payload)
        return self

    def _walk(self, node: Any) -> None:
        if isinstance(node, dict):
            self._index_dict(node)
            for value in node.values():
                self._walk(value)
        elif isinstance(node, list):
            # The length of a returned collection is a number an agent may
            # legitimately state: "four contracts are billing below their terms".
            self.numbers.add(Decimal(len(node)))
            for item in node:
                self._walk(item)
        else:
            number = _as_decimal(node)
            if number is not None:
                self.numbers.add(number)

    def _index_dict(self, node: dict[str, Any]) -> None:
        company = node.get("company")
        if isinstance(company, str):
            self.companies.add(company)

        if isinstance(node.get("metric_key"), str):
            key = node["metric_key"]
            period = node.get("period_start", "")
            self.metrics.add(f"{company}:{key}:{period}" if company else key)
            self.metrics.add(key)

        # Every identifier a detector hands back is citable: a contract, a CRM
        # record, a customer. They share one set, so a citation of kind "finding"
        # resolves against all of them. That is deliberate and it is also the
        # limit of this check: it separates a finding from a metric and from a
        # document, not one finding from another. Whether the cited record is the
        # one the claim is about is Layer 1's question, against the answer key.
        for key in ("contract_reference", "reference", "customer_ref", "external_ref"):
            value = node.get(key)
            if isinstance(value, str):
                self.findings.add(value)

        if isinstance(node.get("cite"), str):
            self.documents.add(node["cite"])
        if isinstance(node.get("source_ref"), str):
            self.documents.add(node["source_ref"])

        if isinstance(node.get("slug"), str):
            self.companies.add(node["slug"])

    def resolves(self, kind: str, ref: str) -> bool:
        index = {"metric": self.metrics, "finding": self.findings, "document": self.documents}
        return ref in index.get(kind, set())

    def knows_number(self, value: Decimal, tolerance: Decimal = Decimal("0.000001")) -> bool:
        """Is this a number the platform returned, in some unit it returned it in?

        Three transforms, applied to the claim's number rather than to the
        evidence: as written, times a hundred, divided by a hundred. That covers
        euros quoted against cents and a percentage quoted against a ratio, which
        are the two conversions a display does legitimately. It does not cover
        addition, which is the point: a total that no tool returned is a total
        the agent computed.
        """
        # The tolerance is relative and tiny: enough to absorb a float that came
        # back through JSON, not enough to let a different figure match. A
        # thousandth here sounds harmless and is not: a thousandth of a shortfall
        # in cents is twelve euros, which is a different answer.
        for candidate in (value, value * 100, value / 100):
            for known in self.numbers:
                if known == candidate:
                    return True
                if abs(known - candidate) <= tolerance * max(abs(known), Decimal(1)):
                    return True
        return False
