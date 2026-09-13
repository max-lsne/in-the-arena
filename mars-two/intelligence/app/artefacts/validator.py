"""Layer 2 of ADR 0003: properties that must hold whatever the artefact says.

A prompt that says "always cite your source" is not a citation system. This is:
an artefact that cannot produce its evidence fails here and is not shown. The
rules are about shape, they need no model, and they run in milliseconds.

The rule that does the most work is the last one. Every number in a claim's prose
has to be a number the platform returned, in a unit it returned it in. An agent
that adds two figures together and states the total produces a number no tool
ever said, and it fails here even though both inputs were cited. That is the
"models never do arithmetic" invariant, enforced at the boundary rather than
requested in a prompt.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from app.artefacts.evidence import EvidenceIndex
from app.artefacts.models import Artefact, Claim

# A number that is not glued to a letter, a hyphen or a slash. That exclusion is
# what keeps contract references (ROO-0025), ISO dates (2026-09-01) and version
# strings out: those are identifiers whose digits mean nothing arithmetically.
# A quantity, not an identifier.
#
# The lookarounds are the whole rule. A digit glued to a letter, a hyphen or a
# slash belongs to a name: ROO-0025, ROO-INV-000520, 2026-05-01, clause s.3.
# Demanding evidence for those digits would make every citation a violation.
#
# The first version ended with a blanket "not followed by a dot", which meant
# "€30,068.00." at the end of a sentence failed to match in full and the regex
# backtracked to "30". A validator that silently reads a different number than
# the one on the page is worse than no validator: it reported a violation
# against a figure the artefact never stated.
NUMBER = re.compile(
    r"(?<![A-Za-z0-9.,/\-])"
    r"[€$£]?"
    r"(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)"
    r"\s?[%x]?"
    r"(?!\d)(?![A-Za-z])(?![,.]\d)(?![/\-]\w)"
)

# Ordinary English quantities that are not measurements. "The first contract"
# and "a second invoice" are not figures anybody needs cited.
SMALL_ORDINALS = {Decimal(n) for n in range(0, 3)}


@dataclass(frozen=True)
class Violation:
    rule: str
    detail: str
    claim: str = ""

    def __str__(self) -> str:
        where = f" [{self.claim[:60]}]" if self.claim else ""
        return f"{self.rule}: {self.detail}{where}"


@dataclass(frozen=True)
class ValidationReport:
    violations: list[Violation]

    @property
    def ok(self) -> bool:
        return not self.violations

    def __str__(self) -> str:
        return "\n".join(str(v) for v in self.violations) or "valid"


def numbers_in(text: str) -> list[Decimal]:
    found = []
    for match in NUMBER.finditer(text):
        raw = match.group(1).replace(",", "")
        try:
            found.append(Decimal(raw))
        except InvalidOperation:
            continue
    return found


def validate(
    artefact: Artefact,
    evidence: EvidenceIndex,
    granted_companies: set[str] | None = None,
) -> ValidationReport:
    violations: list[Violation] = []

    # Refusal beats invention. When nothing was retrieved there is nothing to
    # say, and an artefact that says something anyway is saying it from memory.
    if evidence.is_empty and artefact.claims and not artefact.refused:
        violations.append(
            Violation(
                "unsupported_artefact",
                f"{len(artefact.claims)} claims made but no tool returned anything citable",
            )
        )

    if artefact.refused and artefact.claims:
        violations.append(
            Violation("refused_but_claiming", "an artefact cannot both refuse and assert")
        )

    if granted_companies is not None:
        named = {artefact.company} | evidence.companies if artefact.company else evidence.companies
        outside = {c for c in named if c and c not in granted_companies}
        if outside:
            violations.append(
                Violation(
                    "company_outside_grant",
                    f"names {', '.join(sorted(outside))}, which the caller was not granted",
                )
            )

    for claim in artefact.claims:
        violations.extend(_check_claim(claim, evidence))

    return ValidationReport(violations)


def _check_claim(claim: Claim, evidence: EvidenceIndex) -> list[Violation]:
    violations: list[Violation] = []

    if not claim.citations:
        violations.append(Violation("uncited_claim", "no citation", claim.text))

    for citation in claim.citations:
        if not evidence.resolves(citation.kind, citation.ref):
            violations.append(
                Violation(
                    "unresolvable_citation",
                    f"{citation.kind} {citation.ref!r} was not returned by any tool in this run",
                    claim.text,
                )
            )

    for figure in claim.figures:
        if not evidence.knows_number(Decimal(str(figure))):
            violations.append(
                Violation("figure_not_in_evidence", f"{figure} was not returned", claim.text)
            )

    for number in numbers_in(claim.text):
        if number in SMALL_ORDINALS:
            continue
        if not evidence.knows_number(number):
            violations.append(
                Violation(
                    "number_not_in_evidence",
                    f"{number} appears in the prose but no tool returned it",
                    claim.text,
                )
            )

    return violations
