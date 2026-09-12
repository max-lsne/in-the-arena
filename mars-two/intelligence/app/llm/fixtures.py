"""Content-addressed storage for recorded model responses.

A fixture is keyed by a hash of the request that produced it, so the same call
made by two agents shares one file and a changed prompt is a miss rather than a
silently reused answer from the previous prompt. See
docs/adr/0007-agent-loop-and-fixtures.md.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


class FixtureMissError(LookupError):
    """No recording exists for this request."""


def request_key(request: dict[str, Any]) -> str:
    """Hash everything about a request that could change the answer.

    Canonical JSON with sorted keys, so a request assembled in a different order
    hashes the same. Nothing is excluded: a changed model, system prompt, tool
    surface or sampling parameter all have to miss, because all of them change
    what comes back.
    """
    canonical = json.dumps(request, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


class FixtureStore:
    def __init__(self, directory: Path | str) -> None:
        self.directory = Path(directory)

    def path_for(self, key: str) -> Path:
        return self.directory / f"{key}.json"

    def get(self, request: dict[str, Any]) -> dict[str, Any]:
        key = request_key(request)
        path = self.path_for(key)
        if not path.exists():
            raise FixtureMissError(
                f"no fixture for request {key[:12]}. "
                f"Re-record with `make fixtures` (needs ANTHROPIC_API_KEY), "
                f"or check whether a prompt changed."
            )
        return json.loads(path.read_text())["response"]

    def has(self, request: dict[str, Any]) -> bool:
        return self.path_for(request_key(request)).exists()

    def put(self, request: dict[str, Any], response: dict[str, Any]) -> Path:
        """Write the request alongside the response.

        Without the request a fixture is an unattributable blob, and the point of
        committing these is that a reviewer can see which call produced which
        answer. Pretty-printed for the same reason: the diff when a prompt
        changes is the interesting artefact.
        """
        key = request_key(request)
        self.directory.mkdir(parents=True, exist_ok=True)
        path = self.path_for(key)
        path.write_text(
            json.dumps(
                {"key": key, "request": request, "response": response},
                indent=2,
                sort_keys=True,
                default=str,
            )
            + "\n"
        )
        return path
