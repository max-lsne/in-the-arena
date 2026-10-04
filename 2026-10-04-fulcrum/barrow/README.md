# Barrow

**A wheelbarrow is the second class of lever, and the one that can never work against you:
the load rides *between* the fulcrum — the wheel — and your hands, so the effort arm is
always longer than the load arm, and the advantage is never less than one. You do not
choose whether it helps; it always helps. What you choose is where the load sits. Pile it
back by the handles and your hands bear nearly all of it and cannot lift. Pile it forward
over the wheel and your hands bear almost nothing — but a barrow with no weight on the
handles has nothing to steer by, and tips on its nose. The whole skill of a barrow is the
one thing the class leaves you to get wrong.**

Lift the handles of a loaded barrow and you take over the leg's job, but not the wheel's.
The weight is now shared between two supports — the wheel at the front, your hands at the
back — and it shares in proportion to where the load sits between them. Close to the
wheel, the wheel takes the lion's share; close to the hands, you do. Because the load is
always *between* the two, your hands never carry the whole of it. That is the gift of the
second class — the fulcrum is always on the far side of the load from you, so some of
every load is carried for free. The same arrangement is a nutcracker, a bottle opener, a
pair of clippers: a load pinned between a hinge and a hand, and the hand wins.

## The one relation, read three ways

Call the distance from the wheel back to your hands the `effort arm` — fixed, the length
of the barrow — and the distance from the wheel out to the load the `load arm`, where you
choose to pile it. Take the load's weight `W`:

- **The advantage is the arm ratio, and never below one.** `MA = effort arm ⁄ load arm`.
  The load sits between the wheel and the hands, so the load arm is always the shorter and
  `MA ≥ 1` — the only class for which that is guaranteed.
- **Your hands bear the load divided by it.** The hands carry `W ⁄ MA`, the wheel the rest.
  Slide the load toward the wheel and `MA` climbs and your share falls toward nothing;
  slide it to the handles and `MA → 1` and you carry it all.
- **Travel is divided by it, too.** Lift the handles a distance `d` and the load rises only
  `d ⁄ MA`. Work is conserved, `(W ⁄ MA) · d = W · (d ⁄ MA)` — the force you save is the
  distance you spend, to the inch.

Those three are one fact, and they hand you a trap the first class never does. No placement
fails to help — but two fail the *barrow*. Load it back and your share rises until you
cannot lift; load it hard forward and your share falls until the handles float and there is
nothing to steer or balance by, and it pitches on its nose. The advantage is free; the
control is not. The right place is between — the wheel bearing the weight, the hands
keeping the reins.

## The bench

A barrow on its wheel, a **load** in the tray, your **hands** at the handles. Set how much
the load **weighs** and how far **forward** it sits between the wheel and the hands. The
place sets the arm ratio, and the ratio splits the weight between the wheel and your hands:
load it back and the hands bear too much to lift; load it hard forward and they bear too
little to steer, and the barrow tips. The panel reads the advantage (always above one), the
share on the hands against the lift limit, the share carried free by the wheel, the load's
rise against the hands' travel, the arm ratio, and the fair placement. Work bars show the
trade — the hands move far, the load little, equal work either way. A gauge sets the weight
on the hands against the lift ceiling and the steering floor. Press *Set the load* to place
it where the hands keep a fair, liftable share.

The load and its place are kept in `localStorage`, so a reader finds the bench as they left
it. A live status line (`aria-live`) reads each arrangement to a screen reader — the load,
its place, the advantage, the share on the wheel and the hands, and whether it carries fair,
light, loaded, tips, or sits dead — debounced past slider drags. Under
`prefers-reduced-motion` the lift is not animated: the barrow is shown at rest with the
shares marked, each state read as a settled arrangement rather than a running lift; a live
change to the setting is honoured. The whole bench works from the keyboard — <kbd>S</kbd>
sets the load, <kbd>R</kbd> resets, <kbd>[</kbd>/<kbd>]</kbd> shift the load back or forward,
<kbd>−</kbd>/<kbd>=</kbd> lighten and load it, and <kbd>space</kbd> lifts again.

One HTML file, one stylesheet, one script. No build, no network once it has loaded. The
barrow is idealised as rigid and weightless and the wheel as frictionless, but the arithmetic
is exact: the hands bear `W · (load arm ⁄ effort arm)`, the wheel bears the rest, and the hand
travel times the hands' share equals the load's weight times its rise.

*One of three classes for a single old working word — see [the three](../). 2026-10-04.*
