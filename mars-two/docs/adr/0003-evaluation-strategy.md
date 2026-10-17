# 0003. Three layers of evaluation, with the deterministic layer first

Status: accepted
Date: 2026-09-12

## Context

Ng's framing is that the trait separating people who are good at building AI systems
from people who are not is whether they can run a disciplined evals and error-analysis
loop. So the eval harness is the centre of this project rather than a finishing task,
and it has to be built before the agents rather than after them.

The difficulty is that the six agents produce different kinds of output. "This contract
under-billed by EUR 41,200" is checkable against a known answer. "Here is the board
narrative for Q3" is not.

## Decision

Three layers, applied in this order of preference. Use the cheapest layer that can
actually judge the output.

**Layer 1, deterministic graders.** Where truth is known, assert against it. The
synthetic data generator plants defects and records exactly what it planted, so the
grader computes precision and recall against a ground-truth set. This covers pipeline
hygiene, contract-to-billing reconciliation, onboarding blockers, and every numeric
claim in every artefact.

**Layer 2, structural validators.** Properties that must hold regardless of content.
Every claim is cited. Every figure matches the precomputed metric it references to the
cent. No company is named that the caller lacks a grant for. The agent refused when
retrieval returned nothing relevant. These are assertions about shape, they need no
model, and they run in milliseconds.

**Layer 3, LLM-as-judge.** Only for prose quality on the two synthesis agents, and only
against a rubric. The judge is itself calibrated against a human-labelled golden set:
if the judge's agreement with the labels drops below threshold, the judge is the thing
that failed, and the harness says so rather than reporting an agent regression.

Evals run in CI. A regression fails the build.

## Alternatives considered

**LLM-as-judge for everything.** The default in most projects, and much faster to set
up. Rejected as the primary mechanism because it is expensive, non-deterministic, and
unfalsifiable: when the judge and the agent are the same model family, the judge
forgives exactly the errors the agent is prone to. It survives as Layer 3 for the
narrow case where nothing else can judge.

**Exact-match assertions on output text.** Deterministic and cheap. Rejected because it
tests phrasing rather than properties, so every prompt improvement breaks the suite and
the team learns to distrust it.

**Human review only.** Highest quality signal. Rejected as a gate because it does not
run in CI, though the golden set is human-labelled precisely because that signal is
needed somewhere.

## Consequences

The synthetic data generator becomes eval infrastructure rather than a convenience. Its
job is to plant defects and record them. This is why it is built before the agents, and
why it is deterministic under a fixed seed. See `0004-synthetic-data.md`.

The harness reports precision and recall per agent per run, not a single pass or fail.
An agent that finds 9 of 10 planted revenue leaks and invents 3 that do not exist is a
different problem from one that finds 4 and invents none, and one number hides that.

Error analysis needs a surface, not a log. Failed cases are browsable in the front end
with the agent's inputs, its tool calls, its output and the grader's verdict side by
side, because reading failures one at a time is the loop, and a CI summary line does
not support it.

Judge drift is itself monitored. A model upgrade can move the judge without moving the
agents, and without the calibration set that reads as a product regression.
