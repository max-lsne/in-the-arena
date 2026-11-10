# Detent

**Three small pages, made the same morning, for the humblest holding part in the box: the
detent — a spring pressing a ball into a notch, so a moving thing has one place it would rather
be. No latch gets in its way, no pawl catches it, no thread winds it tight. The notch is simply
the bottom of a little valley cut into the work, and the spring keeps rolling the ball down to
it. Left alone it rests there holding nothing and asking for nothing. Push against it and it
pushes back — gently at first, then harder, until at the crest of the valley it gives all at
once and drops into the next notch with a click you can feel. That click is the whole of it,
read three ways: the *well* that holds, the *crest* that must be cleared to leave, and the
*ring* of them that counts out a dial in steps you can trust.**

Most days in this folder are one page. Some mornings the idea arrives already in threes. A
*detent* is a catch that positions rather than locks — from the old French *détente*, the
release of a crossbow, the part that *lets go* at the chosen moment. It is the click in a
camera dial, the stop in a ratchet screwdriver, the notch a gear-lever rests in, the soft
cl-cl-cl of a good volume knob. Every one is the same bargain: a spring, a ball, and a surface
with dimples cut in it, trading a little force at the crest for a position that holds itself and
comes back exactly where it was.

## The three

- **[Seat](./seat/)** — *the well itself.* One notch, one sprung ball. The bottom of the notch
  is the lowest energy the ball can have, so it rests there with no torque at all; nudge it and
  the flank pushes it straight back. Near the bottom the notch is a near-perfect bowl, so a
  disturbed detent returns like a weight on a spring — overshoots, and settles.
  Set the preload, the depth, the spacing → drag the ball off its seat → watch it fall back.

- **[Climb](./climb/)** — *the force to leave.* To move off a detent you must drive the ball up
  and over the crest, against a torque that rises to a peak partway up and then lets go. That
  peak is the **breakaway** — the firmness of the click. Steeper flanks, deeper notches, a
  stiffer spring: each raises it. Turn too softly and it holds where it is; turn past the peak
  and it snaps to the next seat.
  Set the geometry → raise the applied torque → find the peak → hold, or click over.

- **[Dial](./dial/)** — *a ring of seats.* Line the notches up around a wheel and you have a
  knob that turns in **counted steps**: it will not stop between detents, and it lands on every
  one the same. Add friction and the breakaway going forward differs from going back — a
  **hysteresis** you feel as backlash-free deadness. Count, depth and friction together are the
  whole character of a dial, from a camera's crisp stops to a valve's stiff notches.
  Set the count and the friction → turn the dial → feel it click from stop to stop.

## The one shape

Everything here is one curve read three ways. Let the ball's lift out of a seat, as the wheel
turns through an angle `φ`, be

```
x(φ) = (d/2) · (1 − cos(2π·φ/P))
```

— zero at the bottom of a notch, rising smoothly to the full depth `d` at the **crest**,
halfway to the next notch a period `P` away. The spring, with preload `F₀` and stiffness `k`,
stores

```
U(φ) = F₀·x + ½·k·x²
```

and the torque the detent puts on the wheel is the slope of that energy, `−dU/dφ`. Read it off
the one curve:

- At the **bottom** the slope is zero — a stable rest, holding a position for free. ([seat](./seat/))
- Climbing out, the slope rises to a **peak** partway up and falls back to zero at the crest —
  the breakaway torque you must beat to leave. ([climb](./climb/))
- Past the crest the slope flips sign and the ball is pulled *down into the next notch* — the
  click, and the counted step of a dial. ([dial](./dial/))

One notch is a rest; the crest between two notches is a threshold; a ring of them is a counter.
The spring never changes its mind — it only ever pushes the ball toward the nearest bottom. All
three behaviours are that one fact, read at the bottom, at the crest, and all the way round.

## What the detent is *not*

It is worth saying what this holding is, by what it is not. A **[pawl](../2026-09-24-pawl/)**
holds in one direction only and slips freely in the other; a detent holds *both* ways and
breaks the same either way — symmetric by design. An **[escapement](../2026-07-30-escapement/)**
releases one step per swing on a clock's schedule; a detent releases on *your* push, when you
choose. A **[thread](../2026-11-08-whorl/thread/)** holds by a slope gentler than friction and
unwinds continuously; a detent holds by a slope that is *zero at the rest* and positions in
discrete steps. The detent's whole trick is that the resting place costs nothing to hold and
the leaving costs a definite, repeatable amount — which is exactly what you want when a thing
must stop *somewhere in particular* and stay there until told otherwise.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build
and no network once it has loaded. Each works the same sprung ball against the same notched
wheel, read in its own trade: the well that holds, the crest that must be cleared, the ring that
counts. Each keeps its settings in `localStorage`, reads itself to a screen reader with a live
status line, holds still under `prefers-reduced-motion` (the mechanism shown at its settled
place, seated square), and works from the keyboard. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden
inside it. Some mornings, three. 2026-11-10. A spring, a ball, a notch, and the click between.*
