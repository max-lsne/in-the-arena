# Tumbler

**A pin-tumbler lock keeps one secret, and it is a plane. Inside is a row of spring-loaded
pin stacks dropped through a plug that turns inside a fixed shell; each stack is split into a
key pin below and a driver pin above, and at rest the springs push every split below the
shear line — the seam where plug meets shell — so every driver bridges that seam and jams the
plug fast. Lift each stack until its split rises to the shear line and nothing crosses the
seam: the plug is free to turn. The key does this to all the stacks at once, its cuts a
frozen cast of how far each must rise. A pick cannot lift them all together, and need not,
because no lock is machined perfectly true: give the plug a little torque and it binds on the
one stack whose chamber sits furthest off-line, set that pin, and the torque passes to the
next — one at a time, in the order the tolerance dictates. The flaw is the whole method. A
lock cut with zero tolerance has no binding order, and the pick has nothing to climb; it opens
only to its key.**

A *tumbler* is any little gate inside a lock that must be lifted to exactly the right height
before the bolt will move — a pin, a lever, a disc. In the pin-tumbler lock, the kind on most
doors, the tumblers are stacked pins, and the whole machine reduces to one line and the many
places it can be missed.

## The one plane, read a few ways

Take `n` stacks, each needing its own lift `Lᵢ` to bring its break to the shear line; the
torque you put on the plug to turn it; and the one figure the catalogue never prints — the
*tolerance*, the few thousandths by which the real chambers fail to line up true.

- **Opening is one equation, solved for every pin.** The plug turns exactly when *every*
  break is at the shear line at the same moment — `Lᵢ` met for all `i`. Not most; all. One
  stack short and the plug is as locked as if none had moved.
- **The key solves it by geometry, all at once.** A correct key carries every `Lᵢ` cut into
  its edge, so seating it raises all the stacks to the line in one stroke. This is why a key
  feels like nothing: it is not fighting the lock, it is satisfying it everywhere at once.
- **A pick solves it one pin at a time — on the lock's own flaw.** Light torque rotates the
  plug a few thousandths until it *binds* on the single stack whose chamber sits furthest
  off-line. Set that pin to the line, the plug rotates into the gap it leaves and traps its
  driver on a tiny ledge — a **set** — and the binding passes to the next pin.
- **The flaw is the whole method.** A lock machined perfectly true — zero tolerance — has no
  stack that binds before the others, so there is no first pin and no order to climb. It
  cannot be picked pin by pin at all: it opens only to its key, or to force. The precision
  that would make a lock pickable is exactly the precision it lacks.

Tighten the tolerance and the lock grows harder to pick, dearer to make, and — past a point no
lock reaches — impossible to pick and useless without its key.

## Four states

- **Locked** — no key, no torque. Springs hold every break below the shear line; every driver
  crosses the seam. The plug will not stir: `n` dowels through a joint.
- **Binding** — torque on, mid-pick. Exactly one stack carries the load, the one the tolerance
  set furthest off-line. The rest are slack; only the binding pin is worth touching.
- **Set** — a bound pin lifted to the line: the plug rotates a hair into the gap, catching the
  driver on a ledge so it cannot fall back. The torque moves on; the count climbs toward `n`.
- **Open** — every break on the line at once, the last pin set or the key seated. Nothing
  crosses the seam, and the plug swings. By geometry if you had the key; by order if you did not.

## The bench

A pin-tumbler lock in cross-section: a plug that wants to turn inside a fixed shell, a row of
spring-loaded stacks crossing the shear line between them. Set the number of **pins**, the
**tolerance** the chambers are cut to, and whether the drivers are **standard** or **spools**.
Press *Insert key* to raise every break to the line at once and watch the plug swing free;
press *Pick it* to put torque on the plug and let it set the pins one at a time, in binding
order; or *Set next pin* to take that order a rung at a time yourself. *Rekey* cuts a fresh
bitting. Drop the tolerance to zero and the pick stalls — with no pin binding first, there is
no order to climb, and only the key will open it.

Fit **spool drivers** and the pick meets the lock's own counter-measure. A spool is a driver
waisted in the middle; when it reaches the shear line the plug rotates into the groove instead
of stopping, giving a **false set** — the plug over-rotates and feels nearly open, but the
spool's rim is caught on the seam and the lock is not open at all. The fresh binds run as
before, but each spool catches false rather than setting; then a second pass clears them, and
as each spool is pushed past its rim the plug *counter-rotates* a notch — the backward give
that tells a picker a security pin has just set. It is the same shear line, read through a pin
built to lie about where it is.

The panel reads the pins, the tolerance (and whether it leaves a binding order to climb), the
drivers (standard, or how many are spools), the **bitting** `Lᵢ` (the cut key, each stack's
lift — set pins shown green, the binding pin amber), which pin is binding now and whether it is
a spool, how many of `n` are set and how many caught in a false set, and the plug's rotation
from locked to open. The scene colours each driver by its state: oxblood where it
still crosses the seam and holds, amber for the one pin binding under torque, green for a break
brought to the shear line. A **binding-order panel** ranks the stacks by how far each chamber
drifts off the true line — the ladder a pick climbs, top to bottom, set rungs going green and
the one binding now called out; collapse the tolerance and the bars collapse with it, the order
gone. The gauge below shows the plug barred from turning until the last pin sets, then swinging
free, with a dot per stack filling as it sets and the binding one ringed.

The pins, tolerance and drivers are kept in `localStorage`, so a reader finds the bench as they
left it; the cut key is kept too, so the same lock greets them until they rekey. A live status
line (`aria-live`) reads the bench to a screen reader, and it is written to be *followed*, not
just sampled: each pick step is spoken as it happens — "pin 3 set", "pin 1 caught in a false
set", "spool pin 4 cleared, the plug counter-rotates" — so the binding order is audible in
sequence, led by the event just taken and then the running state (the lock, how true it is cut,
how many are set and how many false, which pin binds, and whether it is locked, binding, in a
false set, or open). A discrete action speaks at once; a slider drag is debounced so it does not
chatter. The canvas carries its own live label for when a pointer or focus lands on it, and each
control names its keyboard shortcut (`aria-keyshortcuts`). Under `prefers-reduced-motion` the
pins and plug are shown at their settled places rather than animated, and *Pick it* resolves
straight to the open arrangement; a live change to the setting is honoured — turn it on mid-pick
and the run settles to its finished state rather than animating the rest. The whole bench works
from the keyboard. The whole bench works from the keyboard — <kbd>K</kbd> inserts the
key, <kbd>P</kbd> picks it, <kbd>N</kbd> sets the next pin, <kbd>X</kbd> rekeys, <kbd>D</kbd>
toggles standard drivers and spools, <kbd>R</kbd> resets, <kbd>[</kbd>/<kbd>]</kbd> remove and
add pins, and <kbd>−</kbd>/<kbd>=</kbd> tighten and loosen the tolerance.

Each page is one HTML file, one stylesheet, one script. No build, no account, no network once
it has loaded. The chambers are idealised and the plug's turn is drawn as a slide, but the
shape is exact: the plug opens only when every break meets the one shear line, the key meets
them all at once, and the pick climbs an order that exists only because the lock was built a
little untrue.

*One of a series — a page a day, each built on one old working word and the discipline hidden
inside it. 2026-10-30. One plane, missed in as many places as there are pins.*
