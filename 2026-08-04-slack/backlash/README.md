# Backlash

**Cut the gear teeth a hair loose so they never bind — so they run free, run
cool, and shrug off dirt and heat. And pay for it in lost motion the instant the
load reverses: the driven flank must fall clear across the gap before it bites.**

Two gears cannot be cut to touch on both flanks at once — the first film of oil,
fleck of grit, or degree of warmth would jam them, and a jammed train does not
slip, it seizes. So every pair is cut with a measured *backlash*: a clearance
behind the driving flank, so the load-carrying face pushes while the trailing
face stands clear. That clearance is the give. But you pay for it at every
change of direction: before the far flank can take up the drive, it must fall
across the gap, and everything downstream waits through that fall. The waiting
is *lost motion*.

## The one catch

The same gap that keeps the teeth from binding is a hole the drive falls through
on reversal:

- **Too little clearance — it binds.** Thermal growth and load deflection close
  the gap, the teeth wedge on both flanks, and a seized train cooks itself
  solid.
- **The working band — meshing clean.** The gap clears binding yet stays inside
  tolerance: free and cool, and the reversal lands as a tap.
- **Too much clearance — slop.** The output lags the input by the whole gap, and
  every reversal is a hammer that pits the flanks.

The cure for a train that binds is not a stronger gear — it is more clearance.
The cure for one that hammers is not a harder pull, but a tighter gap.

The bench works the balance directly:

```
bind margin = c − Δ         lost motion ≈ c        knock ∝ c · (rpm/1000)²
```

where `c` is the clearance and `Δ` the closure — thermal growth plus load
deflection — set by the duty. The clearance must exceed `Δ`, and every
thousandth beyond that is lost motion, struck harder the faster the train turns.

## The bench

One meshed pair, close up: two teeth interlocking, the driving flanks in contact
and the clearance standing behind. Set the **clearance**, the **duty**, and the
**speed**. The page shows the lost motion, the margin before heat and load close
the gap, and the knock the reversal lands, and lights the **clean-mesh band**.

It opens on a gap cut too tight for a hot, heavy duty — the teeth binding.
**Open the clearance** — and watch it come free without falling into slop.

*Part of [Slack](../) — three parallel ideas on the measured give a working
thing needs. 2026-08-04.*
