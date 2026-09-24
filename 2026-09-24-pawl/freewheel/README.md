# Freewheel

**A freewheel is the pawl-and-ratchet turned into a clutch. Spring pawls ride a
toothed hub ring: drive it forward and they catch a tooth and carry the wheel; stop
driving and they skate over the teeth — click, click — and the wheel runs on free.
It is a rectifier of drive, read as a one-way clutch: it passes the forward half of
your pedalling and lets the coast slip. Two things bound it. Between the teeth is
free play — a push shorter than one tooth engages nothing, and the pitch itself is
the engagement lag you feel before the drive bites. And the pawls carry only to
their capacity, so a grade past their strength makes them skip: they shear over the
teeth and the drive lurches and slips.**

It is the *relative* motion of ring and pawl that decides. Drive the crank faster
than the wheel turns and the pawls meet the steep tooth-faces and catch — the crank
carries the wheel. Let the wheel outrun the crank, coasting, and the teeth stream
past the easy way and lift the pawls over each tip. So you can stop pedalling and
keep rolling, and start again and instantly bite: forward effort passes through, the
coast slips past.

## The one relation, read three ways

Take the push you drive (an angle at the hub), the ring's pitch `p = 360 ⁄ N` for `N`
teeth, and the load `L` the grade puts on the drive. Idealise the ratchet as rigid:

- **It engages in whole teeth.** `driven = p · ⌊push ⁄ p⌋`. A push carries the wheel
  by as many whole teeth as it covers; the remainder is *free play*, and the pitch
  `p` is the *engagement lag* — the crank you turn before a pawl catches. Push
  shorter than one tooth and nothing is driven.
- **It carries to the pawls.** They carry the drive while `L ≤ H`, their capacity. A
  steeper, coarser ring has a larger `H`; a fine ring a smaller one — the price of
  quick pickup.
- **Past the pawls, it skips.** `L > H` and they shear over the teeth: the drive
  *slips*. The clutch lets go, and your effort no longer reaches the wheel.

The two limits pull opposite ways, and the cut of the ring is where you settle them.
Fine gives instant pickup but skips under a hard stamp; coarse takes a big stamp but
wastes a long dead spot before it bites. No ring picks up at once and never skips —
a rider chooses the compromise by the riding.

## The bench

A hub ring with spring pawls and a driving crank. Set the **push** you drive and the
**cut of the ring**, and watch how many whole teeth a push engages and how much is
free play — the staircase plots teeth driven against degrees pushed, the gap up to
the dashed line the engagement lag. Set the **grade** and read whether the pawls
carry, near their edge, or skip. Press *Pedal* to take one push: the ground driven
only climbs and coasts on when you stop, until you overload the pawls and they slip.
*Find the skip* sets the grade to the exact load the pawls let go at; *Reset* returns
the freewheeling default.

The push, grade, ring, and ground driven are kept in `localStorage`, so the hub
stands where you left it. A live status line (`aria-live`) reads each state to a
screen reader — the ring and its pitch, the teeth driven and the free play, and
whether the pawls carry, near their edge, or skip — debounced past slider drags.
Under `prefers-reduced-motion` the hub does not spin or coast and the crank rests at
its push rather than sweeping; each state lands as a settled arrangement, and a live
change to the setting is honoured. The whole bench works from the keyboard —
<kbd>P</kbd> or <kbd>Space</kbd> pedals, <kbd>F</kbd> finds the skip, <kbd>R</kbd>
resets, <kbd>1</kbd>–<kbd>4</kbd> cut the ring, <kbd>[</kbd> and <kbd>]</kbd> shorten
and lengthen the push, and <kbd>−</kbd>/<kbd>=</kbd> ease the grade and steepen it.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The ratchet is idealised as rigid, but the shape is
exact: a push drives whole teeth `p · ⌊push ⁄ p⌋`, the pitch is the engagement lag,
and the pawls carry until the load beats them.

*One of three made the same morning on the one law — see [the day's README](../).
2026-09-24.*
