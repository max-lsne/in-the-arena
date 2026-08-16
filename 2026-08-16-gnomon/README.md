# Gnomon

**Stand a rod upright in the sun and its shadow is not idle. Through the day it
swings round — from the west in the morning, through north at noon, to the east
by evening — because the sun crosses the sky and a shadow always points away from
it. Through the year it stretches and shrinks, a stub at midsummer noon and a long
finger at midwinter, because the sun rides high in summer and low in winter. Read
the swing and you have the hour; read the length and you have the season. This is
the gnomon — the upright of a sundial, the oldest instrument there is — and it
works because a shadow is simply the sun's position drawn on the ground. There is
one equation under all of it: the sun's height above the horizon is
`sin a = sin φ·sin δ + cos φ·cos δ·cos H`, from the latitude of the place, the
tilt of the sun for the day, and how far the sky has turned from noon.**

The word *gnomon* is Greek — *gnṓmōn*, "one that knows," or the indicator, from
*gignṓskein*, to know, the same root that gives us *diagnosis*. It named the
pointer before it named anything else: the thing whose shadow tells you what you
could not otherwise see. The discipline of reading it, *gnomonics*, is where
geometry and the calendar first met, and for most of history it was the same trade
as astronomy.

## The one equation

Where the sun stands in the sky, at any moment, comes from three numbers:

- **φ, the latitude** of the place the rod stands — fixed.
- **δ, the declination** of the sun that day — how far north or south of the
  celestial equator it is, swinging between `+23.44°` at midsummer and `−23.44°`
  at midwinter, zero at the two equinoxes.
- **H, the hour angle** — how far the sky has turned since the sun stood due south
  at noon, fifteen degrees for each hour, since the whole sky comes round once in
  twenty-four.

Put them together and the sun's **altitude** *a*, its height above the horizon,
is

> **sin a = sin φ · sin δ + cos φ · cos δ · cos H.**

From the altitude the shadow follows without any more astronomy:

- **Length.** A rod of height *h* throws a shadow **`h / tan a`** long — short when
  the sun is high, growing without bound as it sinks to the horizon.
- **Direction.** The shadow lies exactly opposite the sun's compass bearing. Find
  where the sun is and the shadow is 180° away.

## The mark a whole day makes

Watch the far **tip** of the shadow and let a day run. It swings in from the west,
pulls close to the rod at noon as the sun climbs, and swings out to the east as
the sun sets. The path it traces is a **conic section**, and which one depends on
the day:

- On the two **equinoxes** the tip runs dead straight — a clean east–west line.
- On **every other day** it bends into a **hyperbola**, bowing south of that line
  through summer and north of it through winter.
- Inside the **polar circles**, where the sun wheels round without setting, the
  tip closes the curve into an **ellipse**.

The reason belongs to Apollonius, not to clockmakers: through the day the sun
rides a slanted circle in the sky, so the rays grazing the rod's tip sweep out a
**cone**, and the flat ground is a plane slicing that cone. A plane cuts a cone in
a conic — a line when it lies parallel to the cone's edge, which happens exactly
at the equinox, and a hyperbola when it is steeper, which is every other day. Scratch
a few of these **declination lines** into a stone dial and its face becomes a
calendar as well as a clock: the tip's place along a curve gives the hour, and
which curve it rides gives the date.

## The bench

The page is one gnomon, seen from straight above with north at the top. The rod
stands at the centre; its shadow reaches out from it, and the faint curve behind
is the whole day's path of the tip — the declination line for the date. Move the
**time** and watch the shadow swing and breathe; set the **latitude** and the
**day of the year** and watch the curve change shape, straight at an equinox and
bowed the rest of the year. The readout gives the sun's altitude and bearing, the
shadow's length in rod-heights and its compass direction, and which conic the day
is drawing. Press **Run the day** and the sun walks from sunrise to sunset and
round again. The numbers are the real ones: `sin a = sin φ sin δ + cos φ cos δ cos H`.

There is one refinement the bench leaves out, and it is the whole art of the later
dials: tilt the rod to point not straight up but at the celestial pole — north,
raised above the horizon by exactly the latitude — and the shadow's swing becomes
an even fifteen degrees an hour, so the hour lines can be ruled at equal angles.
That slanted rod is the **style**, and the angle you set it to is your latitude
written into brass. A sundial is a small model of the Earth's axis, laid against a
wall.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-08-16.*
