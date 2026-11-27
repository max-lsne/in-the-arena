# Caustic

**Two small pages, made the same morning, for one idea: a curve need not be drawn point by point — it can
be *wrapped*, born as the single line a whole family of straight lines leans against and never crosses.
That curve is the family's **envelope**, and the brightest thing it names is the **caustic** — the cusped
glow light folds itself onto after bouncing off a curved mirror, the shape you can see burning across the
bottom of a coffee cup in the sun. Each reflected ray is a straight chord; the chords cross everywhere, but
along one curve they crowd together and go, for an instant, the same way — and crowded light is bright.
Take the light away and the idea is barer still: lean a ladder in every position between two walls, or join
each number on a clock face to its double, and the straight lines you lay down wrap a curve just the same.
One construction — a family of lines and the boundary they keep — met once as light folded in a mirror and
once as plain lines wrapping a shape.**

The surprise is *which* curves turn up. A circular mirror folds parallel light onto a **nephroid** and a
point source on its rim onto a **cardioid**; a sliding ladder wraps an **astroid**; a times-table of chords
wraps a cardioid, a nephroid, and their kin. These are exactly the curves the page before this one drew by
rolling a wheel on a wheel — the same named shapes, reached from a third direction. A curve, it turns out,
does not much care how it is made: rolled out by a point, folded out of light, or wrapped by a family of
lines, it is the same curve, and here it is met the last of those three ways.

The envelope of a family of lines `L(t)` is found with no formula at all. As `t` advances each line turns
and slides, and two lines a hair apart cross close by; follow that crossing as the pair draws together and
it settles onto the point where the line is **tangent** to the envelope. So:

```
envelope(t) = limit, as δ→0, of  L(t) ∩ L(t+δ)
```

Both pages compute exactly this — sample the family finely, intersect each line with its neighbour, and the
crossing points *are* the curve. Nothing is plotted from a closed form; the shape is read off the lines.

## The two

- **[Cup](./cup/)** — *the caustic, light folded in a mirror.* A circular mirror and a source of light.
  Each ray reflects off the inside as a **chord**, and the chords crowd onto the bright **caustic**.
  **Parallel** light — a source at infinity — folds onto a **nephroid**, two cusps, the coffee-cup curve;
  a **point source on the rim** folds onto a **cardioid**, one cusp. Slide the source from the rim outward
  and the cardioid's single cusp opens, swelling through the whole family of caustics until, at infinity,
  it settles on the nephroid. Set the source, aim it, move it in and out → watch the cup fold its light,
  and sweep a single ray round to see it kiss the curve it helped make.

- **[Envelope](./envelope/)** — *the same idea with the light taken away.* Just a **family of straight
  lines**, and the curve they wrap. A **ladder** of fixed length sliding with its ends on the two axes
  wraps an **astroid**, the four-cusped hypocycloid. A **times-table of chords** — each point of a circle
  joined to its `m`-th multiple — wraps an **epicycloid of `m−1` cusps**: a cardioid at `m = 2`, a nephroid
  at `m = 3`, three cusps at `m = 4`. Make the multiplier **not whole** and the chords never return to a
  line already drawn: the envelope will not close and the figure **precesses** — the same drift the rolling
  ratio shows when it slips. Pick a family, change its one number → watch the straight lines wrap a curve.

## The one idea

Everything here is a **family of lines** and the curve it leans on — the envelope, found as the place each
line meets its neighbour.

- With the lines made of **reflected light** (chords of a mirror), the envelope is a **caustic** — and for
  a circle it is the nephroid of parallel light or the cardioid of a source on the rim. ([cup](./cup/))
- With the lines laid down **bare** — a sliding ladder, a times-table of chords — the same construction
  wraps an **astroid**, a **cardioid**, a **nephroid**, by straight lines alone. ([envelope](./envelope/))

One construction; two dressings. The coffee-cup caustic and the string-art cardioid are not two tricks that
happen to look alike — they are the one envelope, drawn once with light and once with plain lines.

## What this is *not*

These curves are **envelopes** — wrapped by a family of lines — which makes them the near kin, and the
natural sequel, of the curves nearby in this folder, most of which were drawn the *other* way, by a point
**moving along** the curve rather than lines **wrapping** it. An
**[epicycle](../2026-11-26-epicycle/)** draws a nephroid, a cardioid, an astroid by rolling a wheel on a
wheel — the very curves wrapped here, so these two days are one curve met twice, rolled and wrapped. A
**[cycloid](../2026-11-22-cycloid/)** is a point on a wheel rolled along a line; a
**[tracery](../2026-11-25-tracery/)** figure is a pen pulled two ways at once; a
**[linkage](../2026-11-24-linkage/)**'s coupler point is forced along its path by rigid bars — all *traced*
curves, laid down by one moving point. The envelope is the opposite idea: no point travels it; the curve is
only the boundary a crowd of lines agrees on. The nearest of all is the **[trammel](../2026-08-14-trammel/)**
— *the same sliding ladder*, read for the **ellipse a point on it traces** rather than the **astroid its
whole length wraps**. One sliding rod, a traced curve and an envelope at once: the clearest small proof that
how a curve is made and what curve it is are two separate questions.

## What's here

Two folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each builds a real family of lines — reflected rays off a real mirror, a real
ladder sliding on real axes, real chords of a circle — and computes the envelope honestly every frame as
the intersection of adjacent lines: no curve is drawn from its equation, each is read off the crossing
lines. Each names the curve it finds — nephroid, cardioid, astroid, or the epicycloid by its cusps — and
lets a single number (the source's distance, the multiplier) carry the figure through its family, including
off a whole number into a figure that **precesses** and will not close. Each keeps its settings in
`localStorage`, reads itself to a screen reader through a live status line, holds still under
`prefers-reduced-motion` (the curve shown drawn whole, one line held against it), and works from the
keyboard. Open either `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it.
Some mornings, two. 2026-11-27. A family of straight lines, and the one curve they all agree to wrap.*
