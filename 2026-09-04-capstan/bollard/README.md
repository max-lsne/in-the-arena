# Bollard

**A small page for the hold that lives in a bend — a dockhand takes a
hawser a few turns round a post and holds a ship, because friction round
the wrap multiplies his pull by `e^(μθ)` and the load barely reaches his
hand.**

A coaster comes alongside with the whole weight of her drift behind the
line, and a single person stops her and eases her in with a light pull on
the loose end. He is not stronger than the ship. He has taken the hawser
three or four turns round a **bollard**, and the post — or rather the
friction of the rope on it — does very nearly all the holding.

## The pitch in one breath

A ship adrift stores more energy than any crew can absorb by grip, and a
line held straight in the hands would tear free or take the crew with it.
Yet a ship is held, and stopped, and warped along a wall, by people who
could not out-pull a bicycle — because a rope led round a drum does not
carry the same tension at both ends. Friction round the bend bleeds the
tension away, so the great load at one side arrives at the other as a mere
tail. The dockhand never fights the ship; he holds the small change the
wrap leaves him, and lets the turns fight the ship.

## The one relation

Follow the rope round the post through a small angle `dθ`. It presses on
the drum with a force set by its own tension, and friction removes a slice
proportional to both: `dT = −μ·T·dθ`. A loss proportional to the thing
itself decays exponentially, and round the whole wrap that is the
**capstan equation** — Euler's, and Eytelwein's after him:

- **`T_hold = T_load · e^(−μθ)`** — whatever the load, only this fraction
  survives round the wrap to the hand.
- **`A = T_load / T_hold = e^(μθ)`** — one newton on the tail holds `A`
  newtons of ship. It depends on **only** the wrap angle and the surface —
  never the drum's size, nor the rope's thickness.
- Each full turn adds `2π` to `θ` and so **multiplies** `A` by `e^(2πμ)`.
  Amplification is not added a turn at a time; it compounds.

Two lessons: the **wrap** `θ` is the one you choose on the spot, and a
little more goes a very long way; the **surface** `μ` is the one the world
hands you, and a wet or greasy post quietly halves the exponent and lets a
line you thought was fast begin to **surge**.

## The bench

A bollard seen from above, the hawser taken `N` turns round it: the load
comes on at the thick, bright end and what is left runs off thin and faint
to the tail. Set the **wrap** and the **surface** `μ`, then press **Take
the strain** to bring the ship's pull up and watch how little of it ever
reaches the hand. Below, the **tension diagram**: the pull decaying round
the arc from load to hold, with the line of a single steady human pull —
cross it and one hand can no longer hold, so you take another turn.

Open `index.html` in any browser. One HTML file, one stylesheet, one
script; no build, and no network once the fonts have loaded.

## Its two siblings

- **[Belay](../belay/)** — the same law carried up a mountain: the rope
  run round a device's bends so one brake hand holds a falling climber.
- **[Belt](../belt/)** — the same law turned from holding to carrying: a
  flat belt whose tight side stands at `e^(μθ)` times its slack before it
  slips, handing a mill its whole power.

*One of a series — a page a day, each built on one old working word and
the discipline hidden inside it. Some mornings, three. 2026-09-04.*
