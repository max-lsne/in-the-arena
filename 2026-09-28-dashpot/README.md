# Dashpot

**Three small pages, made the same morning, for the one law that runs through three
trades: a thing on a spring will swing to where it is going and then swing straight past,
because at the mark it is moving fastest and cannot stop on a coin. Add a dashpot — a
piston in oil that resists in proportion to speed — and the overshoot is met and spent to
heat, so the thing arrives once and is still. A door lands at its latch, a car settles
after a bump, a needle stops on its reading — and the same little oil-filled cylinder,
the dashpot, does it in every one. Too little and it rings; too much and it crawls; and
the best is never the most.**

Most days in this folder are one page. Some mornings the idea comes in threes. A *dashpot*
is the humblest part of a controlled motion and the one that decides its manners: a piston
forced through a cylinder of oil, resisting hard when shoved fast and barely at all when
eased. It holds nothing in place — it has no opinion about *where* a thing is, only about
*how fast* it is moving — and everything it takes from a motion it turns to heat and never
gives back. That one property, resistance to speed, is what turns a spring's endless
overshoot into a single clean arrival, and it shows up, unchanged, at the head of a door,
across a car's spring, and behind the dial of an instrument.

## The three

- **[Closer](./closer/)** — *arrive.* You cannot let a sprung door shut itself, or it
  bangs the frame and rebounds. A page for the leaf **landed** at its latch: a spring for
  the will to close, a dashpot for the manners, and the one setting between a slam and a
  door hung ajar where it comes home clean.
  Release → swing → check → latch. Too light → slam. Too heavy → hang.

- **[Absorber](./absorber/)** — *settle.* A spring gives a bump straight back, so a car on
  springs alone pogos down the road. A page for the body **settled** after a bump: the
  dashpot across the spring, taking the bounce out in one motion, between a float that
  loses grip and a harshness that lets the road through.
  Bump → bob → damp → level. Too soft → float. Too stiff → harsh.

- **[Deadbeat](./deadbeat/)** — *read.* A raw needle swings past its mark and hunts about
  the true value, unreadable. A page for the reading **landed** once: a hairspring to
  swing, a dashpot to stop, and the deadbeat setting between a hunt you cannot read and a
  crawl that comes too late.
  Current → swing → damp → mark. Too little → hunt. Too much → crawl.

## The one law

All three trades lean on the same fact about a mass on a spring met by a dashpot, and each
reads it in its own coin. Take the thing's inertia `m`, the spring `k` that wants it home,
and the dashpot `c` that resists its speed. Idealise the pivot or slide as frictionless
and the whole of it is three lines:

- **It has a natural swing.** `ωn = √(k ⁄ m)` — the rate the spring and inertia alone would
  oscillate, undamped. A stiffer spring or a lighter mass swings faster; this is the clock
  every arrival is measured against, and the frequency the dashpot has to tame.
- **Damping is the one dial.** `ζ = c ⁄ (2·√(k·m))` — the dashpot measured against that
  swing. Below one it **rings**: it overshoots the mark and comes back, again and again.
  Above one it **crawls**: it creeps home with no overshoot but takes its time. At exactly
  one — **critical** — it arrives in the least time with no overshoot at all. Every trade
  is trying to sit at, or just under, one.
- **The dashpot stores nothing.** Whatever it takes from the motion leaves as heat,
  `P = c·v²`, and never comes back. A spring remembers; a dashpot forgets. That is why it
  can only ever *end* a motion, never start or hold one, and why its single product is the
  death of a swing.

Two lessons live in those three lines, and every page is built to show them. The **best is
the least, not the most**: overshoot is a failure, but so is a crawl, and piling on
damping past critical does not make the arrival cleaner — it only makes it late. There is
one right amount, `ζ = 1`, and it is a floor on speed as much as a ceiling on overshoot.
And the deepest reading is the thermodynamic one: a dashpot is the one part here that is
honestly *irreversible* — a spring or a flywheel banks energy and returns it, but a
dashpot only ever converts, motion to heat, and that one-wayness is exactly what buys the
stillness. You do not get a clean arrival for free; you get it by spending the swing, and
paying for the spend in heat.

It is the same discipline the [flywheel](../2026-09-25-flywheel/) knows about storing a
motion to steady it — a dashpot is its opposite number, the part that *spends* a motion to
end it — and the [governor](../2026-08-15-governor/) about a machine kept to its own level.
Meet the motion; take just enough; let the rest go to heat.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no
build and no network once it has loaded. Each carries the same interactive bench worked in
its own trade: set the spring or the load, set the dashpot, and watch a time trace show
the thing arrive — overshoot and ring, land clean, or crawl and never quite get there —
against a gauge that sets the damping ratio against `ζ = 1`. Each keeps its state in
`localStorage`, reads itself to a screen reader with a live status line, holds still under
`prefers-reduced-motion` (the full trace shown at once, the mechanism at its settled
place), and works entirely from the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline
hidden inside it. Some mornings, three. 2026-09-28. One dashpot, three arrivals.*
