# Pawl

**Three small pages, made the same morning, for the one law that runs through three
trades: a tooth raked one way lets motion pass and jams the return, so a thing that
goes back and forth is turned into a thing that only goes forward. Keep the half
that pays; refuse the half that would give it back. A drum banks a heave, a hub
banks a push, a gate banks a person — and the same little pivoted tooth, the pawl,
does it in every one.**

Most days in this folder are one page. Some mornings the idea comes in threes. A
*pawl* is the smallest part of a ratchet and the one that matters: a short arm on a
pivot whose tip rides a ring of raked teeth. Ride it the easy way and it lifts over
each tooth — *click* — and offers nothing; ride it the hard way and its tip meets
the steep face square-on and jams. That one asymmetry is a valve for motion. It is
the seed of everything that must accumulate and never slip back, and it shows up,
unchanged, in a ship's windlass, a bicycle's hub, and the gate at the mouth of a
ground.

## The three

- **[Windlass](./windlass/)** — *build.* You cannot lift a great load in one heave,
  so you lift it in fifty, and the pawl holds each notch while you move your hands.
  A page for the thing raised a stroke at a time and **banked**, the drum climbing
  and never running back — until the weight beats the pawl and overhauls it, and the
  whole climb pours down.
  Heave → notch → held → raised. Banking → edge → overhaul.

- **[Freewheel](./freewheel/)** — *take.* The same tooth as a clutch: drive forward
  and the pawls catch and carry the wheel; stop, and they skate over the teeth and
  it coasts free. A page for the drive **taken** one way and let go the other — the
  pickup you feel and the skip you dread, the two faces of one tooth: how soon it
  bites, and how hard before it slips.
  Push → tooth → driven → coast. Driving → edge → skip.

- **[Turnstile](./turnstile/)** — *count.* The ratchet stripped to its idea: no load,
  no drive, only the one-way count. A gate admits one a push and bars the return, so
  a milling crowd becomes a tally that only climbs. A page for the record that is
  **added to and never un-added** — until a barge overpowers the stop and drives the
  count itself backward.
  Push → stop → admitted → tallied. Counting → edge → forced.

## The one law

All three trades lean on the same fact about a raked tooth, and each reads it in its
own coin. Take the swing you give it (an angle), the tooth's pitch `p = 360 ⁄ N` for
a ring of `N` teeth, and the back-load `L` pressing it the wrong way. Idealise the
ratchet as rigid and the whole of it is three lines:

- **It banks in whole teeth.** `banked = p · ⌊swing ⁄ p⌋`. A stroke advances the ring
  by as many whole teeth as it covers; the remainder is **lost motion** — a windlass
  gives it back at the top of the heave, a freewheel feels it as engagement lag, a
  turnstile springs it back and admits no one. Swing shorter than one tooth and
  nothing is kept at all.
- **It holds to the tooth.** The pawl holds the back-load while `L ≤ H`, the tooth's
  capacity. A steeper, coarser tooth has a larger `H` and wastes more lost motion; a
  fine tooth wastes almost nothing but lets go under far less. What keeps finely,
  holds weakly — the one trade every ratchet makes.
- **Past the tooth, it fails.** `L > H` and the pawl can no longer hold the face: the
  ring runs the wrong way and what was banked is given back. The windlass **overhauls**,
  the freewheel **skips**, the turnstile is **forced** — three names for the one
  failure, the reverse half of the motion getting through.

Two lessons live in those three lines, and every page is built to show them. The
**resolution** is granular — a ratchet banks in whole teeth, so there is always a
scrap it cannot keep, and the finer you cut the teeth to keep more of it, the weaker
each tooth becomes. The **hold** is finite — a pawl bars the return only to the
strength of one tooth-face, so a rectifier is only ever as one-way as its jammed
side is strong, and past that strength the whole accumulation can be undone. And the
deepest reading is the one the physicist takes from the turnstile: a tooth alone
cannot rectify random jiggle into steady gain — warm the pawl and it bounces off its
own tooth as often as it catches — so rectification needs a real bias, a committed
push, not merely a preferred shape. You do not get a one-way world for free; you get
it by holding, tooth by tooth, and paying for the hold.

It is the same discipline the [escapement](../2026-07-30-escapement/) knows about
feeding a pendulum one timed nudge a beat, the [capstan](../2026-09-04-capstan/)
about a small hold standing against a great load, and the
[governor](../2026-08-15-governor/) about a machine that keeps its own level. Keep
the half that pays.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one
script, no build and no network once it has loaded. Each carries the same
interactive bench worked in its own trade: set the swing, the back-load, and the cut
of the tooth, take one stroke, and watch a one-way count climb, a staircase show the
lost motion, and a gauge set the back-load against the pawl's hold — green while it
banks and holds, oxblood when it fails and runs back. Each keeps its state in
`localStorage`, reads itself to a screen reader with a live status line, holds still
under `prefers-reduced-motion`, and works entirely from the keyboard. Open any
`index.html` in a browser.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. Some mornings, three. 2026-09-24. One tooth, three
trades.*
