"""The tools an agent may call.

Each one is a named, typed view onto something `platform` chose to expose. There
is no general query tool and no raw row access, which is how "models never do
arithmetic" stays structural: the only figures reachable are ones already
computed in SQL and labelled with their unit and formula.

Nothing here reaches `ground_truths`. The answer key is revoked from the runtime
role and has no endpoint; this is the third lock on the same door.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.tools.registry import ToolContext, ToolRegistry

registry = ToolRegistry()


class ListCompaniesParams(BaseModel):
    pass


@registry.register(
    "list_companies",
    "List the portfolio companies you are permitted to see, with each one's own "
    "definition of recurring revenue. Definitions differ between companies, so "
    "never add their ARR figures together without saying which definitions were mixed.",
    ListCompaniesParams,
    path="/api/v1/companies",
)
def list_companies(params: ListCompaniesParams, ctx: ToolContext) -> dict:
    return ctx.platform.get("/api/v1/companies")


class CompanyMetricsParams(BaseModel):
    company: str | None = Field(
        default=None, description="Company slug. Omit to read across the whole portfolio."
    )
    keys: str | None = Field(
        default=None,
        description="Comma-separated metric keys, for example 'arr_cents,net_revenue_retention'.",
    )
    from_date: str | None = Field(
        default=None, description="Only periods starting on or after this ISO date."
    )
    limit: int = Field(default=60, ge=1, le=500, description="Maximum values to return.")


@registry.register(
    "company_metrics",
    "Read precomputed monthly figures. Every value comes back with its unit, the "
    "formula that produced it and how many rows it was computed from. Use these "
    "figures exactly as given; do not recompute, convert or total them yourself. "
    "A metric that is absent was not computable for that period, which is not the "
    "same as zero.",
    CompanyMetricsParams,
    path="/api/v1/metrics",
)
def company_metrics(params: CompanyMetricsParams, ctx: ToolContext) -> dict:
    return ctx.platform.get(
        "/api/v1/metrics",
        {
            "company": params.company,
            "keys": params.keys,
            "from": params.from_date,
            "limit": params.limit,
        },
    )


class SearchDocumentsParams(BaseModel):
    query: str = Field(description="What to look for, in the words the document would use.")
    source_ref: str | None = Field(
        default=None,
        description=(
            "Restrict the search to one document, such as a contract reference. "
            "Contract clauses are worded almost identically across contracts, so "
            "similarity alone cannot tell you which contract is at issue. Identify "
            "the contract from the figures first, then search inside it."
        ),
    )
    limit: int = Field(default=5, ge=1, le=20, description="Maximum passages to return.")


@registry.register(
    "search_documents",
    "Search contracts, board minutes and support transcripts. Returns passages "
    "with a citation you must quote when you rely on one. If nothing relevant "
    "comes back, say so rather than answering from memory.",
    SearchDocumentsParams,
    path="/api/v1/retrieval/search",
)
def search_documents(params: SearchDocumentsParams, ctx: ToolContext) -> dict:
    return ctx.platform.post(
        "/api/v1/retrieval/search",
        {"query": params.query, "source_ref": params.source_ref, "limit": params.limit},
    )


class ListInitiativesParams(BaseModel):
    company: str | None = Field(default=None, description="Company slug.")
    status: str | None = Field(
        default=None, description="Filter by status, for example 'in_progress' or 'at_risk'."
    )


@registry.register(
    "list_initiatives",
    "Read the value creation plan. Each initiative carries the current value of "
    "the metric it claims to move, so its progress is checkable rather than "
    "asserted. A null progress means the metric has no computed value, not that "
    "nothing has happened.",
    ListInitiativesParams,
    path="/api/v1/initiatives",
)
def list_initiatives(params: ListInitiativesParams, ctx: ToolContext) -> dict:
    return ctx.platform.get(
        "/api/v1/initiatives", {"company": params.company, "status": params.status}
    )


class ContractBillingParams(BaseModel):
    company: str | None = Field(
        default=None, description="Company slug. Omit for the whole portfolio."
    )
    limit: int = Field(default=20, ge=1, le=50, description="Maximum findings to return.")


@registry.register(
    "contract_billing_reconciliation",
    "List contracts whose invoices disagree with their own terms. The comparison "
    "is already done: each finding states the shortfall in euro cents, the cause, "
    "and the invoices that evidence it. Use these figures as given and do not "
    "recompute them. To explain a finding, quote the clause that was breached by "
    "searching that contract with search_documents and its contract reference.",
    ContractBillingParams,
    path="/api/v1/reconciliation/contract_billing",
)
def contract_billing_reconciliation(params: ContractBillingParams, ctx: ToolContext) -> dict:
    return ctx.platform.get(
        "/api/v1/reconciliation/contract_billing",
        {"company": params.company, "limit": params.limit},
    )


class DetectionParams(BaseModel):
    company: str | None = Field(
        default=None, description="Company slug. Omit for the whole portfolio."
    )
    as_of: str | None = Field(
        default=None,
        description=(
            "ISO date to evaluate against, for example '2026-09-12'. Omit for today. "
            "State the date you were given; figures computed as of different days "
            "are not comparable."
        ),
    )
    limit: int = Field(default=25, ge=1, le=100, description="Maximum records to return.")


@registry.register(
    "crm_pipeline_hygiene",
    "List CRM records that contradict something else on the record: an account "
    "owned by someone who has left, an open opportunity whose close date has "
    "passed, two accounts for one customer, and a won deal worth something other "
    "than the contract it closed. Each finding carries the contradiction, so say "
    "what disagrees with what rather than that a record looks wrong.",
    DetectionParams,
    path="/api/v1/detections/crm_hygiene",
)
def crm_pipeline_hygiene(params: DetectionParams, ctx: ToolContext) -> dict:
    return ctx.platform.get(
        "/api/v1/detections/crm_hygiene",
        {"company": params.company, "as_of": params.as_of, "limit": params.limit},
    )


@registry.register(
    "onboarding_stalls",
    "List onboardings that have stopped moving, with the step each one is stuck "
    "at and how long it has been stuck. The response states the threshold that "
    "defines a stall; quote it when you quote the count. Name the blocking step: "
    "'stalled' is a status, 'stalled at identity integration for 62 days' is "
    "something someone can act on this afternoon.",
    DetectionParams,
    path="/api/v1/detections/onboarding_stalls",
)
def onboarding_stalls(params: DetectionParams, ctx: ToolContext) -> dict:
    return ctx.platform.get(
        "/api/v1/detections/onboarding_stalls",
        {"company": params.company, "as_of": params.as_of, "limit": params.limit},
    )


@registry.register(
    "churn_risk_ranking",
    "Rank accounts by churn risk, highest first, with the signals behind each "
    "score. This is a ranking and not a verdict: a score of 0.81 against a "
    "neighbour's 0.79 does not mean one account is leaving and the other is not. "
    "Report it as an ordered list to work through, never as a set of accounts "
    "that will churn, and give the signals rather than the score alone.",
    DetectionParams,
    path="/api/v1/detections/churn_risk",
)
def churn_risk_ranking(params: DetectionParams, ctx: ToolContext) -> dict:
    return ctx.platform.get(
        "/api/v1/detections/churn_risk",
        {"company": params.company, "as_of": params.as_of, "limit": params.limit},
    )
