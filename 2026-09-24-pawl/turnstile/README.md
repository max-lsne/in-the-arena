# Turnstile

**A turnstile is a ratchet you walk through — the plainest rectifier there is, a
machine whose whole job is to turn a two-way crowd into a one-way count. Its rotor
carries stops; a pawl drops behind each, so the arm admits one person a push and
bars the return. Everything a ratchet is, is here with nothing else attached: no
load to lift, no wheel to drive, only the count itself, which only climbs. Two
things bound it. Between the stops is slack — a shove short of the next stop passes
no one and the arm springs back, and the stop-spacing is how fine the count is. And
the pawl bars the return only to its strength, so a press of bodies, a barge, a
forced exit can overpower the stop and drive the tally itself backward.**

The rotor's stops are the same raked teeth as any ratchet — an easy way and a jammed
way. Come at the arm from the front and your push turns it, the pawl dropping behind
the next stop: you pass, *click*, one added to the count. Come at it from behind and
the pawl meets the steep face and holds: the arm is a wall. A turnstile does not
measure how many people there are; it measures how many have *passed* — a milling,
reversible crowd made into an irreversible number.

## The one relation, read three ways

Take the push a person gives the arm (an angle), the rotor's spacing `p = 360 ⁄ N`
for `N` stops, and the back-push `L` pressing the stop the wrong way. Idealise the
ratchet as rigid:

- **It admits in whole stops.** `admitted = p · ⌊push ⁄ p⌋`. A push turns the rotor
  by as many whole stops as it covers — that many through; the remainder is *slack*,
  sprung back. Push shorter than one stop's spacing and no one passes at all.
- **It bars to the pawl.** The pawl bars the return while `L ≤ H`, the stop's
  strength. A steeper, coarser rotor has a larger `H`; a fine one a smaller one — the
  price of a ready, fine-grained count.
- **Past the pawl, it is forced.** `L > H` and the stop is overpowered: the rotor
  turns backward and the count is driven *down*. The one-way gate has failed.

The two limits pull against each other, and the cut of the rotor settles them. Fine
gives a ready count that catches every step but is barged by less; coarse stands a
hard press but needs a full push and misses the timid. No rotor is both perfectly
ready and perfectly firm — the turnstile makes you choose how fine a count you want
and how hard a crowd it must stand.

## The bench

A rotor of stops with barrier arms and a barring pawl. Set the **push** a person
gives the arm and the **cut of the rotor**, and watch how many whole stops a push
passes and how much is slack — the staircase plots stops admitted against degrees
pushed, the gap up to the dashed line the slack. Set the **back-push** and read
whether the pawl counts, nears its edge, or is forced. Press *Admit* to send one
through: the count only ever climbs, until a back-push past the pawl's strength
barges it and drives the tally down. *Find the barge* sets the back-push to the exact
force that overpowers the stop; *Reset* returns the empty gate.

The push, back-push, rotor, and running count are kept in `localStorage`, so the
gate stands where you left it. A live status line (`aria-live`) reads each state to a
screen reader — the rotor and its spacing, the stops admitted and the slack, and
whether the pawl counts, nears its edge, or is forced — debounced past slider drags.
Under `prefers-reduced-motion` the rotor does not spin as it turns and each state
lands as a settled arrangement; a live change to the setting is honoured. The whole
bench works from the keyboard — <kbd>A</kbd> or <kbd>Space</kbd> admits, <kbd>F</kbd>
finds the barge, <kbd>R</kbd> resets, <kbd>1</kbd>–<kbd>4</kbd> cut the rotor,
<kbd>[</kbd> and <kbd>]</kbd> soften and firm the push, and <kbd>−</kbd>/<kbd>=</kbd>
ease the back-push and add to it.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The ratchet is idealised as rigid, but the shape is
exact: a push admits whole stops `p · ⌊push ⁄ p⌋`, the remainder is slack, and the
pawl bars the return until the back-push beats the stop.

*One of three made the same morning on the one law — see [the day's README](../).
2026-09-24.*
