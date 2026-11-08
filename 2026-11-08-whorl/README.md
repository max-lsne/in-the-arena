# Whorl

**Three small pages, made the same morning, for the one shape that turns a round into a
rise: the helix — an inclined plane wound round and round a cylinder, so a long gentle slope
is packed into a short turning post. A ramp you could not climb in a room becomes a thread
you hold in your hand. Hold one part of it still and the slope pays out its trade three ways.
Hold the nut and the bolt walks up its own thread into a clamp — a turn becomes a squeeze.
Hold the casing and the screw carries water up the slope in trapped pockets — a turn becomes
a rise. Hold nothing, and the auger bites the wood and hauls itself in — a turn becomes a
pull. One ramp, wound three ways; and all three are read off the same two numbers — the
*pitch* against the *round*, which sets the slope, and the *friction*, which decides whether
the slope holds what it gains or lets it slide back.**

Most days in this folder are one page. Some mornings the idea arrives already in threes. A
*whorl* is a single turn of a spiral — one coil of a snail's shell, one loop of a fingerprint,
one wrap of thread round a spindle. Unwind that one coil and flatten it and you have a plain
triangle: a base as long as the way round the cylinder, a rise as tall as the thread's step.
That triangle is an **inclined plane**, the second-oldest machine there is, and the screw is
nothing but an inclined plane that someone wrapped round a post so it never runs out. The
[wedge](../2026-10-15-wedge/) was the inclined plane set moving through the work; the screw is
the inclined plane set *spinning in place*, trading a long, easy turn for a short, strong step.

## The three

- **[Thread](./thread/)** — *hold the nut: a turn becomes a squeeze.* A bolt walks up its own
  thread into whatever it bears on, and stays there. The advantage is the slope — how far the
  thread travels round for each step along — and the whole of why a bolt does not shake loose
  is that its slope is *gentler than friction can hold*. Steepen the thread past that and it
  backs out on its own.
  Set the pitch → read the lead angle against the friction angle → tighten → it holds, or it
  walks back out.

- **[Raise](./raise/)** — *hold the casing: a turn becomes a rise.* The screw of Archimedes,
  tilted in a river: each coil of the thread is a pocket, and turning the screw carries each
  pocketful of water up one step per turn. Lay it too flat and it lifts almost nothing per
  turn; stand it too steep and the pockets tip their water back down the slope. The water
  climbs best at a tilt in the middle.
  Set the tilt → watch the pockets fill, carry, and — too steep — spill → find the tilt that
  delivers the most.

- **[Bite](./bite/)** — *hold nothing: a turn becomes a pull.* A gimlet, an auger, a wood
  screw: the lead thread catches the wood and draws the whole tool *into* it, one pitch per
  turn, however hard or soft your push. A nail you must beat in with a force that climbs with
  every inch; a screw sets its own feed by its slope and asks only that you turn it. Too fine
  a thread skates on hard grain; too coarse a one wedges and splits it.
  Set the pitch and the wood → read the feed per turn and the splitting force → feed, skate,
  or split.

## The one shape

All three lean on the same fact about a helix, and each spends it in its own coin. Take the
thread's **pitch** `p` — the step it climbs in one full turn — and the **circumference**
`2πr` it travels to get there. Unwind one coil and those are the two sides of a right
triangle; the angle between the slope and the round is the **lead angle** `λ`, and it is the
whole of the machine:

- **The slope is the trade.** `tan λ = p ⁄ 2πr`. A fine thread (small `p`) is a shallow slope:
  a long way round for a short step up, which multiplies your turning force into a large push
  along the axis — ideally `2πr ⁄ p` times over. A coarse thread is a steep slope: a short way
  round for a tall step, less force but faster travel. Force and distance are the same coin
  here as on any ramp; the pitch is the only dial, and it buys one by spending the other.
- **Friction decides whether it holds.** Give the slope a friction angle `φ`, where
  `tan φ = μ`. A load on the thread sits still — the screw is **self-locking** — exactly when
  the slope is gentler than friction can grip: `λ < φ`. This one line is why a bolt stays
  tight, why a jack holds its car up with no pawl, why a vice does not unwind under its own
  squeeze. Steepen past `φ` and the load slides the thread back; the screw becomes a thing
  that must be *held*, not merely set.
- **A turn is a step, always.** However it is used, one full turn moves the thread exactly one
  pitch along its axis — no more, no less. The bolt advances a pitch into its clamp; the auger
  draws a pitch into the wood; the water screw lifts each pocket a pitch along, and `p · sin θ`
  straight up. The round is spent; the step is banked. That fixed, unbribable step — set by
  the pitch and nothing else — is what makes a screw the most patient and exact machine in the
  box: you cannot push it past its pitch, and it will not fall short of it.

Two lessons live in those three lines. The first is the ramp's old lesson worn smooth by a
thousand turns: **force and distance are one coin.** A fine thread is all force and no speed, a
coarse one all speed and little force, and there is no thread that gives you both — only the
pitch that fits the job. The second is the one these pages keep finding: **the best is rarely
the most.** The steepest water screw lifts the highest per turn but carries no water; the
coarsest wood screw bites deepest but splits the board; the finest bolt grips hardest but takes
forever to run down. In every one the right setting is an optimum in the middle — the gentlest
slope that still does the work, the steepest tilt the pockets still hold, the coarsest bite the
grain still takes.

It is the same trade the [wedge](../2026-10-15-wedge/) drives straight and the
[fulcrum](../2026-10-04-fulcrum/) turns about a point — force bought with distance, nothing made
from nothing — and the same self-holding the [tumbler](../2026-10-30-tumbler/) leans on, a load
that stays put because the geometry is gentler than friction can be overcome. Unwind the coil;
read the triangle; take force or take speed, and let friction tell you whether it holds.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no
build and no network once it has loaded. Each carries the same helix worked in its own trade:
set the pitch and the slope, turn the screw, and watch the lead angle set the force, the step,
and the trade — the bolt hold or back out, the pockets carry or spill, the auger feed or split
— against a gauge that reads the slope, the friction, and the one setting that does the job.
Each keeps its state in `localStorage`, reads itself to a screen reader with a live status
line, holds still under `prefers-reduced-motion` (the mechanism shown at its settled place, the
whole trade read at a glance), and works from the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden
inside it. Some mornings, three. 2026-11-08. One ramp, wound three ways.*
