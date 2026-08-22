# Involute

**Cut gear teeth as plain pegs or triangles and the drive will ripple — the driven
wheel racing and dragging within every single tooth, a stutter you hear as a whine and
feel as wear. The cure is one particular curve, the shape a taut string draws as it is
unwound from a circle. Give each wheel a hidden `base circle` and cut every flank as
that circle's involute, and the point where two teeth touch no longer wanders: it
slides along a single fixed straight line, tangent to both base circles, the `line of
action`. The ratio the mesh hands on is then set by the base circles alone,
`ω₁ / ω₂ = r_b2 / r_b1 = N₂ / N₁`, a constant — and because those base circles are cut
once and never move, the ratio holds even when you set the shafts too far apart. The
involute is a demand about every instant of a mesh, answered by a single shape. This is
the involute.**

The word is Latin — *involūtus*, *rolled up, wrapped in*, from *involvere*, *to roll
into* — for the curve is literally the track of something rolled off a circle. The idea
is old: Girard Desargues suggested involute teeth in the 1600s, Philippe de la Hire
worked the geometry around 1694, and **Leonhard Euler** set the full theory of conjugate
gear action down in the 1760s, which is why involute teeth are sometimes called *Euler
teeth*. For a long time the rival **cycloidal** tooth held the field — it is still cut
for clocks and some pumps — but the involute won the machine age outright, and today
very nearly every gear you will meet, in a watch or a windmill or a car's gearbox, is an
involute.

## The problem the curve solves

Two smooth discs pressed together and rolling without slipping would trade rotation
perfectly evenly: contact sits always on the line joining their centres, and their
speeds stay locked in the ratio of the radii. But discs slip under load, so you must cut
teeth — and the instant you do, contact leaves that tidy point and travels out along a
tooth flank. Now it is the shape of the *flank*, not the disc, that decides how squarely
one wheel drives the next.

Get the flank wrong and the drive is uneven inside every tooth. The far wheel is handed a
little more angle here and a little less there, so a shaft that should turn as steadily as
a clock hand instead trembles — **transmission error**, the root of gear whine, of
pounding under load, of teeth that wear themselves to death. No care in spacing the teeth
removes it; it is baked into the flank. **Robert Willis** stated the cure as the
*fundamental law of gearing*: for a constant ratio, the common normal to the two teeth at
their point of contact must always pass through one fixed point on the line of centres —
the **pitch point**. The involute is the neatest curve that obeys it.

## The one relation the curve embodies

Bury a **base circle** in each wheel — radius **r_b1** in the driver, **r_b2** in the
driven. Cut every flank as the involute of that circle: the path traced by the end of a
string as it peels off the circle taut. An involute has one defining property — the
string is, at every instant, tangent to the base circle and perpendicular to the flank.
It is a normal to the tooth that is also a tangent to the circle.

Let two such teeth touch. Their common normal must then be tangent to **both** base
circles at once — and between two circles there is exactly one such line. So contact does
not wander over a curve; it slides up and down a single fixed straight line, the **line of
action**, tangent to both base circles and crossing the line of centres at the pitch
point. Because the contact force runs along that fixed line, the base circles must roll at
matched speeds,

> **ω₁ · r_b1 = ω₂ · r_b2,**   so   **ω₁ / ω₂ = r_b2 / r_b1 = N₂ / N₁,**

a constant fixed by the base circles and the tooth counts, and nothing else. And here is
the quiet miracle. Those base circles are cut once and never move. Push the shafts apart
by a careless amount and the operating **pitch circles swell** and the **pressure angle
steepens** — the line of action tilts — as

> **cos φ = (r_b1 + r_b2) / C,**

with **C** the centre distance and **φ** the pressure angle. Everything visible about the
mesh changes; the ratio, riding on the untouched base radii alone, does not move at all.

## The bench

A driver on the left and a driven wheel on the right, each with its **base circle** dashed
inside it and the **line of action** drawn tangent to both, carrying the sliding **contact
point**. Along the foot, a plot against centre distance: the **velocity ratio** held flat
where the **pressure angle** climbs away beneath it.

- **driven teeth** — N₂, the far wheel's count. The driver is fixed at twelve; give the
  driven wheel more and the ratio deepens. It is exactly N₂ / N₁, whatever the flank shape
  or the spacing.
- **pressure angle** — φ, the nominal slant of the line of action, and so how steeply the
  flanks lean. The old 14½° gives slender teeth and a gentler push; the modern 20° and 25°
  give stubbier, stronger ones. It recuts the base circles on the spot.
- **centre distance** — C, how far the shafts sit apart, from the snug nominal where the
  pitch circles just kiss out to a careless spread.

Press **Turn** to roll the mesh and watch the contact glide the straight line of action at
an even pace — conjugate action, the drive handed on without a ripple. Then draw the centre
distance out, or press **Spread the centres**, and watch the ratio refuse to move while the
pressure angle opens, the pitch circles grow and the teeth take up backlash: the single
tolerance that made the involute win.

## Why keep it

The involute is worth a page because it turns a demand into a shape. The demand — that two
wheels trade motion at one unwavering ratio — is a statement about *every instant* of a
mesh, an infinity of conditions at once; the involute satisfies all of them with a single
curve, the one a string draws unwinding from a circle, and it needs no theory to do it,
the way a hanging chain finds the [catenary](../2026-08-18-catenary/) without solving for
it. Its rival the cycloid transmits an even ratio too, but only at exactly the right centre
distance; the involute does not care, and that indifference to a worn bearing or a rough
casting is why it runs almost every gear ever made. It keeps company with the other
machines that hold one thing still while another runs loose: the
[fusee](../2026-08-20-fusee/) that holds a clock's drive level as its spring dies, the
[governor](../2026-08-15-governor/) that holds an engine's speed as its load swings, the
[escapement](../2026-07-30-escapement/) that holds a beat as the push behind it fades. Turn
the mesh, then pull the centres apart, and watch the ratio sit unmoved: that refusal is the
involute, and it is only a string, unwound from a circle.

Each page is one HTML file, one stylesheet, one script. No build, no account, no network
once it has loaded.

*One of a series — a page a day, each built on one old working word and the discipline
hidden inside it. 2026-08-22.*
