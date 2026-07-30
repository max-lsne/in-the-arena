# Escapement

**A clock does not make time. It counts a swing it did not start — and it lets
its weight go one tooth at a time to keep the swing alive. The tick you hear is
that exchange: a tooth of the escape wheel let go, the next one caught, and in
the passing a small push handed to the pendulum to replace what the air took.
Do it thirty-six hundred times and an hour has gone by — but only if the swing
between the ticks is true.**

A weight hangs on a cord wound round a barrel, and its pull runs up through a
train of wheels. Left alone, the weight would drop, the wheels would blur, and
the whole run of the clock would be spent in seconds. The **escapement** is what
stands in its way. It does two things at once, and it is easy to credit it with
a third it does not do.

- It is a **gate.** It releases the going train one tooth at a time, so the
  falling weight is paid out slowly instead of all at once.
- It is a **pump.** At each release it steals a sliver of the weight's push and
  hands it to the pendulum — an *impulse*, just enough to make up for the drag of
  the air and the pivots, so the swing does not die away like any pushed thing
  left alone.
- What it does **not** do is set the rate. It follows the pendulum and counts it.
  The count is only ever as good as the swing it counts.

## The one rule

A pendulum's swing takes very nearly the same time whether it swings wide or
narrow, and that time depends on almost nothing except how long it is:

> period ≈ 2π × √(length ÷ gravity)

Nothing about the weight of the bob is in it. Nothing — for a small swing —
about how far it swings. Only the length. This is the whole reason a pendulum
can keep time, and it has three hard consequences:

1. **The drive does not set the rate.** Wind a heavier weight and the clock does
   not gain; it swings a little wider and keeps the same time.
2. **The length does.** A pendulum a hair too short beats a hair too fast and
   gains through the day; too long, and it loses. You regulate a clock by moving
   the bob, never by touching the escapement.
3. **Heat is the enemy of length.** A steel rod grows as the room warms, so a
   clock set true in winter will lose in summer — which is why fine clocks carry
   rods of mixed metals, or a jar of mercury, built to hold their length as the
   temperature moves under them.

There is a fourth, quieter consequence. *Almost* nothing about the swing's width
matters — but not quite nothing. Swing very wide and each beat takes a touch
longer (the *circular error*), so a clock driven too hard loses a little. The
craft is to drive the pendulum just enough to keep it alive and no more, and
then to leave the rate to the length.

## Four movements, dead to true

1. **Dead.** The drive is too weak to pay the pendulum back what the air takes.
   Each swing is smaller than the last; the pendulum coasts to a stop and the
   train locks. A clock that won't start isn't broken — it's starved.
2. **Drifting.** It runs, but the length is wrong for the rate you want, and it
   gains or loses through the day. The escapement is doing its work perfectly;
   it is faithfully counting a pendulum that beats too fast or too slow.
3. **Keeps time.** The length is trimmed so the beat is true, and the drive is
   set just past what the swing needs. The clock gains and loses nothing worth
   naming across a day — and you stop checking it against another, which is the
   only real test of a clock.
4. **Knocking.** Far more drive than the swing can use. The pendulum is thrown so
   wide the pallets slam past their proper drop and the movement *knocks* — a
   clock beating itself to wear, and, because the wide swing drags the rate,
   losing time while it does. Ease the weight: quiet is faster here.

## The bench

One movement in schematic — a pendulum, an escape wheel, and the pallets between
them. Set the pendulum's **length** to fix the rate, the **drive** to feed the
swing, and the **escapement drag** it has to overcome, then choose the **room**.
The page works out the swing, the true period against a one-second beat, and the
seconds the clock will gain or lose across a day, and lights the **true band** on
the gauge.

It opens on a short pendulum beating fast on a warm afternoon — a clock gaining
about half an hour a day. **Trim it true.** Lengthen the pendulum and watch the
needle sweep in from *fast* toward the true band; then notice that driving it
harder widens the swing and drags it back toward *slow*, and that a warmer room
grows the rod and does the same. **Trim it true** moves the bob to the length
that nulls the rate for the room and swing you have; **Reset** returns to the
fast clock it opens on.

What the model holds:

- **period** = 2π·√(L_eff / g), with a first circular-error term (1 + A²/16) for
  the widening swing, A the half-amplitude in radians;
- **L_eff** = L·(1 + α·(room − 20 °C)) with α ≈ 11.5 × 10⁻⁶ /K, the linear
  expansion of a steel rod;
- **swing** from a per-beat balance: the escapement pays a fixed sliver of the
  drive, the pendulum spends it on a pallet-friction floor and on the air (which
  grows with the swing); below the floor the impulse can't catch the losses and
  the pendulum stops;
- **rate** = 86400·(1 − beat)/beat seconds per day, beat = period / 2, against a
  movement cut for one second per beat.

Schematic, not a horological simulation — the geometry of a real deadbeat is its
own study — but every number on the reading is the real relation, in SI units.

## Build

Pure HTML, CSS, and one file of vanilla JavaScript. No build step, no framework,
no network once the page has loaded, no tracking. The movement is drawn to a
`<canvas>`; the colours follow the light or dark theme. Open `index.html`.

```
2026-07-30-escapement/
├── index.html   — the page and its copy
├── styles.css   — a brass-and-patina palette, light and dark
├── script.js    — the movement: swing balance, period, rate, and the canvas
└── README.md    — this file
```

One of a series — a page a day, each built on one old working word and the
discipline hidden inside it.

*2026-07-30*
