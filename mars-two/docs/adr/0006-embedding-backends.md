# 0006. A deterministic hashing embedder as the offline default

Status: accepted
Date: 2026-09-12

## Context

Retrieval needs embeddings, and three constraints pull against each other.

The suite must pass with no API key and no network, so a hosted embedding model
cannot be the default. Eval baselines are compared across runs, so the embedder
must be deterministic, and a hosted model is not: providers version their
embedding models and a silent upgrade shifts every vector in the index. And the
corpus here is synthetic contracts, board minutes and support transcripts, where
the thing an agent needs to cite is a specific clause in close to its original
wording.

## Decision

An `Mars::Embedding` interface with a backend chosen by `MARS_EMBEDDING`.

The default backend, `hashed`, is a hashing embedder. It tokenises to lowercase
words plus word bigrams, hashes each token to one of 1024 dimensions with a sign
drawn from the same hash, accumulates with sublinear term frequency, and
L2-normalises. No model, no network, no state. Identical input gives identical
output on every machine and in every future version.

This is lexical retrieval, not semantic. It is good at finding the clause that
uses the query's words and bad at finding the clause that means the same thing in
different words. That limitation is stated here rather than discovered later.

A hosted backend slots in behind the same interface for live mode, and the
dimension stays 1024 so the column does not change.

## Alternatives considered

**A hosted embedding model as the default.** Better retrieval, and the obvious
choice. Rejected as the default because it makes the suite depend on a key and a
network, and because a provider's model upgrade would invalidate every recorded
eval baseline without any change to this repository. It remains available for
live mode.

**A local sentence-transformers model.** Offline and semantic. Rejected because it
adds a heavyweight Python dependency to a Ruby service, downloads hundreds of
megabytes in CI, and is still version-sensitive in exactly the way the hosted
option is. If semantic retrieval becomes the thing being evaluated, this is the
option to revisit, behind the same interface.

**No embeddings, SQL text search instead.** Postgres full-text search is offline,
deterministic and genuinely good. Rejected because the point of this module is to
exercise the grounding sub-skill as it is actually practised, which means a vector
index, a chunking strategy and a ranking decision. Falling back to `tsvector`
would sidestep the skill rather than teach it.

## Consequences

Retrieval quality is the floor, not the ceiling. An eval that tests whether an
agent handles paraphrase is testing the embedder rather than the agent, so the
retrieval evals assert citation correctness on clause language and the backend
name is recorded with every eval run.

The embedder is a pure function, so chunk embeddings can be recomputed at any
time without an external call. Re-embedding the whole corpus costs seconds.

Swapping the backend invalidates the index. Chunks record which backend embedded
them, and a mismatch is an error rather than a silently degraded search.
