# 0007. A manual agent loop, with content-addressed recorded fixtures

Status: accepted
Date: 2026-09-12

## Context

The agent runtime has to satisfy three things at once.

The suite must pass with no API key and no network, because CI has neither and a
test that needs a live model is a test that fails for reasons unrelated to the
code.

Eval baselines are compared across runs, so the same inputs must produce the same
model output, which a live model does not guarantee even at temperature zero.

Every run must be inspectable afterwards. The error analysis surface in ADR 0003
shows an agent's inputs, its tool calls, its output and the grader's verdict side
by side, and reading failures one at a time is the loop. That needs the full
message history of a run, not a summary of it.

## Decision

A manual agent loop, and a recording LLM client with three modes.

`replay` is the default. Each request is canonicalised and hashed, and the hash
names a fixture file holding the response. A request with no fixture raises,
naming the missing key. It does not fall through to the network.

`record` calls the real API and writes the fixture. It requires a key and is run
deliberately, by `make fixtures`.

`live` calls the real API and writes nothing, for exploration.

Fixtures are content-addressed rather than sequential. Two runs that make the
same call share one fixture, and a changed prompt is a miss rather than a
silently reused answer from the previous prompt.

## Alternatives considered

**The SDK's tool runner.** Recommended by Anthropic's own guidance, and it would
remove the loop code entirely. Rejected on two grounds. It keeps its own copy of
the message history and does not expose it, so reconstructing what a run actually
sent would mean mirroring the history alongside it, which is most of the loop
back again. And it is beta, while this loop is the thing every eval runs through.

**VCR-style HTTP recording.** Records at the transport layer, which is less code.
Rejected because it couples fixtures to the SDK's wire format: an SDK upgrade
that changes a header or a field ordering invalidates every recording, and the
diff gives no indication whether behaviour changed. Recording at the API boundary
means a fixture is invalidated only when the request the agent makes changes,
which is the thing worth noticing.

**Sequential fixtures, replayed in order.** Simpler to write. Rejected because
it makes fixtures positional: inserting a tool call at the start of an agent
shifts every later fixture onto the wrong request, and the failure appears as a
strange model answer rather than as a mismatch.

**Live only, with a key in CI.** Rejected: non-deterministic, costs money per
run, and makes the suite fail when the API is slow.

## Consequences

The loop is ours, which means `pause_turn`, the iteration cap, and malformed
tool arguments are ours to handle. That is a real cost and it is also the skill
being practised, since the letter on agentic systems names exactly these
decisions.

Changing a prompt invalidates its fixtures and the eval suite fails with a
missing-key error until they are re-recorded. This is the intended behaviour: a
prompt change that silently reused the previous answer would make the eval report
the old behaviour's score.

Fixtures are committed. They are the only reason the suite runs offline, and they
are reviewable: a diff shows exactly how a model's answer changed when a prompt
changed.

Recording costs money and requires a key, so it is a deliberate act with its own
make target rather than something that happens because a test ran.
