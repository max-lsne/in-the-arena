# Geneva

**A shaft that never stops driving a wheel that mostly stands still — that is the whole
trick of the Geneva drive. A pin on a steadily turning crank sweeps into a slot cut in a
star wheel, carries it round by exactly one slot, and slides back out; for the rest of the
turn the star is held dead still by a curved shoulder on the driver, waiting. Continuous
in, step-and-hold out. But any pin dropped into any slot will jerk the star to a start and
snatch it to a stop — an infinite acceleration at each end, a hammer-blow, wear and noise.
The Geneva earns its name by the one condition that removes the shock: the pin is set at a
radius `r = a·sin(π/n)` from the crank centre, `a` the distance between the shafts and `n`
the number of slots, and at that radius alone the pin enters and leaves each slot moving
*exactly along it* — no sideways snatch, the star eased from rest and back to rest. Same
step, same hold; the difference between a mechanism that batters itself and one that indexes
clean is a single choice of radius.**

The name is a loan from watchmaking. The oldest use of the shape is the **Geneva stop** —
a *croix de Malte*, a Maltese cross, one of whose arms was left solid so a mainspring could
be wound only so many turns and no more, a stop against over-winding, made in the watch
town of **Geneva** and named for it. The star's four flared arms are the cross of the
Knights of St John. Turned from a stop into a drive, the same wheel became the heart of the
**film projector**: every frame must be yanked down into the gate, then held perfectly
still while the shutter opens and the lamp prints it on the screen, then the next yanked
down — twenty-four times a second, a stac­cato the eye reads as smooth motion. A four-slot
Geneva does exactly that, and did it in nearly every cinema for a century.

## The problem the shape solves

Some machines need motion that stops. Not slows — *stops*, dead still, on a schedule, and
then moves again: a film frame held in the gate to be lit, an indexing table paused under a
drill while the hole is cut, a tool-changer that must present each tool square and
motionless. The drive shaft, though, wants to spin steadily; starting and stopping a heavy
shaft on every cycle is wasteful and violent. So the task is to convert one steady rotation
into a *rhythm* of turn-and-dwell at the output, without ever checking the input.

The Geneva does it with two wheels and a pin. The driver turns without pause. For most of
its revolution a raised circular **locking shoulder** on the driver sits inside a matching
hollow on the star and pins it still — the star cannot move even if pushed. Then, once per
turn, the shoulder's throat comes round, freeing the star, and a **pin** on the driver
sweeps into one of the star's radial **slots**, carries it round by one slot-pitch
(`360°/n`), and withdraws — just as the locking shoulder swings back to hold the star at its
new station. One input revolution, one output step. The output's whole timetable —
move now, hold there — is built into the geometry, and needs no sensing or control to keep.

## The one relation it embodies

Draw the two shaft centres a distance `a` apart, the pin at radius `r` on the driver. The
demand that makes the motion smooth is that the pin should slip into the slot **along the
slot's own length** — with no velocity across the slot — at the instant of entry, and leave
the same way. Geometrically that means the crank arm (centre-to-pin) must be *perpendicular
to the slot* at entry and exit. The slot points straight out from the star's centre, and at
entry it stands at half a slot-pitch, `π/n`, off the line joining the two shafts. So the
crank, the slot and the centre-line form a right triangle with the right angle at the pin:

> **`r = a · sin(π/n)`** — the pin radius that makes the star enter and leave from rest.

Everything else falls out of that one triangle. The driver is only engaged with the star
while the crank swings through the angle either side of the centre-line that the triangle
allows — a total **index angle of `180°·(n−2)/n`** — and is locked for the rest:

> index takes `(n−2)/(2n)` of every turn; the star **dwells for `(n+2)/(2n)`** of it.

For four slots that is a quarter turning, three-quarters held. And the violence of the flick
is set by the same `n`. Write `m = a/r = 1/sin(π/n)`, the ratio of centre distance to pin
radius; the star's angular speed peaks, at the middle of the index, at

> `(ω_star / ω_driver)_max = 1 / (m − 1)`.

Read that column downward and the whole character of the drive is in it. Few slots: a big
pin, a short sharp index, a fierce over-speed — a three-slot Geneva whips its star past
**six times** the driver's speed at mid-stroke. Many slots: a small pin, a long gentle
index that barely over-speeds, but a shorter dwell. The four-slot cross of the projector
sits in the middle — a peak of about `2.4×`, a clean 90° index, a generous 75% hold.

## The bench

Two wheels on their shafts, `a` apart: the **driver** on the right, turning steadily, with
its **pin** and its curved **locking shoulder**; the **star** on the left, its radial slots
cut for `n` stations. Press **Run** and watch the pin catch a slot, sweep the star round one
notch, and let go as the shoulder swings back to hold it — turn, hold, turn, hold. Below,
the **output diagram**: the star's cumulative angle against the driver's angle, a staircase
of smooth rises and flat treads, with the **speed-ratio** curve `ω_star/ω_driver` laid over
it, cresting at mid-index and flat-zero through every dwell. A cursor marks the present
driver angle.

- **slots** — `n`, the number of stations, from 3 to 8. More slots: a smaller pin, a longer
  and gentler index, a shorter dwell. Fewer: a big pin, a short violent flick, a long hold.
- **speed** — how fast the driver turns. It changes the tempo, not the geometry; the ratios,
  the index angle and the dwell fraction are fixed by `n` alone.

Everything the readout shows — the index angle, the dwell fraction, the peak speed ratio,
the pin radius `r = a·sin(π/n)` — is decided by the count of slots, and by the single
condition that the pin enter its slot from rest.

## Why keep it

The Geneva is worth a page because it turns a demand about *time* — move, then hold, then
move — into a fact about *shape*, and answers it with two wheels that need no clutch, no
brake, no controller. Cut the pin to the right radius and the star indexes itself, holds
itself, and cannot drift, the way an [involute](../2026-08-22-involute/) tooth obeys the law
of gearing by its profile alone, or a [cam](../2026-08-27-cam/) hands its follower a whole
schedule in the swell of an edge. And it keeps the same company: the
[escapement](../2026-07-30-escapement/) that doles a clock its beat one tooth at a time, the
[governor](../2026-08-15-governor/) that holds a speed against a swinging load, the
[fusee](../2026-08-20-fusee/) that keeps a spring's pull level as it dies. The Geneva is the
one that carries a *stop* in its motion — steady drive in, staccato out — and it did the
quiet work behind every reel of film for a hundred years. Run it, then pull the slot count
down to three and watch the same clean index turn into a snatch; that is the whole discipline
in one wheel.

Each page is one HTML file, one stylesheet, one script. No build, no account, no network
once it has loaded.

*One of a series — a page a day, each built on one old working word and the discipline
hidden inside it. 2026-08-30.*
