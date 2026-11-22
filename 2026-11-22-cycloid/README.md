# Cycloid

**Three small pages, made the same morning, for one curve: the cycloid — the path a single point on
the rim of a rolling wheel writes as the wheel runs along a line. It is a plain enough thing to draw —
chalk a dot on a tyre and push the car a turn — but it hides two of the most beautiful results in all
of mechanics, and they are the same curve turned upside down. Right way up it is the *arch*, cusp to
cusp, still where it touches the ground and twice hub-speed over the top. Flipped into a trough it is
the *brachistochrone*, the ramp of quickest descent between two points, beating the straight line and
the circle. And a bead let go anywhere on that same trough reaches the bottom in the same time as a
bead let go an inch from it: the *tautochrone*, the curve that keeps time regardless of how far it
swings.**

Most days in this folder are one page. Some mornings the idea arrives already in threes — and the
cycloid is the plainest case of it, because the *same curve* answers three different questions, and the
only honest way to show that is to put the three side by side. The curve is

```
x = r(φ − sin φ),   y = r(1 − cos φ)
```

one arch for every turn of a wheel of radius `r`. That is the whole object. What changes between the
three pages is not the curve but the question asked of it: *what does it look like?*, *what is it good
for going down?*, and *why does it keep such even time?*

## The three

- **[Arch](./arch/)** — *the curve itself.* Roll the wheel and watch a rim point trace its arch. The
  point is dead still at the cusp — the contact with the ground is the pivot the whole wheel turns
  about — and races at **twice the hub's speed** over the top. Slide the tracing point in off the rim
  and the cusps round into *curtate* humps; slide it out, where a train wheel's flange reaches below the
  rail, and the path loops **backward**. One arch is exactly `8r` long and encloses `3πr²`.
  Roll the wheel → read the speed → find the cusp and the double-speed top.

- **[Brachistochrone](./brachistochrone/)** — *the quickest slide.* Release a bead from `A` to a lower
  point `B` off to the side, under gravity, no friction. A straight ramp is the shortest road but not
  the fastest; a circular arc does better; the **inverted cycloid** beats them both — and when `B` is far
  to the side it wins by *dropping below* `B` first, trading a steeper plunge for speed it spends getting
  back up. Race all three beads and watch the cycloid arrive first.
  Set the target → drop the three beads → see the cycloid win, and why.

- **[Tautochrone](./tautochrone/)** — *the evenest fall.* Line a cup with the same cycloid and drop
  beads from different heights at the same instant. They all reach the bottom **together**, and stay in
  step forever after — the period is `π√(r/g)`, with no amplitude in it. A circular bowl only fakes this
  for small swings. It is why Huygens bent a pendulum onto cycloidal cheeks to make a clock that keeps
  time whatever the swing — the problem the **[escapement](../2026-07-30-escapement/)** meets from the
  other side.
  Drop the beads → watch them meet at the bottom → switch to a circle and watch them drift apart.

## The one curve

Everything here is `x = r(φ − sin φ), y = r(1 − cos φ)`, asked three questions.

- Read **right way up**, it is the path of a rolling point: cusp, arch, cusp — still at the bottom,
  double-speed at the top, `8r` to the turn. ([arch](./arch/))
- Read **upside down as a ramp**, it is the one curve a frictionless bead slides down in least time
  between two fixed points — the *brachistochrone*, Johann Bernoulli's 1696 challenge to Europe.
  ([brachistochrone](./brachistochrone/))
- Read **upside down as a cup**, it is the one curve on which a bead's slide is pure simple-harmonic in
  its own arc length, so the time to the bottom is the same from any height — the *tautochrone*, Huygens'
  isochronous pendulum. ([tautochrone](./tautochrone/))

One curve drawn by a wheel; one ramp that is quickest; one cup that keeps time. The three are not three
curves that happen to look alike — they are the one cycloid, met from three sides.

## What the cycloid is *not*

The height of a rolling point, `r(1 − cos φ)`, is a plain raised cosine — the same clean rise the
**[swash](../2026-11-18-swash/stroke/)** plate makes and close kin to a **[crank](../2026-11-15-crank/)**'s
stroke; what makes the cycloid its own curve is the *roll*, the `−r sin φ` smearing that rise sideways
into a cusp. A **[catenary](../2026-08-18-catenary/)** also hangs in a trough and also looks like a
parabola and is not one — but the catenary is the shape a chain *finds* by hanging, where the cycloid is
the shape you must *impose* to win the race or keep the time. And where an **[escapement](../2026-07-30-escapement/)**
fights a pendulum's bad timekeeping by feeding it energy in careful bites, the cycloid fixes the timing
at the root, by bending the path until the period stops depending on the swing at all.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each works the one curve in its own trade: the rolling arch, the quickest
ramp, the evenest cup. Each keeps its settings in `localStorage`, reads itself to a screen reader with a
live status line, holds still under `prefers-reduced-motion` (the wheel shown mid-arch, the beads set on
their tracks), and works from the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it.
Some mornings, three. 2026-11-22. A wheel rolls, and leaves the one curve that is quickest down and
evenest in time.*
