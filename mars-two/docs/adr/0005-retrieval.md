# 0005. Structured data in SQL, unstructured in pgvector, never mixed

Status: accepted
Date: 2026-09-12

## Context

AriesOne is described as ingesting CRM and ERP data alongside contracts and financial
records. Those are two different retrieval problems and the common mistake is to treat
them as one by embedding everything and hoping semantic search finds the right number.

A vector store asked for "Vaultline's Q3 net revenue retention" returns chunks that
talk about retention. It cannot return the number, because the number is an aggregate
that exists in no document.

## Decision

Two paths, chosen by the shape of the question rather than by the agent.

Structured facts are computed in SQL by `platform` and exposed as named tools with
typed parameters. `net_revenue_retention(company_id:, period:)` returns a labelled
value with its formula, its inputs, and the row count behind it. The agent selects the
tool; it never sees raw rows and never aggregates.

Unstructured text goes into pgvector: contracts, board minutes, support transcripts,
chunked with their metadata preserved. Retrieval returns chunks with company, document,
date and offset attached, so every quote is traceable to a location.

An agent answering "why did retention fall" calls the metric tool for the number and
the retrieval tool for the narrative, and the artefact shows both with separate
provenance.

Retrieval sits behind an interface with one implementation today. pgvector is a
deployment detail, and the chunking and ranking logic is where the quality actually is.

## Alternatives considered

**Embed everything, including tabular data.** One code path. Rejected because it
guarantees the failure this ADR exists to prevent: a model reading numbers out of
retrieved text and doing arithmetic on them.

**Text-to-SQL instead of named tools.** More flexible, and it handles questions nobody
anticipated. Rejected for now on two grounds. It is an injection surface reached by
untrusted document text, and it makes the "models never do arithmetic" invariant
unenforceable, because the arithmetic moves into generated SQL that nothing validates.
Worth revisiting behind a read-only role, a query validator and its own eval set, which
is a project rather than a feature.

**A dedicated vector database.** Better at scale. Rejected because the corpus here is
thousands of chunks, pgvector keeps chunks in the same database as the tenancy policies
that protect them, and one fewer system with its own access model is a security
simplification rather than a convenience.

## Consequences

Chunks inherit row-level security, because they live in the same Postgres as everything
else. A retrieval query from a portfolio company executive cannot return another
company's contract text, and that holds without any filtering logic in `intelligence`.

Every new metric an agent needs is a schema change plus a tool, not a prompt change.
This is slower and it is the mechanism by which numeric claims stay correct.

Two retrieval paths means two eval treatments. Metric tools are graded on exactness,
retrieval on whether the cited chunk supports the claim.
