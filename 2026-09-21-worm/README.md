# Worm

**A worm is a screw laid against a toothed wheel so its spiral thread drives the
teeth. Turn the worm and the wheel creeps round — one tooth per turn, slow and
immensely strong. Try it the other way, and if the thread is fine enough *nothing
moves*: the load cannot drive the worm back, and the gear holds itself with no
brake and no pawl. That self-lock is the worm's whole reputation — a hoist that
stays where you leave it, a tuning peg that keeps its string — and it is not free.
It is bought, in full, from efficiency, and one angle sets both.**

Unroll one turn of the thread and it is a straight ramp of lead angle `λ`; every
tooth of the wheel is a block riding that ramp. So the whole gear is the oldest
question of the incline: will the block slide, or will friction hold it? Friction
sets a critical angle of its own — the **friction angle** `ρ = arctan μ` — and a
ramp shallower than `ρ` will not let its load slide back however hard gravity pulls.
That is the entire self-locking rule: the worm holds the load exactly while
`λ ≤ ρ`.

## The one relation

Take the lead angle `λ`, the friction angle `ρ = arctan μ` at the mesh, and a
single-start worm on a wheel of `z` teeth. Idealise it as a square thread and the
whole of it is three short lines:

- **The drive.** Turn the worm and the wheel turns at a reduction of `z : 1` — one
  tooth per turn — with an efficiency `η = tan λ ⁄ tan(λ + ρ)`. It falls away as the
  lead grows fine: at the self-lock boundary it is already below one half, and below
  that boundary most of the work becomes heat.
- **The hold.** Try to drive it backward, from the wheel, and the efficiency is
  `η′ = tan(λ − ρ) ⁄ tan λ`. When `λ ≤ ρ` that is zero or less: the load *cannot*
  move the worm, and the gear holds itself. When `λ > ρ` the load overhauls — it
  runs the worm backward and drops, unless a brake holds it.
- **The trade.** The two share one number. Cut the lead fine — `λ` well under `ρ` —
  and you buy a firm self-lock and a high reduction, and pay with an efficiency near
  zero. Cut it steep and you buy efficiency, and pay by losing the hold. There is no
  lead that is both free and self-locking; the boundary `λ = ρ` is the best either
  can do.

So one angle does two opposite jobs. A holding worm — a hoist, a jack, a peg — is
cut deliberately shallow, under the friction angle, and its low efficiency is not a
fault but the price of the lock, carried away as heat. A worm cut for power, to
move a load and not hold it, is cut steep and above the friction angle, and given a
brake to hold what it will no longer hold itself.

## The bench

A worm driving a wheel that lifts a load. Set the **lead angle** of the thread and
the **friction** at the mesh — an oil bath that barely locks, a greased or dry
bronze, dry steel that locks over a wide band — and set the **wheel** it turns. The
panel reads the reduction, the drive efficiency, the hold margin `ρ − λ`, and
whether the load is held or overhauls. The gauge below sets the lead against the
friction angle — the self-lock threshold — with the green band of leads that still
hold and the wall past which the load runs back. The **ramp inset** shows why: one
turn of the thread unrolled into an incline, a block riding it, and the friction
cone that either swallows the block's weight (it cannot slide) or lets it go (it
slides back down). The **curve** plots the drive efficiency against the lead, the
self-locking band shaded, the half-efficiency line drawn. Press *Find the hold* to
raise the lead to the steepest that still self-locks with margin — the highest
efficiency a holding lead allows. The mesh, lead and wheel you set are kept in
`localStorage`, so a reader finds the bench as they left it between visits; *Reset*
returns to the modest self-locking lead it opens on. A live status line
(`aria-live`) reads each state to a screen reader — the mesh and its friction angle,
the reduction and the lead, the drive efficiency, and whether the worm holds, buries
its work in heat, creeps past the hold, or runs the load back — debounced past
slider drags. Under `prefers-reduced-motion` the bench holds still: the worm and
wheel do not spin and the drive arrow does not sweep, each state read as a settled
arrangement rather than a running machine; a live change to the setting is honoured.

The four frictions place the wall very differently: an **oil bath** self-locks only
below about `1.7°`, so a greased worm barely holds; **dry bronze** holds up to about
`5°`; **dry steel** up to about `8.5°`. Lubricate a worm you meant to hold and you
can unlock it — the lower friction pulls the wall in under the lead you cut.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The efficiencies are the ideal square-thread figures; a
real worm's teeth meet at a pressure angle that raises the effective friction a
little — `μ′ = μ ⁄ cos φₙ` — lowering the efficiency and lifting the self-lock
threshold a touch, but the shape is exact: the drive `tan λ ⁄ tan(λ+ρ)`, the
back-drive `tan(λ−ρ) ⁄ tan λ`, and the lock at `λ = ρ`.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-21.*
