# Cam

**Any lump on a shaft will lift a follower and let it fall; a cam is the lump cut so
that the *way* it lifts is exactly a schedule you chose. Write the follower's height as
`s(θ)` — how far it has risen at cam angle θ — and the cam is that graph wrapped into a
disc, its radius `R(θ) = R_base + s(θ)`, read off once every revolution, forever. The
lift is the easy half. The follower does not feel displacement; it feels the second
derivative, the acceleration `a = ω²·s''(θ)`, and so the force — and there the law you
cut into the edge decides everything. A straight ramp gives a step in velocity, and a
step in velocity is an *infinite acceleration*, a hammer-blow at every corner. Simple
harmonic motion bounds the acceleration but *steps* it where the rise meets the dwell —
an infinite jerk, and the follower rings. Only the cycloidal law eases the acceleration
to zero at both ends, matched to the still dwell it joins, and runs quiet. Same lift,
same rise, same dwell: the difference between a machine that pounds itself apart and one
that whispers is a choice of curve. This is the cam.**

The word is Dutch — *kam*, *comb*, the projecting tooth of a wheel, cognate with English
*comb*: a cam is a comb-tooth that combs the follower up and down. The thing is very old.
Han-dynasty foundries drove trip-hammers off pegs on a turning axle; around 1206 **Ismail
al-Jazari** filled his *Book of Knowledge of Ingenious Mechanical Devices* with
cam-and-peg shafts working automata and water-clocks; and every internal-combustion engine
since has carried a **camshaft**, its lobes opening the valves on the beat. But the
discipline hidden in the cam is young. For most of that history a cam was cut to *reach*
the right places; only with high-speed machinery did it become clear that the whole art is
in the derivatives — that two cams with the identical lift can treat their followers as
gently or as brutally as the difference between their curves, and that the design problem
is really a problem in `s''`, the acceleration, and `s'''`, the jerk.

## The problem the shape solves

Many machines need one part moved through the *same* stroke over and over, in step with a
turning shaft: a valve opened just as a piston wants air and shut before it fires, a needle
dipped as cloth advances, a tool fed in, held, and drawn back. You could chase the timing
with linkages and stops, but it would drift and be hard to change. The cam does it with a
single shaped wheel — the follower rides the edge, and the rising and falling radius *is*
the stroke, laid out around the turn. The **displacement diagram**, the graph of lift
against angle, is the entire design; the metal is only its shadow.

## The one relation it embodies

Rise a follower through lift `h` over a rise angle `β`, at shaft speed `ω`. Every law
shares one skeleton — a velocity that scales as `h·ω/β` and an acceleration that scales as
`h·ω²/β²` — but the *shape* of those curves, and their peaks, are the law's own:

- **Constant velocity**, `s = h·(θ/β)`. One steady speed up. But velocity jumps `0 → v → 0`
  at the ends, so the acceleration is a pair of impulses — infinite. The corner cannot be
  run.
- **Simple harmonic**, `s = (h/2)(1 − cos πθ/β)`. Velocity is a smooth half-sine, zero at
  both ends; but the acceleration is a half-*cosine* that starts and ends at full value and
  *steps* to the dwell's zero. Bounded force, infinite **jerk** at each junction.
- **Cycloidal**, `s = h(θ/β − sin(2πθ/β)/2π)`. Velocity *and* acceleration are both zero at
  both ends. The acceleration is a full sine over the rise, up from nothing and back to
  nothing, matched to the dwell it meets. The jerk stays finite.

Their peak factors, with `v_max = C_v·h·ω/β` and `a_max = C_a·h·ω²/β²`:

> **C_v = [ 1, π⁄2, 2 ]     C_a = [ ∞, π²⁄2, 2π ]**

The quiet lesson is in that last column. The cycloidal law has the **largest** peak
acceleration of the three — `2π` against simple harmonic's `π²/2` — and is still the one
that runs smooth. It wins not by pushing less hard but by never *surprising* the follower:
no step in acceleration, no infinite jerk, no ring. And because every peak carries `1/β²`,

> **halve the rise angle and you quadruple the acceleration** — the same lift, hurried, is
> four times as violent.

## The bench

A cam on its shaft, its **base circle** dashed inside it and the sectors of the turn —
**rise**, dwell, **return**, dwell — banded around the rim and turning past a knife-edge
**follower** at the top. Below, the **displacement diagram** in three lanes: the lift `s`,
the velocity `v` and the acceleration `a` against cam angle, with a cursor at the present
angle.

- **motion law** — constant velocity, simple harmonic, or cycloidal: the curve cut into the
  rise. Watch the acceleration lane change character — impulses spiking off the frame,
  finite steps at the dwells, or a smooth meeting with zero.
- **lift** — `h`, the follower's whole travel, added onto the fixed base circle. Everything
  scales straight up with it.
- **rise angle** — `β`, the turn allowed for the climb; the return gets the same and the two
  dwells share the rest. Shorten it and the acceleration grows as one over its square.

Press **Turn** to run the cam and watch the follower rehearse the lift while the cursor
sweeps the diagram. The lift barely changes between the laws; the corners change utterly.

## Why keep it

The cam is worth a page because it turns a demand about time into a fact about shape. The
demand — move this follower through exactly this stroke, in exactly this phase with the
shaft, again and again without drift — is a statement about *every instant* of the turn;
the cam answers all of it at once by being cut to the right edge, and then obeys without a
thought, the way an [involute](../2026-08-22-involute/) tooth satisfies the law of gearing
by its shape alone, or a hanging chain finds its [catenary](../2026-08-18-catenary/)
without solving for it. It keeps company with the other machines that hand out a schedule
and hold to it: the [escapement](../2026-07-30-escapement/) that doles a clock its beat
from a failing push, the [governor](../2026-08-15-governor/) that holds an engine's speed
against a swinging load, the [fusee](../2026-08-20-fusee/) that keeps a mainspring's pull
level as it dies. The cam is their cousin that carries the whole programme on its rim.
Turn it, then switch the law and watch only the acceleration lane: a hammer, a ring, or
nothing at all — the lift unmoved beneath. That is the cam, and it is only a graph, wrapped
into a wheel.

Each page is one HTML file, one stylesheet, one script. No build, no account, no network
once it has loaded.

*One of a series — a page a day, each built on one old working word and the discipline
hidden inside it. 2026-08-27.*
