# Evolute

**Two small pages, made the same morning, for one idea: every curve quietly keeps a *second* curve. At each
point a curve bends at some rate, and there is exactly one circle — the **osculating circle** — that hugs it
best there; the centre of that circle sits a short way in along the **normal**, the line dropped square to
the curve. Walk a point along the curve and that centre travels too, and the track it writes is the
**evolute**. It has a second face that looks unrelated and is the same thing: the evolute is the **envelope
of the curve's normals**, the one line every normal just touches and none of them crosses — the very
construction that wrapped yesterday's caustic out of reflected rays, turned now on the normals of a curve
instead of the rays of a mirror. And it has a reverse: unwind a taut string from a curve and the free end
traces an **involute**, whose evolute is the curve you unwound from. Take the evolute and you throw a curve's
curvature away into a new line; unwind a string and you wind it back. One pair of inverse moves — met once as
a track of centres, once as a string let out.**

The surprise is how plain the two descriptions are and how far apart they look. *Where does a curve keep the
record of how hard it was turning?* — not on the curve, but on a companion curve beside it, pinched to a
**cusp** wherever the bending was steadiest. An ellipse keeps a four-cusped stretched **astroid**; a circle,
with no bend to spare, keeps nothing but its own centre. These are the same astroids and cardioids met all
week — [rolled](../2026-11-26-epicycle/) out by a wheel, [wrapped](../2026-11-27-caustic/) out of light — and
here they turn up a fourth way, as the curvature of something simpler written down.

The centre of curvature is read straight off the curve, with no evolute equation assumed. For a point `P(t)`
with velocity `P'` and acceleration `P''`:

```
D = x'y'' − y'x''                        (twice the swept area)
C = ( x − y'·(x'²+y'²)/D ,  y + x'·(x'²+y'²)/D )
```

`C` is the centre of the osculating circle. Both pages compute exactly this — and the envelope the other way,
as `normal(t) ∩ normal(t+δ)` in the limit — and the two land on one curve to machine precision. Nothing is
plotted from a closed form; the evolute is read off the curve's own bend.

## The two

- **[Centres](./centres/)** — *the evolute as a track of centres, and as an envelope of normals.* A gold
  **ellipse**, a point running round it, and at that point the **best-fitting circle** whose centre is pinned
  one radius of curvature in along the **normal**. As the point travels the centre traces the **evolute** — a
  four-cusped stretched astroid, pinched at the ends of the two axes where the curvature is extremal. Drop a
  normal at every point and the same curve appears a second way, as the **envelope** the whole family of
  normals wraps. Set the ellipse's shape, roll the hugging circle round → watch the two constructions land on
  one curve, and flatten toward a circle to see the evolute collapse to the single centre every normal shares.

- **[String](./string/)** — *the reverse move: wind the curve back out of its evolute.* Pin a taut **string**
  to a curve and **unwind** it, keeping it tight; the free end traces an **involute**. The string is always
  **tangent** to the curve at the point it last leaves — so the curve is the **envelope of the involute's
  normals**, which is to say the curve *is the evolute of the involute it just drew*. Unwinding from a
  **circle** draws the spiral **involute of a circle**, the flank of every gear tooth; from a **cycloid**, an
  **equal cycloid**, the trick Huygens used to make a pendulum keep true time; from an **astroid**, a larger
  astroid. Pick a base, let the string out → watch evolute and involute prove to be one move run backwards.

## The one idea

A curve carries its curvature as a companion curve, and the two are reached by inverse constructions:

- Take a curve and mark, at each point, the **centre of the circle that hugs it best**. The track of those
  centres — equally, the **envelope of the normals** — is the **evolute**. ([centres](./centres/))
- Take a curve and **unwind a taut string** from it. The free end traces an **involute**, and the curve you
  unwound from is that involute's evolute. ([string](./string/))

Take the evolute, then take the involute, and you are back where you began. The four-cusped star beside the
ellipse and the string let out from a circle are not two tricks that resemble each other — they are one
relationship, a curve and the record of its bending, read forwards on one page and backwards on the other.

## What this is *not*

The evolute is an **envelope** — the curve a family of normals leans on — which makes it the near kin, and
the natural sequel, of the **[caustic](../2026-11-27-caustic/)**: the same envelope construction, turned from
a mirror's reflected rays onto a curve's own normals, and it draws the same named astroids and cardioids. It
differs from the curves *traced* nearby. An **[epicycle](../2026-11-26-epicycle/)** rolls a wheel on a wheel
to draw an astroid; a **[cycloid](../2026-11-22-cycloid/)** is a point on a wheel rolled along a line — and
its evolute, found here, is an equal cycloid. A **[linkage](../2026-11-24-linkage/)**'s coupler point is
forced along its path by rigid bars; a **[tracery](../2026-11-25-tracery/)** figure is a pen pulled two ways
at once. All of those *lay a point down along* a curve. The evolute is the opposite question — not what path a
point takes, but where the curve keeps its curvature — and its reverse, the **[involute](../2026-08-22-involute/)**,
was met on its own day from the other side: there a string unwound for its own sake, here as the move that
undoes the evolute. The nearest neighbour of all is **[differential](../2026-09-22-differential/)**, where the
rate of turning was the whole subject; the evolute is that rate, drawn out as a line.

## What's here

Two folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no network
once it has loaded. Each builds a real curve and reads its curvature honestly: the centre of curvature from
the curve's own first and second derivatives, the evolute as the track of those centres *and* as the meeting
of adjacent normals, the involute as a string let out by true arc length. No companion curve is drawn from its
equation; each is read off the construction, and the two descriptions are shown to coincide. Each names the
curve it finds — the stretched astroid, the gear-tooth spiral, the equal cycloid — and lets a single number
(the ellipse's shape, the string let out) carry the figure through its family, including the degenerate circle
whose evolute is a point. Each keeps its settings in `localStorage`, reads itself to a screen reader through a
live status line, holds still under `prefers-reduced-motion` (the curve shown drawn whole, one normal held
against it), and works from the keyboard. Open either `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it. Some
mornings, two. 2026-11-28. Every curve keeps a second curve: the track its centre of curvature rides, and the
string that winds it back.*
