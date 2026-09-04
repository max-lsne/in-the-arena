# Capstan

**Three small pages, made the same morning, for the one law that runs
through three trades: lead a line round a drum and its tension bleeds away
exponentially round the bend, so a hold anyone could supply stands against
a load nobody could. Don't be strong — be wrapped.**

Most days in this folder are one page. Some mornings the idea comes in
threes. A ship is held, a falling climber is caught, a mill's whole power
is carried across a gap — three trades that never met, and every one of
them leaning on the same fact about a rope round a bend. Where a line
presses on a drum, friction shaves a slice of tension off every little
patch of contact, and because each slice is proportional to the tension
still there, the tension **decays exponentially** round the arc. Whatever
comes on at one end, only a fraction `e^(−μθ)` of it survives round the
wrap to the other. Add a turn and you do not subtract a fixed amount of
work from the hand — you divide it by a whole factor again.

## The three

- **[Bollard](./bollard/)** — *hold a ship.* A coaster comes alongside
  with the weight of her drift in the line, and a single dockhand stops
  her with a light pull on the tail — because the hawser is taken three or
  four turns round a post, and the turns, not the hand, hold the ship. A
  page for the load you must **hold** with far less than it weighs.

- **[Belay](./belay/)** — *catch a fall.* A climber comes off with the
  whole force of the fall in the rope, and the belayer arrests it by
  closing one hand — because the rope is run round the bends of a small
  device, and the bends do the braking. The bollard's law carried up a
  mountain and trusted with a life. A page for the load you must **arrest**
  in a moment, on a grip you can keep.

- **[Belt](./belt/)** — *carry the power.* A flat belt, barely tight,
  hands a mill's whole power from shaft to shaft and does not slip —
  because the tight side may stand at `e^(μθ)` times the slack before the
  belt lets go, and the difference between the two is the pull delivered.
  A page for the load you must **carry**, on a band you never have to
  strain.

## The one law

All three trades learned the same thing, and none of them from each other.
Follow the rope round the drum through a small angle `dθ`. It presses on
the surface with a force set by its own tension, and friction on that
patch removes a slice of tension proportional to both the tension there
and the little angle:

- **`dT = −μ·T·dθ`** — the loss is proportional to the tension itself, so
  it compounds.
- **`T(θ) = T₀·e^(−μθ)`** — the tension therefore decays exponentially
  round the wrap.
- **`A = e^(μθ)`** — the ratio of the two ends. One newton at the hand
  stands against `A` newtons of load, and the whole affair depends on
  **only** the wrap angle `θ` and the surface roughness `μ` — never on the
  drum's radius, nor the rope's thickness.

Two lessons live in those three lines, and all three pages are built to
show them. The **wrap** `θ` is the one you choose on the spot, and because
it enters through an exponential a little more of it goes a very long way —
each full turn multiplies the amplification by `e^(2πμ)`. The **surface**
`μ` is the one the world hands you, and a wet post, an iced rope or a
glazed belt quietly halves the exponent and lets a hold you trusted begin
to surge, run, or slip. You do not hold a great load by being great. You
hold it by how many times you let it go round the bend before you catch
what is left.

It is the same discipline the [purchase](../2026-08-01-purchase/) knows
about trading distance for force through a tackle, the
[holdfast](../2026-05-22-holdfast/) knows about gripping harder the harder
it is pulled, and the [preload](../2026-09-01-preload/) knows about
spending a joint's danger in advance. Wrap the drum.

## What's here

Three folders, each a self-contained page — one HTML file, one
stylesheet, one script, no build and no network once it has loaded. Each
carries the same interactive bench worked in its own trade: wrap the drum,
set the surface, then take the strain, weight the rope, or drive the belt,
and read the wrap coloured by the tension surviving to each point while
the diagram plots the exponential decay and the line of a single human
hold. Open any `index.html` in a browser.

*One of a series — a page a day, each built on one old working word and
the discipline hidden inside it. Some mornings, three. 2026-09-04.*
