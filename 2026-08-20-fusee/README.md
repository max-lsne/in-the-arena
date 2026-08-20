# Fusee

**A mainspring is a broken clock waiting to happen. Wound tight it shoves hard; run
down it barely pushes — and a going train driven straight from it would gallop when
fresh and crawl when tired, gaining and losing minutes a day. The fusee is the fix,
and it is pure geometry: a spiral-grooved cone, cut so its radius grows exactly as
fast as the spring's torque fades. A chain runs from the spring's barrel to the
fusee; as the spring weakens, the chain climbs onto the cone's wider turns, and the
longer lever exactly makes up for the weaker pull. The product of a failing force
and a rising arm is a constant. The fusee is the reciprocal of the mainspring's own
weakness, turned in brass — `radius × torque = the same number, all the way down`.
This is the fusee.**

The word is old French — *fusée*, a spindleful of spun thread, from Latin *fūsus*,
a spindle — because the earliest ones held a spiralled length of gut wound like
thread on a distaff. It is among the oldest tricks in fine mechanism: a fusee is
sketched in Filippo Brunelleschi's notebooks and drawn by Leonardo, the earliest
surviving spring clock with one (the Burgunder, in the Germanisches
Nationalmuseum) dates to about 1430, and Jacob Zech of Prague was long credited
with its invention in 1525. It outlived four centuries of clockmaking: John
Harrison's prize-winning marine chronometer **H4** kept a *going* fusee so it would
not lose the seconds that decide a longitude while it was being wound, and the
finest English watches carried fusees into the 1800s.

## The problem the fusee solves

A weight-driven clock has it easy: the weight pulls with the same force whether the
clock is freshly wound or nearly run down, because gravity does not tire. A spring
does. A coiled mainspring is a torsion spring, and like any spring it obeys Hooke's
law — the torque it returns is very nearly proportional to how far it is still
wound. Wind it through its full range and it might deliver a torque **τ_max**;
let it unwind almost to rest and that falls to some **τ_min**, perhaps a third as
much.

That would not matter if a clock's rate were indifferent to its drive. It is not.
Every escapement leaks a little of the drive torque into the swing it is meant only
to count — a verge or a balance runs measurably faster under a stronger push. So a
spring clock without correction **gains while it is fresh and loses as it tires**,
by an amount no amount of good escapement design fully removes. The cure is to feed
the train a torque that does *not* change as the spring runs down. The fusee makes
that torque out of geometry.

## The one relation the cone embodies

Set the barrel that holds the spring to a fixed radius **R**. The chain leaving it
pulls with a tension

> **F = τ_spring / R,**

which falls as the spring unwinds, exactly tracking τ_spring. That same chain wraps
the fusee and pulls the train through the fusee's arbor, so the torque handed to the
train is the tension times whatever fusee radius the chain is riding on:

> **τ_out = F · r(w) = (τ_spring / R) · r(w).**

For τ_out to stay put while τ_spring sinks, the fusee radius must **rise in exact
inverse proportion** to the spring's torque:

> **r(w) = R · τ_out / τ_spring(w)   ∝   1 / τ_spring(w).**

That is the whole design. The fusee's profile is nothing but the reciprocal of the
mainspring's torque curve, drawn as a solid of revolution. Where the spring is
strongest — fully wound — the chain must ride the **smallest** radius, so the cone
is narrow at the top; where the spring is weakest — run down — it rides the
**widest**, so the cone flares at the base. And the flare is not free to be
anything: because r runs from R·τ_out/τ_max up to R·τ_out/τ_min, the ratio of the
fusee's biggest radius to its smallest is forced to equal the ratio of the spring's
strongest torque to its weakest,

> **r_max / r_min = τ_max / τ_min.**

A spring that sags by three to one wants a fusee that flares by three to one. The
cone is the spring's weakness, made visible.

## The bench

A spring barrel on the left, a fusee on the right, the chain slung between them, and
along the foot a plot of torque against how far the spring is wound.

- **wind** — how far the spring is still wound, from run down at the base of the
  fusee to fully wound at its tip. Draw it down and watch the chain climb to the
  cone's wider turns while the barrel's pull weakens: the two changes cancel, and
  the **output torque holds flat** where the barrel's own torque slides away
  beneath it.
- **spring droop** — how much the mainspring's torque falls from wound to run down,
  the ratio τ_max : τ_min. A stiff, even spring droops little and wants a nearly
  straight cone; a spring that sags hard wants a sharply flared one. Change it and
  the fusee is re-cut on the spot to match — its flare always the exact reciprocal
  of the droop you set.
- **turns** — how many turns of chain the fusee holds, and so how long the clock
  runs between windings.

Press **Run** to let the spring drain from full to empty and watch the drive hold
steady the whole way down. Press **Remove the fusee** to drive the train straight
off the barrel instead: the output torque now droops with the spring, by the full
spring-droop ratio, and the readout shows how far the drive falls across a single
winding — the error the fusee was built to erase.

## Why keep it

The fusee is worth a page because it is a mechanism that computes a reciprocal
without arithmetic. No clockmaker solving `1/τ(w)` by hand cut those cones; they
were turned to a curve found by trial, filed until the going stayed even, and the
curve they arrived at *is* the inverse of the spring's failing torque, discovered in
brass a century before the calculus that would have named it. It belongs to the same
family as the [governor](../2026-08-15-governor/) that flattens an engine's speed
and the [escapement](../2026-07-30-escapement/) that meters a clock's push: each is
a small machine whose whole purpose is to hold one quantity constant while another
runs away. The fusee holds the drive still while the spring dies — and it does it
with nothing but a well-chosen radius.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-08-20.*
