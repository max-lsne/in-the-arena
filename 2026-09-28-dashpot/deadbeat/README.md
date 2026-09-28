# Deadbeat

**Every needle instrument is a tiny pendulum: a coil on a hairspring, with inertia to
swing and a spring to pull it back toward zero. Send a current through it and the needle
wants a new reading — but a pendulum overshoots, and a raw movement would swing past the
mark, back past it, and hunt about the true value for seconds, unreadable, before it
tires. So the maker adds a dashpot — an air vane, a drop of oil, or the coil's own eddy
currents dragging against the field — a damping that resists in proportion to how fast the
needle moves. Too little and it hunts; too much and it crawls up so slowly the reading
comes late. Exactly enough and it is deadbeat: it beats once, lands on the reading, and
dies.**

The hairspring is the will: it sets a definite rest angle for each current and pulls the
needle toward it. But a spring and a mass together are an oscillator — at the mark the
needle is moving fastest and cannot stop on a coin, so it swings through and past. That
overshoot is the enemy of a fast, honest reading. The dashpot fights the needle's *speed*,
`F = c·v`, so it is strongest exactly at the mark, where the needle moves fastest, and
gentlest at the ends of the swing — precisely the manners a reading wants: let the needle
come quickly, then take the overshoot out of it at the last instant.

## The one relation, read three ways

Take the movement's inertia `m`, the hairspring `k`, and the damping `c`. Idealise the
pivot as frictionless, and the swing to a new reading is a step response read through the
*damping ratio*:

- **It has a natural swing.** `ωn = √(k ⁄ m)` — how fast the needle and hairspring would
  oscillate, undamped. A lighter movement swings faster and settles sooner.
- **Damping is the one dial.** `ζ = c ⁄ (2·√(k·m))` — the drag against that swing. Below
  one the needle **hunts**, overshooting the mark and swinging back; above one it
  **crawls**, creeping up with no overshoot but taking its time; at exactly one —
  **deadbeat** — it reaches the mark in the least time with no swing past it at all.
- **The dashpot stores nothing.** The swing's energy goes to heat — in the vane's air,
  the oil, or the eddy currents in the coil, `P = c·v²` — and never returns. Damping can
  only end a swing, never start one; a deadbeat movement is one that *forgets* its
  momentum exactly at the reading.

Those three are one fact. Hunt and the reading is unreadable; crawl and it is late; and
the fastest honest reading is the one that beats once — the least damping that lands the
needle without a swing.

## The bench

A needle swings from an old reading to a new one. Set the **movement** — the inertia of
the needle and coil — and the **damping** — how hard the dashpot resists. The arrival
trace climbs to the reading: too little damping and it overshoots the mark and hunts; too
much and it crawls and never arrives inside the window; at critical damping it beats once
and reads clean. The panel reads the damping ratio against one, the regime, the overshoot
past the mark, the number of swings across the reading, the time to read within 2%, and
the deadbeat damping that would land it. A gauge sets `ζ` against the `ζ = 1` mark. Press
*Read it* to set the damping that reads it deadbeat for this movement.

The movement and the damping are kept in `localStorage`, so a reader finds the bench as
they left it. A live status line (`aria-live`) reads each arrival to a screen reader — the
movement, the damping, the damping ratio, and whether the needle reads, swings, hunts,
lags, or crawls — debounced past slider drags. Under `prefers-reduced-motion` the needle
is not animated: the full arrival trace is shown at once and the needle held at its
settled reading, each state read as a settled arrangement rather than a running swing; a
live change to the setting is honoured. The whole bench works from the keyboard —
<kbd>C</kbd> reads it, <kbd>R</kbd> resets, <kbd>[</kbd>/<kbd>]</kbd> ease and add damping,
<kbd>−</kbd>/<kbd>=</kbd> lighten and weight the movement, and <kbd>space</kbd> sends the
reading again.

One HTML file, one stylesheet, one script. No build, no network once it has loaded. The
pivot friction is idealised away and the reading normalised, but the arrival is exact: it
is the step response of `m·θ̈ + c·θ̇ + k·θ = k`, and the setting that reads it deadbeat is
`ζ = c ⁄ 2√(k·m) = 1`.

*One of three trades for a single old working word — see [the three](../). 2026-09-28.*
