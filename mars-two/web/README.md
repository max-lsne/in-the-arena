# web

The surface a group operator reads. React, TypeScript, Vite.

Built to `docs/design/brief.md`. The brief is the specification; this README
records what it cost to follow.

## What is built

The portfolio register and the ARR band. The agent artefact view and the error
analysis view from the brief are not built yet.

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

## A specificity trap worth knowing

`.register th` is a class plus an element and outranks the bare class
`.register__name`, so the name column silently rendered right-aligned with no
error anywhere. The fix is `th.register__name`, and a test asserts the selector
keeps its specificity.

## Running it

```bash
pnpm install
pnpm dev          # needs the platform on :3000 and VITE_MARS_TOKEN set
pnpm test
pnpm exec tsc --noEmit && pnpm lint
```

Mint a token with `bin/rails mars:users` in the platform. The token decides which
companies come back; there is no client-side filtering to get wrong.
