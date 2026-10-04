# Pry

**A pry bar is the first class of lever, and the only one that turns a force around: the
fulcrum sits between your hands and the load, so bearing *down* on the long arm lifts the
weight *up* on the short one. All of its advantage is geometry — the ratio of the arms
about the fulcrum. Slide the fulcrum toward the slab and the ratio climbs: you can lift
far more than you weigh, but the slab rises only a hair for a long push. Slide it toward
your hands and the slab moves freely, but now you cannot shift it at all. The whole skill
of prying is where you set the stone.**

Lay a bar across a fulcrum and it can do only one thing — turn about that point. Push one
end down through a small arc and the other sweeps up through the same angle, but the ends
travel different distances, because one sits further out. That difference is the machine.
The end that moves *further* is the end that is *easier* to move; the end that moves
*less* moves with *more force*. A lever does not make work; it spreads a force over a
longer distance or gathers it into a shorter one, and what you gain in force you pay for,
exactly, in travel. Because the fulcrum is *between* the hands and the load, the two ends
go opposite ways — your hands down, the load up. That reversal is the signature of the
first class.

## The one relation, read three ways

Call the distance from the fulcrum to your hands the `effort arm` and the distance to the
load the `load arm`. Take the effort you can bear down, `E`, and the slab's weight, `W`.
Idealise the bar as rigid and weightless and the pivot as frictionless:

- **The advantage is the arm ratio.** `MA = effort arm ⁄ load arm`. Set your hands three
  times as far out as the load and you push with a third of the weight — the geometry
  multiplies your force by three and asks nothing else.
- **Force is multiplied by it.** The force delivered to the slab is `E · MA`, and it lifts
  when that reaches the weight: `E · MA ≥ W`. The least advantage that raises the slab is
  fixed — `MA = W ⁄ E` — and everything above it is margin.
- **Travel is divided by it.** The same ratio that multiplies force divides distance: the
  slab rises `d ⁄ MA` for a hand-push of `d`. Work is conserved, `E · d = W · (d ⁄ MA)`, so
  a huge advantage buys a tiny lift, and you re-set and pry again, and again.

Those three are one fact. The arm ratio you set is the force you gain and the travel you
lose, in the same breath — there is no dial for force alone. So the right place for the
fulcrum is not as close to the load as it will go. It is the *furthest* point from the
load that still lifts: the least advantage that does the job, bought back as the longest
stroke. Too far and it strains; too near and it nibbles; and the best is rarely the most.

## The bench

A bar across a fulcrum, a heavy **slab** on the short arm, your **heave** on the long one.
Set how much the slab **weighs** and where the **fulcrum** sits. The arm ratio sets the
force the bar delivers and the stroke the slab lifts through: too far from the slab and
the bar strains and will not raise it; too near and it lifts a hair and asks to be re-set;
between is the placement that heaves it clean. The panel reads the advantage against the
ratio this slab needs, the force delivered against the weight, the lift per heave against
the hand's stroke, the arm ratio, the reversed direction, and the furthest placement that
still lifts. A pair of work bars shows the trade — force times distance in equals force
times distance out, equal areas always. A gauge sets the advantage against the `1×` even
mark and the `need` line. Press *Set the stone* to place the fulcrum at the furthest point
that lifts — the least advantage, the longest stroke.

The slab and the fulcrum are kept in `localStorage`, so a reader finds the bench as they
left it. A live status line (`aria-live`) reads each arrangement to a screen reader — the
slab, the fulcrum, the advantage, the force delivered, the lift, and whether it heaves,
nibbles, or strains — debounced past slider drags. Under `prefers-reduced-motion` the heave
is not animated: the lever is shown at its lifted position, each state read as a settled
arrangement rather than a running stroke; a live change to the setting is honoured. The
whole bench works from the keyboard — <kbd>S</kbd> sets the stone, <kbd>R</kbd> resets,
<kbd>[</kbd>/<kbd>]</kbd> move the fulcrum toward the hands or the slab,
<kbd>−</kbd>/<kbd>=</kbd> lighten and load the slab, and <kbd>space</kbd> heaves again.

One HTML file, one stylesheet, one script. No build, no network once it has loaded. The
bar is idealised as rigid and weightless and the pivot as frictionless, but the arithmetic
is exact: the force delivered is `E · (effort arm ⁄ load arm)`, the lift is the hand travel
divided by that same ratio, and the two multiply to one conserved product, `E · d_in =
W · d_out`.

*One of three classes for a single old working word — see [the three](../). 2026-10-04.*
