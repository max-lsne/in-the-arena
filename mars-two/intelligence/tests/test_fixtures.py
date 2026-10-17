"""The fixture store is what lets the whole suite run with no API key.

Its contract is narrow and the specs here pin the parts that go wrong quietly:
keys must depend on everything that changes an answer, a miss must raise rather
than fall through to the network, and equivalent requests must hash the same
however their dicts were built.
"""

import json

import pytest

from app.llm.fixtures import FixtureMissError, FixtureStore, request_key

REQUEST = {
    "model": "claude-opus-5",
    "system": "You reconcile contracts against invoices.",
    "messages": [{"role": "user", "content": "Find the leak in MTR-2231."}],
    "tools": [{"name": "contract_billing", "description": "d", "input_schema": {}}],
    "max_tokens": 16000,
}


def test_key_is_stable_across_calls():
    assert request_key(REQUEST) == request_key(REQUEST)


def test_key_ignores_dict_ordering():
    reordered = {k: REQUEST[k] for k in reversed(list(REQUEST))}
    assert request_key(reordered) == request_key(REQUEST)


@pytest.mark.parametrize(
    "field,value",
    [
        ("model", "claude-sonnet-5"),
        ("system", "You do something else."),
        ("max_tokens", 8000),
    ],
)
def test_key_changes_when_a_request_field_changes(field, value):
    assert request_key({**REQUEST, field: value}) != request_key(REQUEST)


def test_key_changes_when_the_prompt_changes():
    changed = {**REQUEST, "messages": [{"role": "user", "content": "Find the leak in MTR-9999."}]}
    assert request_key(changed) != request_key(REQUEST)


def test_key_changes_when_the_tool_surface_changes():
    changed = {**REQUEST, "tools": [*REQUEST["tools"], {"name": "extra", "input_schema": {}}]}
    assert request_key(changed) != request_key(REQUEST)


def test_roundtrip(tmp_path):
    store = FixtureStore(tmp_path)
    store.put(REQUEST, {"content": [{"type": "text", "text": "hello"}]})

    assert store.get(REQUEST)["content"][0]["text"] == "hello"


def test_a_miss_raises_rather_than_returning_none(tmp_path):
    with pytest.raises(FixtureMissError) as excinfo:
        FixtureStore(tmp_path).get(REQUEST)

    # The message has to name the key, because re-recording is the fix and the
    # key is how you find which fixture is missing.
    assert request_key(REQUEST)[:12] in str(excinfo.value)


def test_fixtures_are_written_as_readable_json(tmp_path):
    """A fixture is a review artefact. A diff should show how an answer changed."""
    store = FixtureStore(tmp_path)
    store.put(REQUEST, {"content": [{"type": "text", "text": "hello"}]})

    written = next(tmp_path.glob("*.json"))
    body = written.read_text()
    assert "\n" in body, "fixtures should be pretty-printed so diffs are readable"
    assert json.loads(body)["response"]["content"][0]["text"] == "hello"


def test_fixture_records_the_request_it_answers(tmp_path):
    """Without the request, a fixture is an unattributable blob."""
    store = FixtureStore(tmp_path)
    store.put(REQUEST, {"content": []})

    written = json.loads(next(tmp_path.glob("*.json")).read_text())
    assert written["request"]["model"] == "claude-opus-5"
    assert written["key"] == request_key(REQUEST)
