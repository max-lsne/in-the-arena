# 0004. Deterministic synthetic data with planted, recorded ground truth

Status: accepted
Date: 2026-09-12

## Context

There is no real portfolio data, and there should not be: fabricated financials
attached to real company names in a public repository would be misread.

Synthetic data is usually treated as a seeding convenience. Here it carries a second
job that matters more. Layer 1 of the eval strategy needs known answers, and the only
way to know the answer is to have planted it.

## Decision

One generator, in `platform/lib/synthetic/`, seeded and deterministic. The same seed
produces byte-identical data on every machine.

It emits eight fictional companies totalling EUR 70.0M ARR, with 24 months of
operating history: customers, subscriptions, contracts, invoices, usage, support
tickets, CRM opportunities, headcount, initiatives, and unstructured documents
including contracts, board minutes and support transcripts.

While generating, it plants defects and writes each one to a `ground_truth` table:
the record affected, the defect class, and the exact expected finding.

| Defect class | Planted as | Grader checks |
| --- | --- | --- |
| Revenue leakage | Uplift clause not applied, seat growth unbilled, expired discount still applied, currency mismatch | Contract identified, and stated amount within EUR 1 of the planted amount |
| CRM hygiene | Duplicate accounts, owner who left, close date in the past, amount contradicting the signed contract | Precision and recall over the defect set |
| Churn risk | Usage decline, ticket sentiment turn, late payment, champion departure, in accounts that do churn | Ranking quality: do the accounts that churned rank top-k |
| Onboarding stall | A specific blocking step, in a specific customer's sequence | The named blocking step matches |
| Benchmark arithmetic | Nothing planted; the answer is computable in SQL | Stated figure matches the SQL answer exactly |

The data is deliberately messy in ways that are not defects: inconsistent country
codes, three spellings of the same reseller, currencies mixed across companies, one
company that counts annualised MRR and another that counts booked ACV. This separates
"the agent found a real problem" from "the agent tripped over formatting", which are
the two things a naive eval conflates.

## Alternatives considered

**Random data with no planted truth.** Faster. Rejected because it makes Layer 1
impossible, which collapses the whole eval strategy onto LLM judging.

**Clean, consistent data.** Easier to generate and easier for agents to handle.
Rejected because the actual difficulty of a multi-company operating platform is that
the eight companies disagree with each other, and clean data removes the problem the
system exists to solve.

**Public datasets.** Realistic distributions. Rejected because none has the shape of
eight related B2B SaaS companies under one owner, and none comes with planted defects.

## Consequences

`ground_truth` must never be reachable from any tool in the registry. An agent that can
read the answer key produces a perfect, meaningless eval score. It is excluded at the
API layer, and there is a test asserting no registered tool can reach it.

Changing the generator invalidates recorded eval baselines. The seed and a generator
version are stamped into every eval run, and the harness refuses to compare runs across
versions rather than silently reporting a regression that is really a data change.

Planted defects are a floor, not a ceiling. An agent may find a real problem the
generator created by accident. The grader counts those as false positives, which is
unfair to the agent and the correct default, since the alternative is to let the agent
argue its way out of any miss.
