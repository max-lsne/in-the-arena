# web

The surface a group operator reads. React, TypeScript, Vite.

Built to `docs/design/brief.md`. The brief is the specification; this README
records what it cost to follow.

## What is built

All three views in the brief: the portfolio register with the ARR band, the
agent artefact view, and the error analysis view. The artefact view shows the
deterministic half of the reconciliation agent, which is every figure on it; the
narrative half arrives when the agents do.

Routing is the URL hash and twenty lines, no dependency. A selected company and
an open artefact are both things an operator sends to someone else, and held in
component state they are not addressable.

## Tradeoff taken

The register is a real HTML table, not a grid of cards.

Cards are easier to make responsive and easier to make attractive in a
screenshot. They are also the reason a portfolio dashboard cannot be read:
values in separate cards are not on a common axis, so comparing eight companies
on one metric means eight separate acts of reading. A table puts them in a
column. The cost is a harder narrow-screen story, which is paid with row labels
that reappear under 720px.

## Rules that are enforced rather than intended

**Colour says better or worse, never higher or lower.** Every column declares
which direction is good. Without that, 180 open tickets renders green for being
above its band, which is a confident wrong signal and worse than no signal.
Three tests cover it.

**Units are read, never inferred.** The platform ships a unit with every figure
so nothing downstream has to guess, and a display that guessed would undo that at
the last step. An unrecognised unit renders the raw value. Pipeline coverage is a
`multiple` and renders `3.7x`; retention is a `ratio` and renders `102.8%`.
Rendering coverage as `370.8%` was the first version.

**Absence is not zero.** A metric the platform could not compute renders as a
dash. `Number("")` is `0`, so an empty string would have rendered as €0; there is
a test for exactly that string.

**Company order is fixed.** An operator learns where Meterpath sits and stops
reading names. Sorting by a metric would move rows under the cursor on every
refresh.

**Evidence is a column, not a disclosure.** An artefact whose evidence is hidden
gets trusted without being checked, so the clause and the invoices sit beside the
figures. When retrieval finds no clause, the column says so; an empty evidence
column reads as "no evidence needed".

**A ranking's unplanted rows are not failures.** The error analysis view sorts
failures to the top. Scoring an unplanted account at rank seven as a false
positive put forty non-failures above the real ones, in the one view that exists
to surface the real ones. They are `unplanted` now, and they carry no colour.

**A clean ledger says so.** A reader who has to scan 163 rows to conclude that
none of them is wrong will not conclude it.

## A specificity trap worth knowing

`.register th` is a class plus an element and outranks the bare class
`.register__name`, so the name column silently rendered right-aligned with no
error anywhere. The fix is `th.register__name`, and a test asserts the selector
keeps its specificity.

## Known limitation

Archivo loads from Google Fonts at runtime. Where that is blocked the whole type
system falls back, and width-axis hierarchy is the first thing lost. Self-hosting
the variable font is the fix and is not done.

## Running it

```bash
pnpm install
pnpm dev          # needs the platform on :3000 and VITE_MARS_TOKEN set
pnpm test
pnpm exec tsc --noEmit && pnpm lint
```

Mint a token with `bin/rails mars:users` in the platform. The token decides which
companies come back; there is no client-side filtering to get wrong.
