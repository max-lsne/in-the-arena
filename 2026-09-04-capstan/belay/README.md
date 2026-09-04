# Belay

**A small page for the hold that lives in a bend — a climber falls with
the whole force of the fall in the rope, and the belayer arrests it with
one hand, because friction round the device's bends multiplies the grip by
`e^(μθ)` and the fall barely reaches the brake hand.**

A climber comes off, and the person below stops the fall — not by being
stronger than a falling body, but by closing one hand. The rope has been
run through the bends of a small **belay** device, and the bends, or
rather the friction of the rope round them, do very nearly all the
holding. It is the bollard's trick brought to the mountain and made small
enough to carry.

## The pitch in one breath

A falling climber is an energy to be caught in a moment, and a rope held
straight in the hands would be torn through them, burning and gone. Yet a
fall is held, again and again, by a belayer lighter than the climber
gripping with a fraction of their strength — because a rope run round a
bend does not carry the same tension at both ends. Friction round the wrap
bleeds it away, so the great force above dies to a mere pull at the brake
hand below. The belayer never out-pulls the fall; they hold the small
change the wrap leaves them, and never let the bend straighten.

## The one relation

Follow the rope round the device through a small angle `dθ`. It presses on
the metal with a force set by its own tension, and friction removes a
slice proportional to both: `dT = −μ·T·dθ`. A loss proportional to the
thing itself decays exponentially, and round the whole wrap that is the
**capstan equation**:

- **`T_brake = T_fall · e^(−μθ)`** — whatever the fall, only this fraction
  survives round the wrap to the brake hand.
- **`A = T_fall / T_brake = e^(μθ)`** — one newton of grip holds `A`
  newtons of fall. It depends on **only** the bend angle and the surface —
  never on how thick the rope is.
- More wrap **multiplies** the amplification rather than adding to it,
  which is why a device with two bends brakes so much harder than a bar
  with one.

Two lessons: the **wrap** `θ` is set by the device and by keeping the
brake hand low — let it up and the rope straightens, the wrap falls away,
and the hold collapses; the **surface** `μ` is what the day hands you, and
a wet, iced or muddy rope quietly halves the exponent and lets a hold you
trusted begin to **run**.

## The bench

A belay device with the rope run round its bends: the fall comes on at the
thick, bright end and what is left runs off thin and faint to the brake
hand. Set the **wrap** and the **surface** `μ`, then press **Weight it**
to bring the fall force on and watch how little of it ever reaches the
brake hand. Below, the **tension diagram**: the force decaying round the
arc from fall to brake, with the line of a single firm brake hand — cross
it and the rope runs, so you add wrap or friction.

Open `index.html` in any browser. One HTML file, one stylesheet, one
script; no build, and no network once the fonts have loaded.

## Its two siblings

- **[Bollard](../bollard/)** — the same law at the harbour: a hawser taken
  a few turns round a post so one dockhand holds a ship.
- **[Belt](../belt/)** — the same law turned from holding to carrying: a
  flat belt whose tight side stands at `e^(μθ)` times its slack before it
  slips, handing a mill its whole power.

*One of a series — a page a day, each built on one old working word and
the discipline hidden inside it. Some mornings, three. 2026-09-04.*
