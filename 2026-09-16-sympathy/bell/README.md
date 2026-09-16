# Bell

*One of three for [sympathy](../) — the day's idea seen from three sides.
This is the **build** side: the great swing you cannot shove but can raise
a small, timed push at a time.*

A full-circle tower bell weighs more than the ringer and must swing a whole
turn to sound, yet a single rope raises it. The secret is not strength but
timing. A bell left to itself swings at one **natural stroke**, slow and
fixed by its mass and wheel. Pull the rope on that stroke and each haul
lands in step with the last, so the pushes add instead of fighting and the
swing climbs a little every stroke — a hundred small pulls stacked into a
full peal. Pull off the stroke and the pulls quarrel, and the bell hangs
dead however hard you haul.

## The one line

Let your pull come at frequency `f` and the bell's natural stroke be `f₀`,
with `r = f ⁄ f₀`, and let `Q` be the bell's freedom — how many strokes it
keeps swinging after you stop. The settled swing is the swing one lone pull
would give, times the gain:

```
gain = 1 / √((1 − r²)² + (r ⁄ Q)²)
```

On the beat (`r = 1`) the gain rises to about `Q`; the peak is only about
`1 ⁄ Q` wide, so the freer the bell rings the finer the tempo it demands.
The pull only scales what the timing has already won.

## Four states

- **Rings up** — timed near the beat, freely hung; the swing climbs to a
  true peal, high and short of the stay.
- **Labours** — on the beat, but hung too stiff; the freedom is low and the
  swing never climbs, the energy bled back out as fast as it is banked.
- **Won't build** — off the beat; the pulls quarrel and cancel, and the
  bell hangs dead however hard you pull.
- **Over the stay** — rung up on the beat and driven past the balance; the
  swing throws its weight onto the stay and breaks it.

## The bench

Set the **tempo** of your pull against the bell's own stroke of 30 a
minute, the **freedom** of its hanging, and the **pull** on the rope. The
bell swings up to its settled size, the arc coloured as it nears the stay;
a resonance curve plots the gain against tempo and marks where your pull
falls; a gauge reads the swing against the balance and the stay. *Find the
stroke* brings the tempo onto the beat.

Pure HTML, CSS, and JavaScript — no build, no network once loaded. Open
`index.html` in a browser. The bell's stroke, mass and stay angle are
stylised; the gain and swing drawn from them are exact. 2026-09-16.
