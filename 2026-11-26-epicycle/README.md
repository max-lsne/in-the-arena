# Epicycle

**Two small pages, made the same morning, for one idea: the curve a point writes when it is carried by a
wheel that is itself carried by a wheel. Roll a circle on a fixed ring and pin a pen to it, and the pen
obeys two turns at once — the slow swing of the rolling wheel's centre around the ring, and the fast spin
of the wheel under it. Because the wheel may not slip, those two turns are locked in one ratio, the ratio
of the two radii, and that single number is the whole figure. With the pen on the wheel's *rim* the curve
comes to sharp points — an *epicycloid* outside the ring, a *hypocycloid* inside — and the number of
points counts the ratio: a cardioid, a nephroid, a deltoid, an astroid. Draw the pen *inside* the rim and
the points round off into the woven petals a *spirograph* makes — a hypotrochoid, the same two turns with
the pen held short of the edge. One mechanism — a wheel on a wheel — met once with the pen on the rim and
once with it drawn in.**

This is the oldest form of the idea in the whole folder. Ptolemy built the heavens out of exactly this:
a planet riding a small circle, the *epicycle*, whose centre rode a big one, the *deferent* — circles
carried on circles, stacked until they fit the sky. The curves here are what a pen on that machinery
actually draws. The parametrisation is the same for both pages,

```
centre on a circle of radius R±r;   pen offset d from the centre, turning at rate (R±r)/r
x = (R±r)·cos θ ∓ d·cos((R±r)/r · θ),   y = (R±r)·sin θ − d·sin((R±r)/r · θ)
```

with the upper signs for a wheel rolled outside the ring and the lower for inside. What changes between
the two pages is only where the pen sits: on the rim (`d = r`), or short of it (`d < r`).

## The two

- **[Cusp](./cusp/)** — *the pen on the rim.* With the pen at the wheel's very edge the curve is pointed:
  each time that point of the rim touches the ring the pen stops dead and the curve throws a **cusp**.
  Reduce the radius ratio `R:r` to lowest terms `p:q` and the figure has **p cusps** and **closes after q
  turns** of the wheel around the ring — so counting the cusps reads the ratio straight off the drawing.
  The small ratios are the named curves: outside, one cusp is a **cardioid** and two a **nephroid**;
  inside, three is a **deltoid**, four an **astroid**, and two is the **Tusi couple**, where the curve
  falls flat into a straight line swept along a diameter — two circles making a line. Set the two radii,
  roll inside or out → watch the pointed star draw, and add a little slip to watch it turn.

- **[Rosette](./rosette/)** — *the pen drawn in.* Move the pen off the rim, a distance `d` short of the
  edge, and the cusps **round into loops**: the pointed star softens into the dense, many-petalled
  rosette a **spirograph** draws — a *hypotrochoid*. The petal count is still read from the radii,
  `R/gcd(R,r)` outer lobes closing after `r/gcd(R,r)` turns, but now the **offset** `d` sets how deep the
  petals cut and whether they loop over themselves or merely scallop. Pull the pen all the way to the rim
  and the rosette sharpens back into the cusped curve of the other page; pull it to the centre and the
  whole figure shrinks to the plain circle the wheel's centre rides. Set the radii and the offset → press
  draw → watch the flower wind.

## The one idea

Everything here is a pen carried by a wheel carried by a wheel — the pen at radius `d` from a centre that
itself rides a circle, the two turns geared by the no-slip ratio `R:r`.

- With the pen **on the rim** (`d = r`) the two turns can momentarily cancel: the pen touches the ring,
  stops, and the curve throws a cusp. The ratio is written in **points**. ([cusp](./cusp/))
- With the pen **inside the rim** (`d < r`) the turns never fully cancel, so the curve stays smooth: the
  cusps open into **petals**, and the same ratio is written in **loops**. The offset decides how deep.
  ([rosette](./rosette/))

One mechanism; two pens. The epicycloid and the spirograph are not two machines that resemble each other
— they are the one wheel-on-a-wheel, drawn with the pen let out to the edge or held short of it.

## What this is *not*

These are **roulettes** — curves written by a point fixed to a shape that **rolls** on another. That makes
them the near kin, and the natural sequel, of the curves nearby in this folder. A
**[cycloid](../2026-11-22-cycloid/)** is the first roulette of all: a wheel rolled on a *straight line*,
not a ring — flatten the ring here to infinite radius and the epicycloid straightens into it. A
**[linkage](../2026-11-24-linkage/)**'s coupler point is *forced* along its path by rigid bars, a curve
imposed by closure rather than written by rolling. A **[tracery](../2026-11-25-tracery/)** figure is a pen
*pulled two independent ways at once* by crossed oscillations — kin to this, but its two drives share only
a clock, where here the two turns are **geared** by the rolling and cannot be set apart. And a
**[trammel](../2026-08-14-trammel/)** draws its ellipse by *sliding*, not rolling — two pins in two slots,
no wheel at all. The epicycle is the case where the second motion is a *circle carried on a circle*: the
form Ptolemy stacked to hold the planets, and Fourier later showed could, nested deep enough, draw any
closed curve at all.

## What's here

Two folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each rolls a real wheel on a real ring and computes the pen's path honestly
every frame from the two radii (and, for the rosette, the pen offset): the reduced ratio `p:q`, the cusp
or petal count, the number of turns to closure. Each names the curve it finds — cardioid, nephroid,
deltoid, astroid, the Tusi line, or the rosette by its petals — and lets a small **slip** detune the
rolling ratio to watch a closed figure give way to a precessing one. Each keeps its settings in
`localStorage`, reads itself to a screen reader through a live status line, holds still under
`prefers-reduced-motion` (the figure shown drawn whole, the wheel at rest), and works from the keyboard.
Open either `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it.
Some mornings, two. 2026-11-26. A wheel rolled on a wheel, and the curve its rim is made to write.*
