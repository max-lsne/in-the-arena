"""The model client, in three modes.

`replay` is the default and never reaches the network, which is what lets the
whole suite run with no API key and produce the same answers on every machine.
See docs/adr/0007-agent-loop-and-fixtures.md.
"""

from __future__ import annotations

import os
from enum import StrEnum
from typing import Any

from app.llm.fixtures import FixtureStore


class LlmMode(StrEnum):
    REPLAY = "replay"
    RECORD = "record"
    LIVE = "live"


class MissingApiKeyError(RuntimeError):
    """A mode that calls the API was selected with no key available."""


class LlmClient:
    """Wraps the Anthropic SDK with recording.

    The API object is injected rather than constructed here, so tests can pass a
    stand-in and assert it was never touched. In replay mode it is never built at
    all, which is why replay works with no key and no network.
    """

    def __init__(
        self,
        mode: LlmMode,
        store: FixtureStore,
        api: Any | None = None,
    ) -> None:
        self.mode = mode
        self.store = store
        self._api = api

        needs_key = mode in (LlmMode.RECORD, LlmMode.LIVE) and api is None
        if needs_key and not os.environ.get("ANTHROPIC_API_KEY"):
            raise MissingApiKeyError(
                f"MARS_LLM_MODE={mode.value} calls the API and needs ANTHROPIC_API_KEY. "
                f"Use replay to run against recorded fixtures."
            )

    @classmethod
    def from_env(cls, store: FixtureStore, api: Any | None = None) -> LlmClient:
        raw = os.environ.get("MARS_LLM_MODE", LlmMode.REPLAY.value)
        try:
            mode = LlmMode(raw)
        except ValueError as exc:
            valid = ", ".join(m.value for m in LlmMode)
            raise ValueError(f"unknown MARS_LLM_MODE {raw!r}; expected one of {valid}") from exc
        return cls(mode=mode, store=store, api=api)

    @property
    def api(self) -> Any:
        if self._api is None:
            import anthropic

            self._api = anthropic.Anthropic()
        return self._api

    def create(self, **request: Any) -> dict[str, Any]:
        if self.mode is LlmMode.REPLAY:
            # Deliberately no fallback. A miss here raises, because falling
            # through to a live call would pass locally, fail in CI, and bill
            # someone for a test run.
            return self.store.get(request)

        if self.mode is LlmMode.RECORD and self.store.has(request):
            return self.store.get(request)

        response = self._as_dict(self.api.messages.create(**request))

        if self.mode is LlmMode.RECORD:
            self.store.put(request, response)

        return response

    @staticmethod
    def _as_dict(response: Any) -> dict[str, Any]:
        """SDK objects are pydantic models; fixtures are plain JSON."""
        if isinstance(response, dict):
            return response
        if hasattr(response, "model_dump"):
            return response.model_dump(mode="json")
        raise TypeError(f"cannot serialise a {type(response).__name__} response")
