# Draught

**A fire does not take air. Air is pulled through it, by a column of its own hot
breath standing in the flue — lighter than the cold outside, and falling upward.
That pull is the draught, and it is the only reason the fire breathes. You never
see it. You see only what it fails to do: the smoke that rolls back into the
room, or the heat that goes straight up the chimney and is gone.**

**Draught** is the unseen pull. The word gathers a family of them — the draught
of an ox is the load it hauls; the draught of a ship is how deep the water pulls
her down; a draught of ale is what you pull from the cask; a draught of a letter
is the first rough pulling-together of it. Under all of them sits one idea: a
*drawing*, a pull you feel by its effect and not by its face. The draught of a
chimney is the plainest of the lot. It is the pull that makes a fire go.

Here is where it comes from. Burning heats the gas in the flue. Hot gas is
lighter than cold — the same weight of air, swollen and thinned by heat. So the
flue holds a tall column of light gas standing inside the heavy cold air of the
day, and the heavy air, pressing in underneath, lifts the light column up and
out the top. The taller the column and the greater the difference in weight, the
harder the lift. That lift, felt at the fire as a pull of fresh air through the
grate, **is** the draught:

> pull ≈ height × (how much lighter the flue gas is than the day outside

A cold flue on a mild day is barely lighter than the air around it, and barely
pulls at all. A hot flue on a frosty morning stands a heavy day on a very light
column, and pulls hard. This is why the same chimney that roars in January
sulks and smokes in October, and why the fault is almost never the fire.

## The one rule

The pull must **match the fire's appetite** — no less, and, just as much, no
more.

- **Too little** and the smoke the fire makes is faster than the flue can carry
  it. It has nowhere to go but back through the only other opening: the room.
  The fire smoulders in its own exhaust, tar lays down in a cool flue, and the
  house smells of last night's fire.
- **Too much** and the draught drags air through the grate faster than the fuel
  can use it. The fire burns bright and burns *out*, and the heat you lit it for
  is pulled up the flue and thrown at the sky before the room ever feels it. A
  roaring fire is not a generous one. It is a leak.

Between the two is a band — enough pull to clear the smoke cleanly, not so much
that it robs the room. Everything the craft knows about chimneys is the art of
landing the draught in that band and keeping it there as the day changes.

> You cannot make more heat by building a taller chimney. A taller chimney makes
> more *pull*, and past a point the extra pull is simply heat leaving faster. The
> chimney's height sets the draught; the fire's fuel sets the heat; and the two
> are not the same lever, however much they feel like it on a cold night.

## The damper is how you give back the draught you don't need

A flue sized for the worst still morning of the year has far too much pull on a
gusty frost. You cannot un-build its height. What you can do is put a flap in the
throat — a **damper** — and close it part way, adding resistance the draught has
to spend itself against. You are not making less heat. You are keeping the heat
you made from being pulled out before the room has it. The damper is the one
control that admits the truth of the whole business: most of the time the flue
pulls harder than the fire needs, and thrift is knowing exactly how much of that
pull to throttle away.

## Four flues, worst to true

1. **Spills.** The pull is below what it takes to clear the fire's own smoke.
   The plume can't get up the flue, so it rolls out of the opening and into the
   room. Cold flue, mild day, a bore too wide to warm through — a fire that
   smokes the moment you shut the door.
2. **Sluggish.** Enough draught to limp, not enough to burn clean. A low, lazy,
   yellow flame; smoke that leans rather than lifts; a flue slowly furring with
   the tar a cool, slow draught lays down. It works, in the way a thing works
   that you have to nurse all evening.
3. **Draws clean.** The pull matches the appetite. Air comes through the grate
   steadily, the flame stands up and burns bright, the smoke goes where smoke
   should go, and you stop thinking about the chimney at all — which is the only
   sign a chimney is right.
4. **Roaring.** Far more pull than the fire can use. It burns hard and fast, the
   fuel gone in an hour, and the heat you wanted in the room is dragged glowing
   up the flue. Sound, in that nothing is failing — and wasteful, in that the
   chimney is spending your fuel to warm the sky. Close the damper: the roar is
   heat you are allowed to keep.

## What's in this folder

- `index.html` — the landing page and the bench, in the browser.
- `styles.css` — a soot-and-ember palette: a warm hearth cream, soot-charcoal for
  the flue, ember-orange for the hot gas and the pull, a cold slate-blue for the
  day's air drawn in at the grate; lichen for a flue that draws clean, amber for
  one gone sluggish, brick-red for one that spills or roars. Fraunces for
  headings, Inter for body, JetBrains Mono for the marginalia and the readings.
  Light and dark.
- `script.js` — the stack effect, worked in the browser. Air density from
  absolute temperature (ρ ≈ 353 ⁄ T), the buoyant draught over the flue's height,
  the flue-gas velocity that draught drives against the friction of the bore and
  the throttle of the damper, and the reading — draught in pascals and in
  millimetres of water gauge, the gas velocity against the clean band, the air
  drawn through, and the verdict. It opens on a tall old flue roaring on a frosty
  night, throwing its heat up the chimney, so there is something to throttle on
  arrival.

## The bench

One flue in cutaway, a fire at its foot. Set the flue's height, feed the fire to
set the flue-gas temperature, choose the bore, and pick the day — a frost, a mild
afternoon, a warm evening. The page stands the light hot column in the heavy cold
air, works out the pull and the velocity it drives through the grate, and reads
whether the fire spills, sulks, draws clean, or roars. The **damper** slider adds
throttle; *Draw it clean* sets the throttle (or, for a weak fire, raises the flue)
until the draught lands in the band; *Reset* returns to the roaring flue it opens
on.

## Running it

Open `index.html` in a browser. No build step, no account, no network once the
page has loaded. The flue you tune is kept in the page, so a half-throttled fire
is burning exactly as you left it when you come back.

## Day

2026-07-28.
