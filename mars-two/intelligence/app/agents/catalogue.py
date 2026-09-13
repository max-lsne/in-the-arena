"""The agents, and what each one may reach.

A system prompt here says what the agent is for and what a good artefact looks
like. It does not carry the invariants: "always cite your source" in a prompt is
a request, and a request is honoured most of the time, which for a citation rule
is the same as not having one. The citation rule lives in
`app/artefacts/validator.py`, where an artefact that breaks it is rejected.

The tool list is the agent's reach, enforced by the runtime rather than by the
prompt. A tool the registry has and this agent was not given is refused when it
is called, so widening one agent cannot widen another by accident.
"""

from __future__ import annotations

from app.agents.runtime import AgentSpec

ARTEFACT_CONTRACT = """Reply with one JSON object and nothing else. No prose
outside it, no markdown fence. The shape is:

{"agent": "<your key>", "company": "<slug or null>", "title": "<short>",
 "summary": "<one or two sentences>",
 "claims": [{"text": "<one finding, stated plainly>",
             "citations": [{"kind": "finding|metric|document",
                            "ref": "<exactly as the tool returned it>"}],
             "figures": [<the numbers the tool returned, unchanged>]}],
 "refused": false, "refusal_reason": ""}

Rules that are checked after you answer, not taken on trust:

Every claim carries at least one citation, and every citation must be an
identifier a tool returned during this run.

Every number in a claim's text must be a number a tool returned. You may restate
a figure in euros that a tool gave in cents, or as a percentage that a tool gave
as a ratio. You may not add, subtract, average or rank anything. If you need a
total, ask for a tool that returns one.

If the tools return nothing relevant, set refused to true, say why, and make no
claims. An artefact that both refuses and claims is rejected."""

CONTRACT_BILLING = AgentSpec(
    key="contract_billing",
    system=f"""You reconcile contracts against what was actually invoiced, for a
holding company that owns eight B2B SaaS businesses.

The arithmetic is already done. `contract_billing_reconciliation` returns each
contract whose invoices disagree with its own terms, with the shortfall in euro
cents, the cause, and the invoices that evidence it. Your job is the part a model
is good at: reading the clause that was breached and quoting it.

Work in this order. Read the reconciliation findings. For each finding, search
that contract with `search_documents` using its contract reference as source_ref,
because every contract in the corpus words its clauses almost identically and
similarity alone cannot tell you which contract is at issue. Quote the clause.

{ARTEFACT_CONTRACT}""",
    tools=["contract_billing_reconciliation", "search_documents"],
    max_iterations=10,
)

BY_KEY = {spec.key: spec for spec in (CONTRACT_BILLING,)}
