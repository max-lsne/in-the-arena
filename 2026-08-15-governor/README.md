# Governor

**Hinge two heavy balls to a spinning shaft on arms that can swing outward. Spin
it faster and the balls fly wider and ride up — a ball whirled in a circle wants
to fly out, and the faster the shaft turns the harder it pulls. Left alone that
is a spinning toy. But run a link from the collar the balls' rise lifts to the
valve that feeds the engine, so that climbing shuts the valve and falling opens
it, and the toy becomes a regulator: too fast flings the balls out and eases the
steam, too slow lets them fall and lets the steam back in, and the speed holds
itself. There is an exact number in the climb — the height the balls keep below
the pivot is g/ω², g over the spin rate squared, and it cares nothing for how
heavy the balls are or how long the arm is. This is the centrifugal governor, the
whirling balls on every drawing of a steam engine, and the first machine whose
self-correction anyone sat down and wrote the mathematics of.**

The word *governor* comes down from the Latin *gubernare*, to steer a ship — the
same root as *gubernatorial*, and, through the Greek *kybernetes*, the helmsman,
the same root Norbert Wiener reached back to for *cybernetics*. A governor is a
steersman for a machine's speed: it does not set the speed from outside so much
as lean against every departure from it, the way a hand on the tiller answers
each yaw.

## The one relation

Take one ball at the end of an arm of length **L**, whirling at rate **ω**, its
arm leaned out by angle **θ** from straight down. It rides a horizontal circle of
radius `r = L·sin θ`. Two forces act: gravity down, and the arm's pull along its
length. For steady circling those must sum to exactly the inward force a circle
needs, `m·ω²·r`. Balance the up part against gravity, the inward part against the
circle, divide one by the other, and the tension and the mass both fall out:

- **cos θ = g / (ω²·L).** The lean is set by the spin alone — heavier balls or a
  longer arm change nothing about the angle.
- **h = g / ω².** Multiply the first by L and the left side is the cone's height,
  how far the ball plane hangs below the pivot. So the collar's position *is* a
  reading of the speed: a tachometer you could measure with a ruler.
- **A critical speed sets the floor.** Below `ω² L = g` the formula asks for a
  cosine past one, which cannot be — so the balls hang dead straight and the
  collar sits at its lowest, waiting for enough spin to lift.

As the spin climbs, the height falls as one over its square: the balls swing out
toward level and the collar climbs to meet the pivot. Tie that climb to a
throttle so lifting the collar shuts the valve, and the loop closes on itself —
**negative feedback**, each turn of the loop working against the last.

## The loop, and the droop

Load the engine and it drops a hair; the balls fall a hair; the valve opens a
hair; the engine takes on more steam and holds — not at the old speed, but a
touch lower for the heavier load. That small permanent give is the **droop**, the
honest price of a regulator that steers by how far it is off rather than by where
it ought to be. When Maxwell took the mechanism apart in 1868, in a paper called
simply *On Governors*, the question was not how the brass worked but why some
governors settled and others *hunted* — swinging faster-slower-faster until they
shook themselves apart. The answer was in the mathematics of the loop, and that
paper is where control theory begins.

The page is one governor, worked the way the hand works it: a shaft, two arms,
two balls, a collar, and a butterfly valve. Set the **spin** and watch the arms
open to the angle the geometry demands, the collar rise, the height settle to
g/ω²; it reads back the arm angle, the cone height, the ball radius, the collar's
lift, and how far the throttle has closed. Then press **Govern**, set a **load**,
and hand the throttle to the balls: the shaft finds its own steady speed, the one
where the valve the collar sets feeds exactly the load it carries. Change the load
and watch it settle again, a little lower — the droop, made visible. The numbers
are the real ones: cos θ = g/(ω²L), h = g/ω², after Watt and Maxwell.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-08-15.*
