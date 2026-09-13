# State

Last updated 2026-09-13, after the benchmark and the register fixes.

## Built and verified

| Area | Where | Evidence |
| --- | --- | --- |
| Schema, RLS, two roles | `platform/db/` | 191 examples, isolation verified by disabling RLS and by granting BYPASSRLS |
| Synthetic portfolio | `platform/lib/synthetic/` | Eight companies, EUR 70.0M exactly, deterministic under seed 20260912 |
| Metrics and rollups | `platform/app/lib/metrics/` | Seven metrics, each with unit, formula, direction and completeness |
| Four detectors | `platform/app/lib/{reconciliation,detection}/` | Scored against the planted key: revenue 32/32, CRM 37/37, onboarding 14/14, churn recall@5 1.0 |
| Eval gate and case ledger | `platform/app/lib/evals/` | CI fails on a worse score or a stale ledger |
| API | `platform/app/controllers/api/v1/` | Nine endpoints, each grant-filtered, listed in `platform/README.md` |
| Tool registry and MCP | `intelligence/app/tools/`, `app/mcp_server.py` | Probed end to end over stdio with a portfolio company's token |
| Artefact validation | `intelligence/app/artefacts/` | Layer 2 of ADR 0003, against captured payloads |
| Agent pipeline | `intelligence/app/agents/` | Six specs, run pipeline tested with a scripted model |
| Three views | `web/src/` | Register, artefact, error analysis. 53 tests, rendered and measured in a browser |

Counts at last run: 191 Ruby examples, 120 Python tests, 53 TypeScript tests.

## Blocked

Recording LLM fixtures needs `ANTHROPIC_API_KEY`. Until then the agents are
exercised with a scripted model, which covers everything except the model's
judgement. `make fixtures` says so and exits non-zero rather than appearing to
work.

Layer 3 of ADR 0003, the calibrated judge, is blocked on the same key.

## Open, not blocked

The design brief is built out in full and has not been signed off on the rendered
result.

PR #84's description says `mars_owner` where the role is `mars`, and "30+ tables"
where there are 26. Its base is `claude/sleepy-euler-2tJJ3` rather than a default
branch.

## The pattern worth remembering

Write the check, run it against the data, discover the data makes the check
unmeasurable, fix the data, repeat. A noisy baseline, an incomplete answer key,
and a signal only the planting sets all present as detector precision problems.
The tell is a number too clean or too bad rather than plausible: 0.5000 that never
moves, 1.0 everywhere, 0.9730 where everything else is 1.0.
