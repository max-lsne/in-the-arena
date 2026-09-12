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
| LLM foundations | `intelligence/llm/` | Context window budgeting, structured output, the recorded-fixture client, cost and latency accounting per agent run |
| Grounding models with data | `intelligence/retrieval/` | Document pipeline into pgvector, chunking with metadata, citation-carrying retrieval. The split between SQL facts and vector text is ADR 0005 |
| Building agentic systems | `intelligence/agents/`, `intelligence/tools/` | Validated tool registry, single-agent runtime, one orchestrator agent, memory and context management across a long run, MCP surface |
| Evaluation-driven development | `intelligence/evals/` | Three-layer harness of ADR 0003. Planted ground truth, structural validators, calibrated judge. Error analysis surface in `web/` |
| Operating in production | `platform/`, `.github/workflows/` | Guardrails, adversarial input handling, the data exfiltration threat model in ADR 0002, run tracing, CI gates |
| Machine learning foundations | `intelligence/evals/calibration/` | Precision, recall and ranking metrics done properly, judge calibration against a labelled set, why a single accuracy number hides the failure that matters |

## 2. Software engineering fundamentals

The letter frames this as recognising tradeoffs between cost, scalability, reliability,
speed, security and privacy, and letting that shape stack choice, system architecture,
data store design and testing. It also notes that agentic coding pushes specialists
toward full-stack breadth.

| Sub-skill | Where | What specifically |
| --- | --- | --- |
| System architecture | `docs/adr/0001` | The three-service split, and why the service boundary is a security mechanism rather than an organisational one |
| Data store design | `platform/db/` | Schema for eight companies that disagree about what ARR means, time-series rollups, indexing for the queries that actually run |
| Security and privacy | `platform/app/policies/`, ADR 0002 | Row-level security as the boundary, tested by attacking it |
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
| Verification | `.github/workflows/ci.yml` | Tests, evals and acceptance criteria as gates rather than suggestions |
| Agentic code review | CI | Automated review on every change, with the security and architecture audit as a separate pass |
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
