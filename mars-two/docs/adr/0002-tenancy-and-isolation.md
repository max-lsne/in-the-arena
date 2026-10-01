# 0002. Shared schema with Postgres row-level security

Status: accepted
Date: 2026-09-12

## Context

Eight portfolio companies share one platform. Three kinds of user read from it:

- A group operator at the holding company, who sees all eight and whose entire job is
  cross-portfolio comparison.
- A portfolio company executive, who sees their own company and must never see another.
- A forward-deployed engineer, who sees an assigned subset.

A leak here is the worst failure this system can have. Two acquired competitors in
adjacent markets seeing each other's churn numbers is a commercial incident, not a bug
report. Agents make this sharper: an agent reads documents written by customers and
tickets written by strangers, so untrusted text reaches a model that then decides which
tools to call. Prompt injection aimed at cross-tenant reads is the threat to design
against.

## Decision

One schema. Every tenant-scoped table carries `company_id`. Postgres row-level security
policies filter on a session variable, `mars.company_ids`, set per request from the
authenticated user's grant.

The policy is the boundary. Application-level scoping exists as well, and is defence in
depth rather than the mechanism.

`intelligence` holds no database credentials. It reads through `platform`'s API, so an
agent's effective permissions are its caller's permissions, enforced one layer below
anything a model can influence.

## Alternatives considered

**Schema per tenant.** Stronger isolation, and the conventional answer for exactly this
risk. Rejected because cross-portfolio comparison is a first-class feature here, not an
edge case, and it degrades into eight-way UNION queries across eight schemas. The group
operator persona would become the awkward one, when it is the primary one.

**Database per tenant.** Strongest isolation. Rejected for the same reason, more so,
plus eight-way migration drift.

**Application-level scoping only.** What most teams ship. Rejected because it fails
open: a developer who forgets a `where` clause creates a silent leak that no test
catches unless someone thought to write it. RLS fails closed, which is the property
worth paying for.

## Consequences

Every connection must set `mars.company_ids` before any query, and a connection that
does not set it sees nothing. Connection pooling and background jobs both have to
respect this, which is a real operational cost and a common source of subtle bugs.

Migrations must remember to enable RLS on new tenant-scoped tables. A table added
without a policy is readable across tenants. This is the single most likely way this
design gets broken, so there is a spec that enumerates tenant-scoped tables from the
schema and asserts each one has RLS enabled and forced. A new table without a policy
fails CI.

Isolation is tested by attempting to break it. The suite authenticates as a portfolio
company executive and attempts direct reads of another company's rows through every
model and every endpoint, asserting each returns empty or 403. A gate that is never
attacked is not known to work, so these tests attack it.

Superuser Postgres roles bypass RLS. The application connects as a non-superuser role
with `FORCE ROW LEVEL SECURITY` set on every policied table, so even the table owner is
filtered.
