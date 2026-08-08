# Bias

**Woven cloth is stiff along the warp and weft and stretchy at 45° — on the bias.
A cutter chooses the angle for the drape a garment needs: near the grain to hold
a line, on the bias to round a curve. But bias grows — it sags under its own
weight and wastes cloth.**

Woven cloth is a lattice: warp threads running its length, weft crossing them at
a right angle. Pull along either thread and almost nothing happens — the threads
are straight and strong and simply take the load. Pull at 45°, on the bias, and
the whole weave shears: the square cells rack into diamonds, the cloth gives, and
released it drapes into soft folds and clings to a curve no straight-cut cloth
could follow. That is the dressmaker's deepest lever, and it is pure grain. A
waistband is cut on grain so it holds; a bias gown is cut at 45° so it flows. And
the price is written into the same shear: bias cloth grows, dropping long and
uneven at the hem, puckering at the seams, wanting a third more cloth in the lay.

## The one choice

The give does not come from the thread stretching — it comes from the weave
changing shape, greatest at 45° and none on the thread, so it follows `sin(2α)`.
The angle is the whole control, with a wall on each side:

- **Too little bias — it stands stiff.** A cloth asked to curve with no give to
  offer stands away in flat planes and wrinkles where it is forced round.
- **The true band — hangs true.** Turned toward the bias just enough to take the
  curve, and no further: it drapes to the shape yet keeps its length.
- **Too much bias — it grows.** Full bias on a piece that hangs long: the hem
  sags and wavers, the seams pucker, and the cloth is wasted three ways.

And the safe country is the cloth's to give. Crisp poplin has little give at any
angle — right for a shirt, hopeless round a tight curve — while silk crepe drapes
beautifully but grows the fastest and wants the longest patience. The cure for a
piece that will not sit is more bias or a softer cloth; the cure for a piece that
grows is less bias, a shorter drop, or a cloth with more backbone.

The bench uses the weave law directly:

```
give = maxGive · sin(2α)      demand = 1 + 15·(curve/100)
sag  = give · (drop/100) · creep
```

where `α` is the cut angle to the weave, and `maxGive`, `creep` are the cloth's
give and its willingness to grow.

## The bench

One piece of cloth laid to a curve, from the front: the weave printed at the cut
angle, the curve it must round, and the way it hangs. Set the **cut angle**, the
**drop** it hangs, the **curve** it must take, and the **cloth**. The page shows
the give the angle offers, the give the curve demands, how much the piece will
grow, and the cloth wasted in the lay, and lights the **true band**.

It opens on a soft collar cut nearly on the grain — standing stiff, refusing to
roll. **Cut it on the bias** — and watch it lie down to the curve before it
starts to grow.

*Part of [Grain](../) — three parallel ideas on the direction hidden in a worked
material. 2026-08-08.*
