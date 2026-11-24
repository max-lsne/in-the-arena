# Linkage

**Three small pages, made the same morning, for one stubborn problem: how do you draw a straight line
with a machine? Not measure one, not scribe one against a rule already made straight — *generate* one,
as pure motion, from nothing but rigid bars pinned at their ends and turned. A wheel gives you a circle
for free; a straight line is astonishingly hard. For most of the age of steam it could not be done
exactly at all, and the whole of precision engineering — flat planes, true slides, the guideways a
piston runs in — had to be bootstrapped from approximations of it. This folder is the straight line met
three ways: James Watt's famous near-miss, the exact solution that took eighty more years to find, and
the elegant Russian approximation that learned, as a side effect, to walk.**

Most days in this folder are one page. Some mornings the idea arrives already in threes — and the
straight-line problem is the plainest case of it, because *the same question* ("turn a crank, get a
straight line") was answered three genuinely different ways, and the only honest way to show the gap
between "nearly" and "exactly" is to put the three side by side and watch the pens. A pin-joint can only
swing in a circle. A bar can only hold two pins a fixed distance apart. Out of those two poverties the
whole of planar mechanism is built, and a dead-straight line is the hardest honest thing to ask of it.

## The three

- **[Watt](./watt/)** — *nearly straight, and good enough to build an empire on.* Two equal rockers on
  two fixed pins, a coupler bar across their tips, and a pen at the coupler's **midpoint**. The pen
  traces a long thin **figure-eight**, and through the crossing in the middle the curve is so close to a
  straight line that Watt used it to guide the piston rod of the double-acting engine. "I am more proud
  of the parallel motion than of any other mechanical invention I have ever made," he wrote. It is a
  *lie* — the line bows — but a lie smaller than the iron it was cut from.
  Rock the beam → trace the eight → magnify the error and watch the straight part bow.

- **[Peaucellier](./peaucellier/)** — *exactly straight, at last.* Seven bars, two fixed pins, and a
  theorem. A rhombus of four equal bars, two long arms anchoring it to one pin, and a crank on the other
  — and the pen traces a line **true to the last decimal**, not an approximation that happens to look
  straight but a straight line *forced* by geometry. The trick is **inversion**: the machine computes
  `OP · OP′ = constant`, and the inverse of a circle through the centre is a perfect straight line. Posed
  as impossible for decades; solved by Peaucellier in 1864, rediscovered by the student Lipkin. Show a
  Victorian this and watch the century turn over.
  Turn the crank → trace the exact line → nudge the crank pin off the circle and watch the line bow into
  an arc.

- **[Chebyshev](./chebyshev/)** — *nearly straight, and it learned to walk.* A four-bar in the
  proportion `2 : 5 : 5 : 4`, pen at the coupler midpoint, tracing a curve with a long flat top. Pafnuty
  Chebyshev went hunting for the *best possible* approximation — the theory of minimax approximation grew
  partly out of this exact chase — and when he turned the flat segment downward and set several in phase,
  the flats became **footfalls**: his *Plantigrade machine*, 1878, a table that walks on straight-line
  feet while its body rides dead level.
  Trace the flat → turn it under → set the legs in phase and watch the body ride level as the feet pace a
  straight floor.

## The one problem

Everything here answers *generate a straight line from turning bars* — and the three answers sort cleanly
into two kinds and a gulf between them.

- **Approximate** (Watt, Chebyshev): a cleverly-proportioned four-bar whose coupler point *happens* to run
  nearly straight across a short central stretch. Cheap — four bars — and everywhere in real machinery,
  because "nearly" is usually enough and always was. The curve is really a bowed loop; you use the part
  of it that bows least. ([watt](./watt/), [chebyshev](./chebyshev/))
- **Exact** (Peaucellier): a line that is straight *by proof*, for the whole stroke, because the mechanism
  is a physical inversor and the image of a circle-through-the-centre is a line. Dearer — seven bars — and
  mostly a monument, because by the time it was found, planing and scraping could already make a straight
  edge to work the approximations against. ([peaucellier](./peaucellier/))

The gulf is the whole story: for eighty years between Watt and Peaucellier it was an open question whether
an exact straight-line linkage was even *possible*. Watt thought not. Chebyshev, trying to prove it
impossible, invented a branch of approximation theory instead. Peaucellier proved it possible with a
rhombus and two long arms.

## What a linkage is *not*

A linkage is not a cam and not a gear. A **[cam](../2026-08-27-cam/)** writes any motion you
like into a shaped edge and reads it back with a follower: freedom bought with a machined profile. A
**[gear train](../2026-09-22-differential/)** trades turns for turns through teeth cut to a curve. A
linkage has neither a profile nor teeth — only straight bars and round pins, the two cheapest things a
smith can make — and it buys its motion purely from *lengths and pivots*. That is its poverty and its
elegance both: a **[crank](../2026-11-15-crank/)** turns rotation into a swing, a
**[trammel](../2026-08-14-trammel/)** of Archimedes draws an ellipse from two sliding pins, a pantograph
copies a drawing larger — all the same family, rigid bars pinned at the ends, and the straight line is
the one member of it that had to be *hunted*. Where a
**[cycloid](../2026-11-22-cycloid/)** is a curve a point *falls* into by rolling, the straight line is a
curve a linkage must be *forced* to draw, against the circular grain of every joint it is made from.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each solves a real linkage by its true closure every frame (two circles
intersected, the moving branch tracked by continuity, nothing faked), draws the pen and the curve it
writes, and magnifies the straightness so you can see "nearly" and "exactly" with your own eyes. Each
keeps its settings in `localStorage`, reads itself to a screen reader through a live status line, holds
still under `prefers-reduced-motion` (the bars shown mid-stroke, the curve drawn whole), and works from
the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it.
Some mornings, three. 2026-11-24. Rigid bars and round pins, turned until they draw the one line they are
least willing to.*
