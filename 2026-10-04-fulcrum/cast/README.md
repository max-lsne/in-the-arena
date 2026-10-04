# Cast

**A fishing rod is the third class of lever, and the one that always costs you: your
effort goes in *between* the fulcrum and the load — nearer the pivot than the tip — so the
effort arm is the shorter, and the advantage is always less than one. You drive with more
force than the tip carries, every time. What you buy with that lost force is speed and
reach: the tip sweeps faster and farther than your hand, by exactly the ratio you gave up
in force. Drive the rod close to the pivot and the whip is tremendous — but so is the force
your wrist must find, and a heavy tip will stall it. Drive it out near the tip and the
force comes easy, but the lever does nothing for you. The whole skill of a cast is where
you drive it.**

Pin a rod at one end, hang the load at the other, and push somewhere in between, closer to
the pin than the load. Your hand sits on a short arm, the load on a long one, and the same
turn about the pivot carries the load through a wider sweep than your hand — because the
load is further out. That is the gift and the price in one: the tip goes faster and farther
than your hand, and to make it do so your hand must push harder than the tip resists. There
is no setting of a third-class lever that saves force; it was never built to. It is the
lever of the body — the forearm, with the biceps pulling in close to the elbow and the hand
far out, hauling many times the weight in the hand so the hand can move many times faster.
A nature that cared about force would have built us the other way; one that cared about
speed built the arm to spend force for it.

## The one relation, read three ways

Call the distance from the pivot to your driving hand the `effort arm` and the distance to
the tip the `load arm` — the longer one, now. Take the tip's load `W`:

- **The advantage is the arm ratio, and never above one.** `MA = effort arm ⁄ load arm < 1`.
  Your hand is always nearer the pivot than the tip, so it sits on the shorter arm — a force
  *dis*advantage, by design.
- **Force is divided by it — so you give more.** The force your wrist must drive is `W ⁄ MA`,
  always greater than `W`. Drive closer to the pivot and `MA` falls and the force climbs; past
  your wrist's strength it simply stalls.
- **Speed and reach are multiplied by it.** The tip moves `1 ⁄ MA` times as fast and as far as
  your hand. That inverse ratio is the whole purchase: the number that costs you force buys
  you tip speed, one for one. Work is conserved — your big force over a small sweep equals the
  tip's small force over a big one.

Those three are one fact, and it runs the opposite way to the barrow's. No drive gains you
force; one drive gains you nothing. Push near the tip and the arms even up, `MA → 1`, the
force comes easy and the tip no longer outruns your hand — a lever used as a stick. The point
of the third class is the whip, and the whip lives near the pivot, right up against the force
your wrist can give. Too near and it stalls; too far and it labours; and the best is not the
easiest, it is the hardest your wrist can hold.

## The bench

A rod pivoted at the butt, a **load** at the tip, your **drive** somewhere along it. Set how
much the tip **carries** and where you **drive** the rod. The drive sets the arm ratio, and
the ratio costs you force to buy tip speed: drive near the pivot for a great whip, but find
the force to swing it or it stalls; drive out near the tip and the force is easy but the whip
is gone. The panel reads the whip (tip speed against the hand's), the wrist drive against what
the wrist can give, the force cost, the tip's reach against the hand's stroke, the arm ratio,
and the most whip this load allows before it stalls. Two speed arrows show the purchase — a
short one at the hand, a long one at the tip. Work bars show the trade reversed: big force
and small sweep in, small force and big sweep out, equal areas all the same. A gauge sets the
whip against the stall ceiling. Press *Find the whip* to drive it as near the pivot as your
wrist will carry.

The tip load and the drive are kept in `localStorage`, so a reader finds the bench as they
left it. A live status line (`aria-live`) reads each cast to a screen reader — the tip load,
the drive, the advantage, the whip, the wrist force, and whether it whips, loafs easy, labours
flat, or stalls — debounced past slider drags. Under `prefers-reduced-motion` the cast is not
animated: the rod is shown at the end of its sweep with the speed arrows marked, each state
read as a settled arrangement rather than a running flick; a live change to the setting is
honoured. The whole bench works from the keyboard — <kbd>W</kbd> finds the whip, <kbd>R</kbd>
resets, <kbd>[</kbd>/<kbd>]</kbd> drive out to the tip or in to the butt, <kbd>−</kbd>/<kbd>=</kbd>
lighten and load the tip, and <kbd>space</kbd> casts again.

One HTML file, one stylesheet, one script. No build, no network once it has loaded. The rod is
idealised as rigid and weightless and the butt as a frictionless pivot, but the arithmetic is
exact: the force you drive is `W · (load arm ⁄ effort arm)`, the tip's speed and reach are your
hand's times that same ratio, and the two meet in one conserved product, `(W ⁄ MA) · d =
W · (d ⁄ MA)`.

*One of three classes for a single old working word — see [the three](../). 2026-10-04.*
