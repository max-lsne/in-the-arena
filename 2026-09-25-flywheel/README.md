# Flywheel

**A flywheel is a wheel made deliberately heavy at the rim and added to a shaft to
store turning as energy and even out its speed. Its whole use is to carry a drive
that arrives in gusts — a single piston that fires once every second turn, a press
that bites for an instant and idles the rest — and hand back, smoothly, what the
gusts leave short. While the drive gives more than the load takes, the surplus spins
the wheel a little faster; while the drive falls short, the wheel gives that energy
back and slows a little to do it. The shaft turns nearly even. But the same inertia
that will not let the shaft surge is the same inertia that will not let it start,
stop, or be spun a hair too fast — and the ceiling on how fast is set not by the
wheel's size but by the speed of its rim.**

The whole of it is one store, `E = ½·I·ω²`, read three ways. Energy in a turning
wheel is counted around the axis: `I`, the *moment of inertia*, is the mass weighted
by the **square** of how far it sits from the axle. That square is the design — a
kilogram at the rim, twice the radius of a kilogram at the hub, stores four times the
energy for the same weight. So a flywheel is made thin at the centre and thick at the
rim: a plain disc has `I = ½·m·r²`, a rim-heavy wheel reaches `I ≈ m·r²`, twice the
store for the same mass.

## The one relation, read three ways

Take the moment of inertia `I`, the mean spin `ω`, the energy the drive makes the
wheel bank and spend each cycle `ΔE`, and the rim's speed `v = ω·r`. Idealise the
bearings as frictionless:

- **It stores as the square of speed.** `E = ½·I·ω²`. Doubling the speed *quadruples*
  the hoard — a flywheel at speed carries far more than intuition allows, which is
  both its use and its hazard.
- **It smooths in proportion to that store.** The speed wobble left over is
  `Cs = ΔE ⁄ (I·ω²)` — the fraction the speed swings across a cycle. The drive fixes
  `ΔE`; the wheel fixes `I·ω²`. So to *halve* the surge you double the inertia (or
  spin it faster), with steeply diminishing returns to piling on more.
- **The ceiling is rim speed, not size.** A spinning rim is held together only by its
  own strength, and the hoop stress is `σ = ρ·v²` — density times the square of the
  rim speed, *with no radius in it*. A big wheel and a small one of the same material
  burst at the **same rim speed**. You cannot make a flywheel safe by making it
  bigger.

Those three are one fact turned three ways. The store that steadies the drive is the
store that resists your hand and the store that can burst. Steadiness lives in
`I·ω²`, so a heavy wheel run slow surges as badly as a light one run fast — both
terms matter.

## The bench

A shaft with a flywheel, a pulsing **drive** on one side and a steady **load** on the
other. Set the **flywheel** — how much inertia the rim carries — and watch the speed
trace flatten as you add mass. Choose the **drive**, from a near-even steam engine
through a twin and a single to a four-stroke single that fires once every second
turn; the lumpier it is, the more energy `ΔE` the wheel must bank and spend, and the
harder it is to steady. Set the **load** the shaft drives against: because the drive's
mean torque equals the load at balance, the load alone sets the mean speed
(`ω̄ = ω_free·(1 − τ_L ⁄ τ0)`), and both extremes fail. Too heavy and the mean speed
falls until the store `½·I·ω²` is too small to steady the same fluctuation — the wheel
*labours*. Too light and the wheel runs away, its rim climbing past the material's
limit — it *bursts*, and no amount of extra mass helps, because the ceiling was the
rim's speed all along.

The panel reads the mean speed the load sets, the speed swing across a cycle, the
fluctuation `Cs` against the mill's tolerance, the energy stored in the rim and the
energy banked and spent each cycle, the rim's speed against the bursting limit, and
the spin-up time — the inertia's cost, felt at the start. The speed trace plots the
wobble across one cycle against a tolerance band; the curve beside it plots
`Cs = ΔE ⁄ (I·ω²)` falling as the wheel grows, marking where it crosses the tolerance;
the gauge below sets the rim's speed against `v_max`. Press *Steady it* to add the
least flywheel that brings the surge under tolerance — and read, when the trouble is
burst or a labouring speed rather than too little wheel, that no wheel will fix it and
the load is what must move.

The flywheel, the load and the drive you set are kept in `localStorage`, so a reader
finds the bench as they left it. A live status line (`aria-live`) reads each state to
a screen reader — the wheel, the drive and the load, the mean speed and the store, and
whether the shaft runs steady, surges, labours, or bursts — debounced past slider
drags. Under `prefers-reduced-motion` the wheel is held still: it does not turn and the
playhead does not sweep, each state landing as a settled arrangement read at a glance
rather than a running shaft; a live change to the setting is honoured. The whole bench
works from the keyboard — <kbd>S</kbd> steadies it, <kbd>R</kbd> resets,
<kbd>1</kbd>–<kbd>4</kbd> pick the drive, <kbd>[</kbd> lightens the wheel and <kbd>]</kbd>
adds to it, and <kbd>−</kbd>/<kbd>=</kbd> ease and add load.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The bearings are idealised as frictionless and the drive
profiles are stylised, but the shape is exact: the store grows as `E = ½·I·ω²`, the
speed wobble falls as `Cs = ΔE ⁄ (I·ω²)`, and the bursting limit is a rim speed
`σ = ρ·v²` that a wheel's size does nothing to raise.

*One of a series — a page a day, each built on one old working word and the discipline
hidden inside it. 2026-09-25.*
