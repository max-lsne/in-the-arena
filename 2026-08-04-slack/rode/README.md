# Rode

**Pay the anchor chain out long and it lies in a deep curve — a catenary — that
pulls the anchor flat along the seabed while the sag soaks up every gust. Veer
too little and it comes up straight, tips the pull upward, and levers the anchor
out.**

An anchor holds by biting into the ground, and it can only bite while the pull
on it stays flat — along the bottom, not up off it. What keeps the pull flat is
the *rode*: the chain between boat and anchor, and how much of it you veer. Pay
out plenty and it cannot go straight; its own weight drags the belly down into a
catenary that arrives at the anchor lying along the bottom. That curve is the
slack, and the slack is the trick. When a gust throws its weight on the boat,
the first thing that happens is the curve straightening — lifting tonnes of
chain off the bottom — and all that lifting is force the anchor never feels.

## The one catch

Slack this useful is paid for in room. The same length that lays the pull flat
also lets the boat range around a wide circle:

- **Too little scope — it snatches.** The rode comes up straight, the pull tips
  up off the seabed, and the next surge levers the anchor out.
- **The working band — set and easy.** The rode arrives flat, a reserve of chain
  rests on the bottom, and the surge is absorbed by the curve lifting and
  settling.
- **Too much scope — it wanders.** The anchor holds hard, but the boat sails a
  circle wide enough to foul a neighbour or find the shallows.

The cure for a rode that snatches is not a heavier anchor — it is more scope. The
cure for a boat that wanders is not a shorter rode alone, but heavier ground
tackle to keep the curve without the length.

The bench uses the catenary of a weighted rode directly:

```
s = sqrt(d(d + 2a))     a = H / w      H_max = w(L² − d²) / 2d
```

where `d` is the depth (taken as 8 m), `w` the chain weight per metre, `H` the
horizontal blow, and `L` the rode length. The pull arrives flat while `H ≤
H_max`; past that it tips up toward the straight-chord angle.

## The bench

One anchorage from the side — the seabed below, the boat riding at the surface,
the rode between. Set the **scope**, the **blow**, and the **ground tackle**. The
page shows the catenary, the chain still resting on the bottom, and the angle the
pull makes at the anchor, and lights the **holding band**.

It opens on a short scope in a hard gust, the rode bar-taut and the anchor
lifting. **Veer more scope** — and watch the curve deepen and the pull lie flat.

*Part of [Slack](../) — three parallel ideas on the measured give a working
thing needs. 2026-08-04.*
