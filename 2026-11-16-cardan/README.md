# Cardan

**Three small pages, made the same morning, for the part that carries a turn around a corner: the
universal joint — a cross held at its four arms by two forked yokes, one on each of two shafts that
meet at an angle. Turn one shaft and the other turns too, once for once over a whole revolution, and
yet never quite in step within the turn. It reads three ways: the *angle*, where a steady turn comes
out leading and lagging; the *ripple*, where that unevenness is read as a speed that swings twice a
turn; and the *double*, where a second joint, correctly phased, undoes the first's error and hands on
a turn as clean as it came.**

Most days in this folder are one page. Some mornings the idea arrives already in threes. A
*universal joint* — a *Cardan* joint, after Gerolamo Cardano, who set it down in 1545; a *Hooke's
joint*, after the Englishman who gave its geometry — is the plainest answer to a hard little problem:
how do you send a turn to a shaft that will not line up, and that keeps moving as it won't line up?
The cross is the whole trick. It lets each shaft tilt its grip independently, so the corner can be any
angle and can even change while running. The price is written into the geometry: the output cannot
keep even step, and the faster you ask it to turn through a sharp bend, the more it shudders.

## The three

- **[Angle](./angle/)** — *the lead and lag.* The driven shaft's angle is not the driver's but
  `arctan(tan θ / cos β)`, an S-shaped wobble about the straight line. Four times a turn the two
  agree exactly; between, the output runs ahead by a few degrees, then behind by the same. The size
  of the wobble grows with the bend `β` and vanishes when the shafts line up.
  Set the bend → turn the drive → watch a steady turn come out uneven.

- **[Ripple](./ripple/)** — *the flutter.* Differentiate the angle and the unevenness becomes a
  *speed*: `ω₂/ω₁ = cos β / (1 − sin²β·cos²θ)`, swinging twice per revolution between a fast
  `1/cos β` and a slow `cos β`. It is a **second harmonic** — the same lopsided signature a short
  connecting **[rod](../2026-11-15-crank/rod/)** writes into a piston — and it is why a single joint
  on a fast, steep driveshaft hums and wears.
  Set the bend → read the output speed against the even input → see the flutter deepen.

- **[Double](./double/)** — *the cure.* Put two joints in line with an intermediate shaft between,
  make the two bend angles **equal**, and **phase** the middle yokes right, and the second joint's
  error is the exact inverse of the first's. The flutter cancels, revolution by revolution, and the
  output turns as evenly as the input — a true constant-velocity drive.
  Set the two bends and the phase → watch the net speed go flat, or watch the errors double.

## The one relation

Everything here is one cross-and-yoke, read at three depths. Two shafts cross at a bend angle `β`;
let `θ` be the roll of the driving shaft, measured from the moment its yoke lies in the plane of the
two shafts. The cross forces the output roll `φ` to satisfy:

```
tan φ = tan θ / cos β
```

Read it for its size, its slope, and its sum:

- The **angle** itself, `φ = arctan(tan θ / cos β)`, is the S-wobble — equal to `θ` at `0, 90, 180,
  270°`, adrift by up to about `β²/4` between. ([angle](./angle/))
- The **slope** `dφ/dθ = cos β / (1 − sin²β·cos²θ)` is the velocity ratio — the twice-a-turn flutter,
  running from `cos β` to `1/cos β` and back. ([ripple](./ripple/))
- The **sum of two**, joints staged `β` then `β` with the middle yokes square, multiplies to exactly
  `1` at every angle — the flutter of the first undone by the flutter of the second. ([double](./double/))

One bend sets the error; one derivative turns that error into a shudder; one matched partner cancels
it. All three are that single line `tan φ = tan θ / cos β`, asked three questions.

## What the joint is *not*

A **[crank](../2026-11-15-crank/)** also turns a clean rotation into something lopsided — and by the
very same second harmonic — but it is converting a turn into a *straight push*; the Cardan keeps
rotation as rotation and only bends its path. A **[Geneva](../2026-08-30-geneva/)** passes rotation
on in *intermittent* steps with dwells between; the Cardan never pauses, it only runs uneven. A
**[worm](../2026-09-21-worm/)** and a **[differential](../2026-09-22-differential/)** change the
*amount* of turn — gearing it down, or splitting it two ways; the Cardan changes neither, it only
carries the turn across an angle. And where a **[flywheel](../2026-09-25-flywheel/)** is brought in to
*smooth* a ripple after the fact, the double Cardan does something rarer: it removes the ripple at the
source, by making a second wrong exactly cancel the first.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each works the same cross on the same two shafts, read in its own trade:
the uneven angle, the fluttering speed, the paired cure. Each keeps its settings in `localStorage`,
reads itself to a screen reader with a live status line, holds still under `prefers-reduced-motion`
(the joint shown at a settled angle, the cross square to the bend), and works from the keyboard. Open
any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside
it. Some mornings, three. 2026-11-16. A cross, two yokes, and a turn carried round a corner it was
never quite able to keep.*
