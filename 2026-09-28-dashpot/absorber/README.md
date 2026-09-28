# Absorber

**People call the whole strut a "shock absorber," but the spring absorbs nothing — it
stores the bump and hands it straight back, and a car on springs alone would pogo down
the road after every pothole. The absorber is the other part: a dashpot, a piston forced
through oil, that resists the body's motion in proportion to how fast it moves and turns
that motion into heat. Too little and the body floats and wallows while the tyre skips
off the road and loses grip; too much and the damper locks the body to the wheel and
every bump comes straight through. Between them is critical damping, where a bump dies in
a single motion.**

Hit a bump and the wheel drives up into the body; the spring compresses, stores the
blow, and pushes back — past level, then back down past level, on and on, because a
spring is a bank that never charges a fee. Something must *lose* the energy, and lose it
fastest when the body moves fastest. That is the dashpot. Because it fights speed, not
position — `F = c·v` — it does nothing to hold the car at ride height and everything to
kill a fast bob. Comfort is not softness; it is loss, timed right.

## The one relation, read three ways

Take the sprung mass `m`, the spring `k`, and the damper `c`. Idealise the tyre and road
as one sprung mass, and the recovery from a bump is a second-order system read through
the *damping ratio*:

- **It has a natural bob.** `ωn = √(k ⁄ m)` — the rate the body bounces on its spring,
  undamped. A heavier load bobs slower; this is the frequency the damper must tame.
- **Damping is the one dial.** `ζ = c ⁄ (2·√(k·m))` — the damper against that bob. Below
  one the body **floats**, bobbing past level again and again; above one it **drags**,
  sinking back slow and stiff; at exactly one — **critical** — it returns to level in one
  motion, in the least time. Ride engineers often pick a little under one on purpose,
  trading a touch of float for a softer ride — but past that the float owns the car.
- **The dashpot stores nothing.** Every joule taken out of the bounce leaves as heat in
  the oil, `P = c·v²` — which is why a hard-worked damper runs hot and a worn one that
  has boiled its oil stops damping at all. It can only subtract the bob, never return it.

Those three are one fact. Float loses grip; harshness loses comfort; and the honest
middle — one clean motion — is bought with exactly enough loss and no more. Under-damped,
the tyre leaves the road; over-damped, the road comes into the cabin.

## The bench

A wheel takes a bump; the body responds through a spring and a damper. Set the **load** —
the mass the corner carries — and the **damper** — how hard the dashpot resists. The
recovery trace shows the body dying back to level: too little damper and it bobs past
level again and again; too much and it drags back slow; at critical damping it returns in
one motion. The panel reads the damping ratio against one, the regime, the float
(rebound past level), the number of bobs before rest, the recovery time within 2%, and
the critical damper that would settle it. A gauge sets `ζ` against the `ζ = 1` mark. Press
*Settle it* to set the damper that settles it for this load.

The load and the damper are kept in `localStorage`, so a reader finds the bench as they
left it. A live status line (`aria-live`) reads each recovery to a screen reader — the
load, the damper, the damping ratio, and whether the body settles, wallows, floats,
turns firm, or turns harsh — debounced past slider drags. Under `prefers-reduced-motion`
the body is not animated: the full recovery trace is shown at once and the body held at
its settled level, each state read as a settled arrangement rather than a running bounce;
a live change to the setting is honoured. The whole bench works from the keyboard —
<kbd>C</kbd> settles it, <kbd>R</kbd> resets, <kbd>[</kbd>/<kbd>]</kbd> soften and firm the
damper, <kbd>−</kbd>/<kbd>=</kbd> lighten and load the corner, and <kbd>space</kbd> takes
the bump again.

One HTML file, one stylesheet, one script. No build, no network once it has loaded. The
tyre and road are idealised as a single sprung mass, but the recovery is exact: it is the
free response of `m·ẍ + c·ẋ + k·x = 0` from a unit kick, and the setting that settles it
is `ζ = c ⁄ 2√(k·m) = 1`.

*One of three trades for a single old working word — see [the three](../). 2026-09-28.*
