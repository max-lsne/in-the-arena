# Cotter

**Two members meet end to end and must be drawn tight and kept there. Cut a slot
across both, offset the slots by a hair, and drive a flat **tapered key** through:
as it goes in, its taper wedges the slots apart along the joint, so a light tap on
the head becomes a heavy **pull** in the members. Then the trick that makes it a
fastener — cut the taper shallower than the **friction** on its faces and the
joint, straining to spit the key out, cannot. The key holds itself, no nut. Too
shallow and it seizes; too steep and it creeps loose. The taper is the one dial,
and it sets the pull, the hold, and the price of both.**

A cotter is the plainest inclined plane put to work as a fastening. The word is
old carpentry and old engineering alike — the *cotter* of a strap, the *gib and
cotter* of a connecting rod — and it names the wedge by its job: to draw and to
hold. What surprises is that one slight taper does both, and that whether it holds
turns on nothing but the friction it happens to have.

## The one relation

Let the taper be `t` — the key's rise per length, the `1` in the fitter's `1 : n` —
and let friction on its two bearing faces be `μ`. Balance the key driving in, and
holding under a draw `T`, and the whole of it is three lines:

- **The pull.** To seat the key you fight the taper and the friction on both
  faces: `F = T · (t + 2μ)`, so the draw won per blow is `T ⁄ F = 1 ⁄ (t + 2μ)`.
  Cut the taper finer and the same blow pulls harder — the mechanical advantage of
  the wedge.
- **The hold.** With the hammer gone, the draw tries to expel the key: its taper
  helps it out by `T·t`, friction resists by `2μ·T`. The key stays — *self-locking*
  — exactly when `t ≤ 2μ`, the taper gentler than the friction. This is why a
  cotter needs no nut.
- **The price.** The taper cannot cheat the load. Whatever the draw, the key sees
  it as shear across its section and the softer member sees it as crushing on the
  bearing. A finer taper pulls and holds better but relieves nothing — the draw the
  members carry is set by the joint, not the key.

So the taper is the one dial, pulling two ways. Steepen it: light to seat, easy to
free — but past the friction it will not stay. Flatten it: the hold grows
unshakeable and the pull enormous — but it seats only under a heavy blow and, cut
too fine, *seizes*, neither driving home nor striking free. Between them is the
taper the fitter cuts, and it depends on nothing but `μ`: rough faces lock at a
bold taper, greased steel needs a fine one.

## The bench

A cotter joint drawn tight: two members pulled together by a flat **tapered key**
through their slots, coloured heavier and darker as it nears its limit, with the
**drive** that seats it, the **draw** it holds, and the **friction cone** that
decides whether it locks. Pick the **joint** — a light strap and wooden key, a
steel connecting-rod gib and cotter, an oak tie drawn up by an iron key, a slender
iron stay — set the **draw** as a share of the joint's design load, and cut the
**taper** from a bold `1 : 3` to a fine `1 : 42`. The gauge reads the force in each
part against its limit, and the draw the joint safely holds. Press *Find the taper*
to cut the key to the taper that locks with a comfortable margin and still strikes
free. The joint, draw and taper you set are kept in `localStorage`, so a reader
finds the bench as they left it; *Reset* returns it to the too-steep, creeping rod.

The four joints give first in a different part: the **strap** and the **beam**
crush their soft bearing, the **rod** shears its steel key, the **stay** tears
across the slot its section is left with — and none of it is a taper's to fix,
because the key sets how the draw is held, not how large it is.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The four joints' sections, frictions and design loads
are stylised — plausible, not measured — but the forces drawn from them are exact:
the draw won per blow `1 ⁄ (t + 2μ)`, the self-locking line `t ≤ 2μ`, the key in
double shear, the bearing in crushing, the member in tension across its slot.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-15.*
