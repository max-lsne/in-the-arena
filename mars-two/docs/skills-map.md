# What each module teaches

Andrew Ng and DeepLearning.AI published the AI Engineering Skills Map on 14 August
2026, built from analysis of more than 10,000 job postings plus expert interviews and
survey data. It names four top-level skills. This file records where each one is
exercised in this repo, so the learning goal stays checkable rather than assumed.

Source letters: the map itself, then four follow-ups covering building and deploying
AI applications, software engineering fundamentals, using coding agents, and shaping
the build.

## 1. Building and deploying AI applications

Six sub-skills: LLM foundations, grounding models with data, building agentic systems,
evaluation-driven development, operating in production, and machine learning
foundations.

| Sub-skill | Where | What specifically |
| --- | --- | --- |
| LLM foundations | `intelligence/app/llm/` | Context window budgeting, structured output, the recorded-fixture client, cost and latency accounting per agent run |
| Grounding models with data | `platform/app/lib/mars/`, `platform/app/controllers/api/v1/retrieval_controller.rb` | Document pipeline into pgvector, chunking with metadata, citation-carrying retrieval. The split between SQL facts and vector text is ADR 0005 |
| Building agentic systems | `intelligence/app/agents/`, `intelligence/app/tools/`, `intelligence/app/mcp_server.py` | Validated tool registry, single-agent runtime, one orchestrator agent, memory and context management across a long run, and the same registry exposed over MCP in `intelligence/app/mcp_server.py` |
| Evaluation-driven development | `platform/app/lib/evals/`, `intelligence/app/artefacts/` | Layers 1 and 2 of ADR 0003: planted ground truth scored in `platform/app/lib/evals/detector_scores.rb`, structural validators in `intelligence/app/artefacts/validator.py`. The per-case ledger is read by the error analysis surface in `web/`. Layer 3, the calibrated judge, needs a key and is not built |
| Operating in production | `platform/`, `intelligence/app/main.py`, `.github/workflows/` | Guardrails, adversarial input handling, the data exfiltration threat model in ADR 0002, run tracing, CI gates |
| Machine learning foundations | `platform/app/lib/evals/` | Precision, recall and ranking metrics reported separately and never averaged, a ceiling reported beside a precision that cannot reach 1.0, and why a single accuracy number hides the failure that matters. Judge calibration against a labelled set is not built: it needs a key |

## 2. Software engineering fundamentals

The letter frames this as recognising tradeoffs between cost, scalability, reliability,
speed, security and privacy, and letting that shape stack choice, system architecture,
data store design and testing. It also notes that agentic coding pushes specialists
toward full-stack breadth.

| Sub-skill | Where | What specifically |
| --- | --- | --- |
| System architecture | `docs/adr/0001` | The three-service split, and why the service boundary is a security mechanism rather than an organisational one |
| Data store design | `platform/db/` | Schema for eight companies that disagree about what ARR means, time-series rollups, indexing for the queries that actually run |
| Security and privacy | `platform/db/migrate/`, `platform/app/lib/mars/tenancy.rb`, ADR 0002 | Row-level security as the boundary, tested by attacking it |
| Testing | `platform/spec/`, `intelligence/tests/` | Property assertions over phrasing assertions, isolation tests that attempt breaches, fixtures that keep the suite offline |
| Tradeoff recognition | `docs/adr/` | Every ADR names what lost and why. That is the skill |
| Full-stack breadth | All three services | Ruby, Python and TypeScript in one change when a feature needs it |

## 3. Using coding agents

Five areas: architecture and tradeoff judgement, context management, verification,
agentic code review with security and architecture audits, and deployment verification.

This skill is exercised by how this repo is built, not by a module inside it.

| Sub-skill | Where | What specifically |
| --- | --- | --- |
| Context management | `CLAUDE.md`, `docs/log/` | What the agent was told, what it was not, and which omissions caused which defects |
| Verification | `.github/workflows/mars-two-ci.yml` | Tests, evals and acceptance criteria as gates rather than suggestions |
| Agentic code review | CI | Four jobs, each of which has failed for a real reason at least once. The eval gate and the case-ledger staleness check are the two that catch what tests do not |
| Human review where AI review is insufficient | `docs/log/` | Recorded cases where automated review passed something a human caught |
| Spec-first workflow | Git history | Specs and failing tests committed before implementations, deliberately not squashed |

## 4. Shaping the build

Product sense, business context, customer goals, spotting opportunities, and judging
when to ship a rough MVP against when to build carefully.

| Sub-skill | Where | What specifically |
| --- | --- | --- |
| Business context | `README.md`, ADR 0004 | Why eight companies that count ARR differently is the actual product problem |
| Deciding what goes in the spec | `docs/adr/`, agent briefs | Each agent has a written brief stating who it is for, what artefact it produces, and what would make it useless |
| MVP against careful | ADR 0005 | Text-to-SQL was deferred with the conditions for revisiting it written down, rather than dropped |
| Opportunity identification | Cross-portfolio benchmark agent | The one capability that exists only because these eight companies share an owner |
