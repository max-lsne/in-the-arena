# Crank

**Three small pages, made the same morning, for the part that trades a turn for a push and a
push for a turn: the crank — a pin set off the axis of a shaft, tied by a rod to something held
to one straight line. Turn the shaft and the thing slides; push the thing and the shaft turns.
No gear changes the kind of motion so plainly, and nothing in an engine is more taken for
granted. The whole mechanism is three parts — a *throw* that sets the reach, a *rod* that
carries the force across, a *slider* that keeps to its guide — and it reads three ways: the
clean *throw*, where a circle becomes a line; the *dead* points, where the line and the circle
fall into step and the push buys no turn at all; and the *rod* itself, finite and tilting,
which bends the clean line out of true.**

Most days in this folder are one page. Some mornings the idea arrives already in threes. A
*crank* is the oldest power conversion we still use — the carpenter's brace, the grindstone
handle, the pedal, the whole inside of every engine — and it is the plainest. From Old English
*cranc*, a bend; the bent arm of the shaft is the whole trick. Everything a crank does is one
geometry: a pin on a circle, a block on a line, a link between. Where the two agree, you get
smooth exchange; where they fall into line, you get a blind spot; and because the link has a
length, the exchange is never quite the clean cosine the ideal promises.

## The three

- **[Throw](./throw/)** — *the transform.* A pin a distance `r` off the axis rides a circle; a
  long rod ties it to a slider on one guide. With an ideal rod the slider is the pin's shadow on
  the line — `x = r·cos θ`, pure simple harmonic motion, a full stroke of `2r`. Fastest through
  the middle, still for an instant at each end.
  Set the throw and the speed → turn the crank → watch a circle read out as a line.

- **[Dead](./dead/)** — *the blind spots.* To turn the shaft, a push on the slider must act
  through a moment arm about the axis. At the two **dead centres** — top and bottom of the
  stroke — the rod, the crank and the line all fall into one, the moment arm goes to zero, and
  no force on the slider makes any torque. That is why a single cylinder cannot start itself from
  those angles, and why a **[flywheel](../2026-09-25-flywheel/)** is there to carry it through.
  Set the rod and the gas force → turn the crank → find the two angles where the push is wasted.

- **[Rod](./rod/)** — *the distortion.* The ideal wants an infinite rod. A real rod has a length
  `L`, and as the crank turns the rod tilts, so the slider's motion is `x = r·cos θ + √(L² −
  r²sin²θ)` — not a clean cosine but a cosine plus a **second harmonic**. The piston reaches top
  speed before mid-stroke, dwells longer at the bottom, and is flung harder at the top than the
  bottom. The shorter the rod, the stronger the bend.
  Set the rod ratio `n = L/r` → watch the real motion pull away from the ideal sine.

## The one geometry

Everything here is one slider-crank, read three ways. Put the shaft axis at the origin, the
stroke along the `x`-axis, the throw `r` and the rod `L`. The crank pin is at angle `θ`, and the
slider sits where the rod — a bar of fixed length `L` — can reach it along the line:

```
x(θ) = r·cos θ + √(L² − r²·sin²θ)
```

Read it at three depths:

- Let `L → ∞` and the root flattens to a constant: `x → r·cos θ`, the pin's plain shadow. A
  circle becomes a line, and the stroke is exactly `2r`. ([throw](./throw/))
- The **velocity ratio** between slider and crank is `dx/dθ`, and the torque a slider force `F`
  delivers to the shaft is `F·dx/dθ`. At `θ = 0` and `θ = 180°` that slope is zero — the dead
  centres, where the exchange stalls. ([dead](./dead/))
- Keep `L` finite and expand the root: `x ≈ r·cos θ + (r²/2L)·cos 2θ + …`. The extra `cos 2θ` is
  the **second harmonic** — the lopsidedness a real rod adds, and the reason balance shafts
  exist. ([rod](./rod/))

One throw sets the reach; one rod carries the force and, being finite, taxes it; one pair of
dead points marks where the whole exchange briefly buys nothing. All three are that single line
`x(θ)`, read for its size, its slope, and its shape.

## What the crank is *not*

A **[cam](../2026-08-27-cam/)** is a shaped edge that can give the follower *any* motion its
profile is cut for; a crank gives only the one motion the circle allows, near enough a sine. A
**[Geneva](../2026-08-30-geneva/)** turns steady rotation into *intermittent* steps with dwells
between; a crank's exchange is continuous and never rests. An **[escapement](../2026-07-30-escapement/)**
meters motion out against a clock; a crank only trades its direction. And where a
**[flywheel](../2026-09-25-flywheel/)** *stores* rotation to smooth it, the crank is the thing
whose dead points make that storage necessary in the first place — the two parts are a pair, the
crank making the ripple and the flywheel ironing it flat.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build
and no network once it has loaded. Each works the same pin on a circle, the same block on a
guide, read in its own trade: the clean transform, the dead points, the finite rod's distortion.
Each keeps its settings in `localStorage`, reads itself to a screen reader with a live status
line, holds still under `prefers-reduced-motion` (the mechanism shown at a settled angle, the
pin square on the stroke), and works from the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden
inside it. Some mornings, three. 2026-11-15. A pin, a rod, a block, and the turn traded for a
push.*
