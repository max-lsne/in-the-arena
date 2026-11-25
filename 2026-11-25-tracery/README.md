# Tracery

**Three small pages, made the same morning, for one figure: the curve a point writes when it is pulled
two ways at once. Drive a pen side to side with one plain oscillation and up and down with another, and
the path it traces is a *Lissajous figure* — a braid, a bow, a rosette — whose whole shape is carried by
two numbers: the ratio of the two frequencies and the phase between them. When the ratio is a ratio of
whole numbers the figure closes and stands still; nudge it off and the figure turns. The same curve can
be drawn three ways: as pure mathematics, two sines at right angles; as a *pendulum*, a bob on a forked
string that keeps two periods at once and writes the figure in sand; and as a *machine*, two damped
pendulums that let the figure die as they draw, spiralling it inward into a nested rosette. One figure,
met as an equation, a toy, and an instrument.**

Most days in this folder are one page. Some mornings the idea arrives already in threes — and the
Lissajous figure is a clean case of it, because the *same curve* shows three faces depending on what you
make it out of. The equation is always

```
x = A·sin(a·t + δ),   y = B·sin(b·t)
```

two perpendicular oscillations sharing one clock. What changes between the three pages is not the curve
but the body it is given: a pair of ideal sines, a swinging weight, or a drawing engine running down.

## The three

- **[Figure](./figure/)** — *the ideal.* Two pure sines set at right angles. The shape depends on
  almost nothing — only the **ratio** `a:b` and the **phase** `δ`. A whole-number ratio closes the curve
  into a standing figure: 1:1 an ellipse that opens and shuts with the phase, 2:3 a trefoil, 3:4 a woven
  braid. The curve kisses a side edge `a` times and a top edge `b` times, so **counting edge-touches
  reads the ratio off the drawing** — the method an oscilloscope uses to compare an unknown frequency
  against a known one: tune until the figure stands still. Detune it and the figure precesses.
  Set the two frequencies and the phase → watch the pen draw the standing curve.

- **[Blackburn](./blackburn/)** — *the pendulum that draws it.* Hang a bob on a **forked** string: in
  the plane of the fork the whole length swings (long, slow); across it only the stub below the knot
  swings (short, fast). Two lengths, two periods, and the bob traces the figure under gravity alone —
  drawn in a leaking tray of sand. The period ratio is `√(L_long/L_short)`, a **square root**, so the
  clean figures want **square-number** length ratios: 4:1 in length is 2:1 in period, 9:4 is 3:2. Off a
  square ratio the periods will not keep step and the figure precesses — drift written in sand.
  Set the two lengths → release the bob → watch the figure draw, and go off-tune to watch it turn.

- **[Harmonograph](./harmonograph/)** — *the figure dying.* Give the two oscillations **friction**. An
  exponential envelope `e^(−d·t)` shrinks the swing a fixed fraction a beat, so the closed curve never
  closes: each loop returns a little nearer the centre and the figure **spirals inward**, loop within
  loop, winding to rest. Lower the decay for a denser rosette; detune the frequencies and the nested
  loops also **rotate**, into a wreath. It is the Victorian drawing machine — two pendulums and a
  gimballed pen — that made by gravity the engine-turned curves a *guilloché* lathe cuts by gear.
  Set the frequencies, phase and decay → press draw → watch a single release spiral into a nested figure.

## The one figure

Everything here is `x = sin(a·t + δ)`, `y = sin(b·t)` — two perpendicular oscillations — asked what kind
of body it has.

- Given **two ideal sines**, it is a standing figure whose shape is the ratio `a:b` and the phase `δ`,
  closed when the ratio is rational, precessing when it is not. ([figure](./figure/))
- Given a **forked pendulum**, the ratio is set physically by two lengths through a square root, and the
  figure is drawn by a weight in sand — closed when the lengths are square-tuned, drifting when not.
  ([blackburn](./blackburn/))
- Given a **damped drawing machine**, the figure loses amplitude as it is drawn, so instead of repeating
  it accumulates: a nested rosette that is the record of one swing spending itself. ([harmonograph](./harmonograph/))

One equation; three bodies. The figure is not three curves that resemble each other — it is the one
Lissajous curve, met as mathematics, as a toy, and as an instrument.

## What the figure is *not*

A Lissajous figure is a curve a point writes because it is **pulled two independent ways at once** —
nothing couples the two drives but the clock they share. That makes it kin to, but not the same as, the
curves nearby in this folder. A **[cycloid](../2026-11-22-cycloid/)** is written by a point that
*rolls*: one constraint, a wheel on a line, not two oscillations crossed. A
**[linkage](../2026-11-24-linkage/)**'s coupler point is *forced* along its path by rigid bars — a curve
imposed by closure, where the Lissajous is a curve two free motions happen to braid. The vertical drive
alone, `sin(b·t)`, is the plain stroke a **[swash](../2026-11-18-swash/stroke/)** plate or a
**[crank](../2026-11-15-crank/)** makes; the figure is what you get by reading two such strokes *at right
angles*. And where an **[escapement](../2026-07-30-escapement/)** fights a pendulum's decay to hold a
clock even, the **[harmonograph](./harmonograph/)** welcomes the decay and draws with it — the same dying
swing, kept out of one machine and spent into another.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each works the one figure in its own body: the ideal sines and their
standing curve, the forked pendulum and its sand tray, the damped machine and its spiralling rosette.
Each computes its curve honestly every frame — true closure for the ideal figure, real periods
`T = 2π√(L/g)` for the pendulum, a real exponential envelope for the harmonograph — and names the ratio
it finds. Each keeps its settings in `localStorage`, reads itself to a screen reader through a live
status line, holds still under `prefers-reduced-motion` (the figure shown drawn whole, the pen at rest),
and works from the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it.
Some mornings, three. 2026-11-25. A point pulled two ways at once, and the figure it is made to write.*
