"""What an agent hands back.

An artefact is structured, not prose with a paragraph of sources at the bottom.
The structure is what makes Layer 2 of ADR 0003 possible: a validator can ask
"does this claim carry a citation" only if a claim is a thing rather than a
sentence somebody wrote.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class Citation(BaseModel):
    """Where a claim came from.

    `kind` says which index to resolve against, because a metric key and a
    contract reference can collide and resolving them in one namespace would let
    a wrong citation look right.
    """

    kind: str = Field(description="metric, finding or document")
    ref: str = Field(description="The identifier, exactly as the tool returned it.")


class Claim(BaseModel):
    text: str
    citations: list[Citation] = Field(default_factory=list)
    figures: list[float] = Field(
        default_factory=list,
        description="Figures the claim asserts, as the tool returned them.",
    )


class Artefact(BaseModel):
    agent: str
    company: str | None = None
    title: str
    summary: str = ""
    claims: list[Claim] = Field(default_factory=list)
    refused: bool = False
    refusal_reason: str = ""
