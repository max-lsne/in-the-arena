# Fulcrum

**Three small pages, made the same morning, for the one law that runs through the oldest
machine there is: a rigid bar turns about a single fixed point, and whatever it gives you
in force it takes back, exactly, in distance. The point is the fulcrum, and where it sits
among the bar's three places — the fulcrum, the load, and your effort — is the whole of
the machine. Put the fulcrum in the middle and a push down lifts a weight up. Put the load
in the middle and the weight is carried mostly for free. Put your effort in the middle and
you spend force to buy speed. Same bar, same law, three trades — and the one thing no lever
can ever do is make work out of nothing.**

Most days in this folder are one page. Some mornings the idea comes in threes. A *fulcrum*
is the pivot a lever turns about, and the humblest, oldest idea in all of mechanism: lay a
stick across a stone and you have multiplied your strength, or your speed, or your reach,
by nothing more than geometry. Everything a lever does, every lever there has ever been,
is read off the three points along the bar — where the pivot is, where the load is, where
you push — and the distances between them. Move the one point and you move between the
three classes, which are not three machines but one law wearing three faces.

## The three

- **[Pry](./pry/)** — *first class, the fulcrum in the middle.* A crowbar under a slab:
  push the long arm down and the short arm lifts the weight up — the one class that
  reverses a force. The advantage is the arm ratio, and it can be made large or small by
  where you set the stone. Too far from the load and it won't rise; too near and it lifts a
  hair.
  Set → push → lift → re-set. Too far → strains. Too near → nibbles.

- **[Barrow](./barrow/)** — *second class, the load in the middle.* A wheelbarrow: the load
  rides between the wheel and your hands, so the advantage is never below one — the one
  class that cannot work against you. You only choose where to load it. Too far back and the
  hands can't lift; too far forward and the barrow has nothing to steer by.
  Load → lift → wheel → roll. Too back → dead. Too forward → tips.

- **[Cast](./cast/)** — *third class, the effort in the middle.* A fishing rod: your hand
  drives between the pivot and the tip, so the advantage is always below one — a force
  penalty, on purpose, to buy the tip speed and reach. Drive near the pivot for a great whip
  you must be strong enough to swing; drive out at the tip and it does nothing.
  Drive → whip → fling → reach. Too near → stalls. Too far → labours.

## The one law

All three trades lean on the same fact about a rigid bar turning on a fulcrum, and each
reads it in its own coin. Call the perpendicular distance from the fulcrum out to your
effort the `effort arm`, and out to the load the `load arm`. Idealise the bar as rigid and
weightless and the pivot as frictionless, and the whole of it is three lines:

- **It balances by moments.** A lever is still when the turning each way is equal:
  `effort · effort arm = load · load arm`. A moment is a force times its arm, and the bar
  cares only about the product — a small force far out balances a large one close in. This
  is the law a steelyard weighs by and a seesaw sits level on.
- **Advantage is the arm ratio.** Push past balance and the force you deliver to the load is
  `MA = effort arm ⁄ load arm` times your effort. Which class you are in is set only by which
  point sits in the middle: fulcrum between gives an `MA` you choose; load between gives
  `MA > 1` always; effort between gives `MA < 1` always. The geometry is the machine.
- **Work is conserved — nothing is made.** The same ratio that multiplies force divides
  distance: the load moves `1 ⁄ MA` as far as your effort, so `effort · d_in = load · d_out`,
  always. A lever cannot create work; it can only spread a force thin over a long distance,
  or gather it into a short one. What you gain one way you pay the other, to the last
  foot-pound.

Two lessons live in those three lines, and every page is built to show them. The first is
that **force and distance are the same coin**: there is no lever that gives you more of both,
and the three classes are just the three ways to trade one for the other — buy force with
distance (pry, barrow) or buy distance and speed with force (cast). The second is that **the
best is rarely the most**: crowd a pry bar's fulcrum to the load for maximum force and you
lift a sliver; drive a rod hard to the pivot for maximum whip and you stall; the right
setting is the *least* advantage that does the job, or the *most* whip your strength can
carry — an optimum in the middle, never at the extreme.

It is the same discipline the [flywheel](../2026-09-25-flywheel/) knows about trading a
store against a swing, and the [governor](../2026-08-15-governor/) about a machine reading
its own speed to hold its own level — and the near-opposite of the [dashpot](../2026-09-28-dashpot/),
which spends a motion to end it rather than turning a force to multiply it. Find the three
points; read the arms between them; take force, or distance, but never both.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no
build and no network once it has loaded. Each carries the same interactive bench worked in
its own class: set the load and move the one point, and watch the arm ratio set the force,
the travel, and the trade — the slab heave or strain, the barrow carry or tip, the rod whip
or stall — against a gauge that reads the advantage and marks the setting that does the job.
Each keeps its state in `localStorage`, reads itself to a screen reader with a live status
line, holds still under `prefers-reduced-motion` (the mechanism shown at its settled place,
the full trade read at a glance), and works entirely from the keyboard. Open any `index.html`
in a browser.

*One of a series — a page a day, each built on one old working word and the discipline
hidden inside it. Some mornings, three. 2026-10-04. One fulcrum, three trades.*
