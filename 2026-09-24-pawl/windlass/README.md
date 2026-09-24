# Windlass

**A windlass raises a load on a drum, and a pawl dropped into a ratchet is what
lets you rest between heaves. It is a rectifier: it turns a back-and-forth heave
into a one-way climb, banking each stroke and giving none of it back — so a lift
too heavy to raise in one pull is raised in fifty, and never slips while you move
your hands. But it banks in whole notches, so the scrap of a heave that falls short
of the next tooth is lost motion, handed back at the top of every stroke; and the
pawl holds only to the strength of one tooth, so a load past that overhauls it and
the banked height runs back down.**

The teeth of a ratchet are not symmetrical. Each has a gentle ramp on one side and
a steep face on the other. Turn the wheel the winding way and the pawl rides up the
ramps and drops off each tip — *click* — offering no resistance; turn it back and
the pawl meets the steep face square-on and jams. One shape, two behaviours: the
wheel is free one way and locked the other. That asymmetry is the whole idea — the
tooth is a valve for rotation, passing the useful half of your heave and stopping
the reverse dead.

## The one relation, read three ways

Take the stroke you swing (an angle), the tooth's pitch `p = 360 ⁄ N` for a wheel of
`N` notches, and the back-load `L` the weight puts on the drum. Idealise the ratchet
as rigid:

- **It banks whole notches.** `banked = p · ⌊stroke ⁄ p⌋`. A heave advances the drum
  by as many whole notches as it covers; the remainder, `stroke − banked`, is *lost
  motion*, given back at the top of the stroke. Swing shorter than one notch and you
  bank nothing at all.
- **It holds to the tooth.** The pawl holds while `L ≤ H`, the tooth's capacity. A
  steeper, coarser tooth has a larger `H`; a fine tooth a smaller one — what wastes
  little, holds little.
- **Past the tooth, it overhauls.** `L > H` and the weight beats the pawl, drives the
  drum backward, and the banked height runs down. The rectifier has failed: the
  reverse half of the motion is getting through.

The two limits pull against each other, and the cut of the tooth is where you settle
them. Fine keeps almost every degree you swing but dare hold little; steep holds a
great weight but throws away a slice of every heave. No tooth wastes nothing and
holds everything — the ratchet makes you choose.

## The bench

A drum with a weight on a line and a pawl in its ratchet. Set the **stroke** you
swing and the **cut of the tooth**, and watch how many whole notches a heave banks
and how much is lost as the sub-notch remainder — the staircase plots the notches
banked against the degrees swung, the gap up to the dashed line the lost motion. Set
the **weight** and read whether the pawl banks, nears its edge, or overhauls. Press
*Haul* to take one heave: the banked height only climbs, until you overload the
pawl and the drum runs back. *Find the overhaul* sets the weight to the exact load
the tooth lets go at; *Reset* returns the empty drum and the gentle default.

The stroke, weight, tooth, and banked height are kept in `localStorage`, so the drum
stands where you left it between visits. A live status line (`aria-live`) reads each
state to a screen reader — the tooth and its pitch, the notches banked and the motion
lost, and whether the pawl banks, nears its edge, or overhauls — debounced past
slider drags. Under `prefers-reduced-motion` the drum does not spin as it climbs and
the lever rests at its stroke rather than sweeping; each state lands as a settled
arrangement, and a live change to the setting is honoured. The whole bench works from
the keyboard — <kbd>H</kbd> or <kbd>Space</kbd> hauls, <kbd>F</kbd> finds the
overhaul, <kbd>R</kbd> resets, <kbd>1</kbd>–<kbd>4</kbd> cut the tooth, <kbd>[</kbd>
and <kbd>]</kbd> shorten and lengthen the heave, and <kbd>−</kbd>/<kbd>=</kbd> take
weight off and add it.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The ratchet is idealised as rigid, but the shape is
exact: a heave banks whole notches `p · ⌊stroke ⁄ p⌋`, the remainder is lost motion,
and the pawl holds until the load beats the tooth.

*One of three made the same morning on the one law — see [the day's README](../).
2026-09-24.*
