"""Running an agent and deciding whether to keep what it produced.

Three things happen here that the loop itself does not do: the platform is
wrapped so every payload it returns is remembered, the final message is parsed
into a structured artefact, and the artefact is validated before anyone sees it.

The parse is the one place a model is given a second chance. A malformed JSON
object is a recoverable mistake and the error is a good instruction, so the parse
failure is handed back once. A validation failure is not handed back: an artefact
that cited nothing, or stated a number nobody returned, failed on the substance,
and asking the same model to try again is how a wrong answer becomes a
well-formatted wrong answer.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from pydantic import ValidationError

from app.agents.recording import RecordingPlatform
from app.agents.runtime import AgentResult, AgentRuntime, AgentSpec, StopReason
from app.artefacts.evidence import EvidenceIndex
from app.artefacts.models import Artefact
from app.artefacts.validator import ValidationReport, Violation, validate
from app.tools.registry import ToolContext, ToolRegistry

FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.MULTILINE)


@dataclass
class AgentRun:
    spec_key: str
    artefact: Artefact | None
    report: ValidationReport
    result: AgentResult
    evidence: EvidenceIndex
    parse_errors: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.artefact is not None and self.report.ok


def parse_artefact(text: str | None) -> tuple[Artefact | None, str]:
    if not text:
        return None, "the agent returned no text"

    # A fenced block is a formatting habit rather than a refusal to answer, so it
    # is stripped rather than rejected. Anything else malformed is handed back.
    candidate = FENCE.sub("", text).strip()

    try:
        payload = json.loads(candidate)
    except json.JSONDecodeError as exc:
        return None, f"that was not valid JSON: {exc}"

    if not isinstance(payload, dict):
        return None, f"expected a JSON object, got a {type(payload).__name__}"

    try:
        return Artefact.model_validate(payload), ""
    except ValidationError as exc:
        problems = "; ".join(
            f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors()
        )
        return None, f"the object did not match the artefact shape: {problems}"


def run_agent(
    spec: AgentSpec,
    task: str,
    llm: Any,
    registry: ToolRegistry,
    platform: Any,
    granted_companies: set[str] | None = None,
) -> AgentRun:
    recorder = RecordingPlatform(platform)
    runtime = AgentRuntime(llm=llm, registry=registry, ctx=ToolContext(platform=recorder))

    result = runtime.run(spec, task)
    artefact, problem = parse_artefact(result.output)
    parse_errors = [problem] if problem else []

    if artefact is None and result.stop_reason is StopReason.COMPLETED:
        retry = runtime.run(
            spec,
            f"{task}\n\nYour previous reply could not be used: {problem}. "
            f"Reply again with the JSON object alone.",
        )
        # The evidence index is shared, so a retry that calls tools again adds to
        # what is citable rather than starting from nothing.
        result = retry
        artefact, problem = parse_artefact(retry.output)
        if problem:
            parse_errors.append(problem)

    if artefact is None:
        return AgentRun(
            spec_key=spec.key,
            artefact=None,
            report=ValidationReport(
                [Violation("unparseable_artefact", parse_errors[-1] if parse_errors else "")]
            ),
            result=result,
            evidence=recorder.evidence,
            parse_errors=parse_errors,
        )

    report = validate(artefact, recorder.evidence, granted_companies)
    return AgentRun(
        spec_key=spec.key,
        artefact=artefact,
        report=report,
        result=result,
        evidence=recorder.evidence,
        parse_errors=parse_errors,
    )
