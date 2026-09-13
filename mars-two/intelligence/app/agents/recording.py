"""A platform client that remembers what it was told.

The validator needs to know which figures the platform actually returned. The
runtime's trace records what was called and whether it failed, not what came
back, and enlarging the trace to carry every payload would make it a second copy
of the data with its own chance of disagreeing.

So the recording happens at the only place the data crosses into the process.
Everything the agent could possibly know passed through here.
"""

from __future__ import annotations

from typing import Any

from app.artefacts.evidence import EvidenceIndex


class RecordingPlatform:
    def __init__(self, platform: Any, evidence: EvidenceIndex | None = None) -> None:
        self._platform = platform
        self.evidence = evidence or EvidenceIndex()

    def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._record(self._platform.get(path, params))

    def post(self, path: str, data: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._record(self._platform.post(path, data))

    def _record(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.evidence.record(payload)
        return payload
