# Closer

**A door closer is two parts pulling opposite ways: a spring that wants the leaf shut
now, and a dashpot — a piston in a cylinder of oil — that resists the leaf in
proportion to how fast it moves and turns that motion into heat. The spring supplies
the will to close; the dashpot supplies the manners. Set the check too light and the
spring wins and the leaf slams the frame; set it too heavy and the leaf crawls and
hangs ajar. Between them is one setting — critical damping — where the leaf reaches the
latch as fast as it possibly can without overshooting, and lands clean.**

The spring is the simple half. Wind it and it stores a closing force it returns the
instant you let go, always pulling toward shut. Alone, it would swing the leaf into the
frame and let it rebound, over and over, because a spring gives back everything it
takes. It needs a partner that *loses* energy, and loses it fastest when the leaf moves
fastest. That partner is the dashpot: force it quickly through its oil and it fights
hard; ease it and it barely resists — `F = c·v`, resistance in proportion to speed. So
it does nothing to hold the leaf in place and everything to check a fast swing, which is
exactly the manners a close wants: free early, when the leaf is far out and slow; firm
late, as the spring whips it toward the jamb.

## The one relation, read three ways

Take the leaf's inertia `m`, the spring `k`, and the check `c`. Idealise the hinge as
frictionless, and the whole close is a second-order system read through one number, the
*damping ratio*:

- **It has a natural swing.** `ωn = √(k ⁄ m)` — the rate the spring and the leaf would
  rock, undamped. This is the clock everything else is measured against.
- **Damping is the one dial.** `ζ = c ⁄ (2·√(k·m))` — the check measured against that
  swing. Below one the leaf **rings**, overshooting the latch and rebounding; above one
  it **crawls**, creeping home with no overshoot but taking its time; at exactly one —
  **critical** — it arrives in the least time with no overshoot at all.
- **The dashpot stores nothing.** The spring energy not left in the shut door is burned
  in the oil, `P = c·v²` — all to heat, none returned. A dashpot can only ever subtract a
  swing, never start or hold one. Its single product is the death of motion.

Those three are one fact. The swing to tame is set by the spring and the leaf; the
taming by the check against that swing; and the taming can only spend, never store — so
the best answer is not "as much check as possible," it is *just enough*. Under-check and
it bangs; over-check and it hangs; and the best is the narrow band between, where it
merely lands.

## The bench

A leaf on a closer, released from open. Set the **spring** — how hard it pulls shut —
and the **check** — how hard the dashpot resists. The arrival trace climbs from open to
shut: too little check and it overshoots the *shut* line and bangs into the stop; too
much and it crawls and never reaches the latch inside the window; at critical damping it
lands clean in the least time. The panel reads the damping ratio against one, the
regime, the overshoot into the stop, the time to latch within 2%, the free swing period,
and the critical check that would land it. A gauge sets `ζ` against the `ζ = 1` mark.
Press *Land it* to set the check that lands it for this spring.

The spring and the check are kept in `localStorage`, so a reader finds the bench as they
left it. A live status line (`aria-live`) reads each arrival to a screen reader — the
spring, the check, the damping ratio, and whether the leaf lands, bounces, slams, sweeps
slow, or hangs — debounced past slider drags. Under `prefers-reduced-motion` the leaf is
not animated: the full arrival trace is shown at once and the leaf held at its settled
position, each state read as a settled arrangement rather than a running swing; a live
change to the setting is honoured. The whole bench works from the keyboard — <kbd>C</kbd>
lands it, <kbd>R</kbd> resets, <kbd>[</kbd>/<kbd>]</kbd> ease and add check,
<kbd>−</kbd>/<kbd>=</kbd> soften and stiffen the spring, and <kbd>space</kbd> releases the
leaf again.

One HTML file, one stylesheet, one script. No build, no network once it has loaded. The
hinge is idealised as frictionless and the spring as linear, but the arrival is exact:
it is the step response of `m·ẍ + c·ẋ + k·x = k`, and the setting that lands it is
`ζ = c ⁄ 2√(k·m) = 1`.

*One of three trades for a single old working word — see [the three](../). 2026-09-28.*
