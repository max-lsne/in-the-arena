"""The LLM client's three modes, and the boundaries between them.

The property that matters most is that `replay` never reaches the network. A
client that quietly fell back to a live call on a fixture miss would make the
suite pass on a developer's machine and fail in CI, and would bill someone for
a test run.
"""

import pytest

from app.llm.client import LlmClient, LlmMode, MissingApiKeyError
from app.llm.fixtures import FixtureMissError, FixtureStore

REQUEST = {
    "model": "claude-opus-5",
    "max_tokens": 16000,
    "messages": [{"role": "user", "content": "hello"}],
}


class RecordingApi:
    """Stands in for anthropic.Anthropic, and counts what reached it."""

    def __init__(self, response=None):
        self.calls = []
        self.response = response or {"content": [{"type": "text", "text": "live answer"}]}
        self.messages = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self.response


def test_replay_returns_the_recorded_response(tmp_path):
    store = FixtureStore(tmp_path)
    store.put(REQUEST, {"content": [{"type": "text", "text": "recorded answer"}]})
    api = RecordingApi()

    client = LlmClient(mode=LlmMode.REPLAY, store=store, api=api)

    assert client.create(**REQUEST)["content"][0]["text"] == "recorded answer"
    assert api.calls == [], "replay must not reach the API"


def test_replay_raises_on_a_miss_instead_of_calling_the_api(tmp_path):
    api = RecordingApi()
    client = LlmClient(mode=LlmMode.REPLAY, store=FixtureStore(tmp_path), api=api)

    with pytest.raises(FixtureMissError):
        client.create(**REQUEST)

    assert api.calls == [], "a miss must not fall through to the network"


def test_replay_needs_no_api_key(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    store = FixtureStore(tmp_path)
    store.put(REQUEST, {"content": []})

    assert LlmClient(mode=LlmMode.REPLAY, store=store).create(**REQUEST) == {"content": []}


def test_record_calls_the_api_and_writes_a_fixture(tmp_path):
    store = FixtureStore(tmp_path)
    api = RecordingApi()
    client = LlmClient(mode=LlmMode.RECORD, store=store, api=api)

    client.create(**REQUEST)

    assert len(api.calls) == 1
    assert store.get(REQUEST)["content"][0]["text"] == "live answer"


def test_record_reuses_an_existing_fixture_rather_than_paying_twice(tmp_path):
    store = FixtureStore(tmp_path)
    store.put(REQUEST, {"content": [{"type": "text", "text": "already recorded"}]})
    api = RecordingApi()

    LlmClient(mode=LlmMode.RECORD, store=store, api=api).create(**REQUEST)

    assert api.calls == [], "recording an existing fixture should not spend money again"


def test_live_calls_the_api_and_writes_nothing(tmp_path):
    store = FixtureStore(tmp_path)
    api = RecordingApi()

    LlmClient(mode=LlmMode.LIVE, store=store, api=api).create(**REQUEST)

    assert len(api.calls) == 1
    with pytest.raises(FixtureMissError):
        store.get(REQUEST)


@pytest.mark.parametrize("mode", [LlmMode.RECORD, LlmMode.LIVE])
def test_modes_that_call_the_api_require_a_key(tmp_path, monkeypatch, mode):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    with pytest.raises(MissingApiKeyError):
        LlmClient(mode=mode, store=FixtureStore(tmp_path))


def test_mode_is_read_from_the_environment(tmp_path, monkeypatch):
    monkeypatch.setenv("MARS_LLM_MODE", "replay")
    assert LlmClient.from_env(store=FixtureStore(tmp_path)).mode is LlmMode.REPLAY


def test_an_unknown_mode_is_rejected_rather_than_defaulted(tmp_path, monkeypatch):
    monkeypatch.setenv("MARS_LLM_MODE", "yolo")

    with pytest.raises(ValueError, match="yolo"):
        LlmClient.from_env(store=FixtureStore(tmp_path))
