# Differential

**A differential is a gear that lets two driven wheels turn at different speeds
while still driving them both. Round a corner the outer wheel must run further
than the inner, and a solid axle would fight it — one tyre scrubbing, the other
dragging. The differential dissolves the fight: it splits one drive into two that
are free to differ. But the freedom it gives to *speed* it takes from *torque* —
it can only ever push the two wheels equally hard — and that single fact is both
why your car corners without a shudder and why, with one wheel on ice, it will
sit and spin and go nowhere.**

The whole of it is a mechanical average. The carrier — the cage the drive turns —
carries a small pinion free to spin on its own pin, and that pinion meshes with a
gear on each half-shaft. Whatever the carrier does, the pinion shares it out: if
one wheel runs faster, the other must run slower by exactly as much. So the
carrier always turns at the *mean* of the two wheels, and their sum is fixed:

`ω_left + ω_right = 2·ω_carrier`

Their difference is free — that is the cornering. Their sum is pinned — that is the
drive. One relation carries both.

## The one relation, read twice

Take the two wheel speeds `ω_L`, `ω_R`, the carrier speed `ω_c` the driveshaft
sets, and the torque `T` the engine feeds the carrier. Idealise the gears as
lossless and the whole of it is two lines that never let go of each other:

- **The speeds split freely.** `ω_L + ω_R = 2·ω_c`. The carrier turns at the average
  of the two wheels; their sum is fixed by the drive, their difference is whatever
  the road asks. Straight, they run together; in a corner the outer gains exactly
  what the inner loses. This is the whole point of the gear — it lets the wheels
  differ, so they need not scrub.
- **The torque splits equally.** `T_L = T_R = T ⁄ 2`, always, whatever the speeds.
  The pinion sits on its pin like a beam on a fulcrum, an equal arm to each side,
  so it can only push the two wheels with equal force. It cannot favour one. This
  is not a fault to be tuned out — it is the same symmetry that frees the speeds.

Those two lines are one gear seen from two ends. The pinion that averages the
speeds is the same pinion that equalises the torque; you cannot have the first
without the second. And the second has a sting.

## The sting: twice the weaker wheel

Because the torque to each wheel is always equal, and because a wheel can pass to
the road no more torque than its grip allows, **an open differential can deliver at
most twice the grip of its *worst* wheel.** Put one wheel on ice and its grip is
nearly nothing; the equal-split rule holds the *other* wheel — the one on dry
ground, with grip to spare — down to that same nearly-nothing. The axle's whole
tractive effort is capped at twice a tiny number. Feed it more throttle and the
extra has nowhere to go but into the wheel that already slips: it spins up, faster
and faster, while its speed climbs the sum-relation holds it to — `ω_ice` rising by
exactly what `ω_grip` falls, the car motionless, one wheel a blur and the other
still. The freedom that rounds the corner is the freedom that strands you.

That is why a differential meant to *pull* — a tractor, a rally car, an off-roader —
is fitted with a way to break the symmetry when it hurts: a limited-slip that leaks
torque toward the wheel that still grips, or a lock that welds the two shafts into
one solid axle for as long as you hold it. Each buys back traction by giving up,
for a moment, the very freedom the differential was for.

## The bench

A driven rear axle in a corner. Set the **turn** the road asks — straight to
hairpin — and watch the outer wheel gain exactly what the inner loses, their sum
pinned to twice the carrier: the sum-bar inset is the gear's soul, a beam whose two
ends slide apart about a fixed midpoint. Set the **throttle** — the torque the
engine feeds the carrier — and the **ground under the inner wheel** — dry tarmac,
wet, gravel, sheet ice — and read whether the axle drives, nears the edge, or breaks
into spin. The torque splits equally to both wheels; the panel reads each wheel's
speed and the equal torque, the tractive torque that actually reaches the road, and
the ceiling — twice the weaker wheel's grip — past which the inner wheel lets go.
The gauge sets the per-wheel demand against that grip; the curve plots the tractive
torque delivered against throttle, rising with it until it clips flat at the ceiling
and the rest is wasted spin. Press *Find the break* to raise the throttle to the
exact edge — the most this ground will take before the inner wheel spins — and
*Reset* to return to the gentle, gripping state it opens on.

The turn, throttle and ground you set are kept in `localStorage`, so a reader finds
the bench as they left it between visits. A live status line (`aria-live`) reads each
state to a screen reader — the corner and the two wheel speeds, the equal torque, and
whether the axle drives, nears the edge, or has broken into spin, with the tractive
torque it delivers against the ceiling of twice the weaker wheel's grip — debounced
past slider drags. Under `prefers-reduced-motion` the bench holds still: the wheels
and carrier do not turn and the drive arrows do not sweep, each state landing as a
settled arrangement read at a glance rather than a running machine; a live change to
the setting is honoured. The whole bench works from the keyboard — <kbd>F</kbd> finds
the break, <kbd>R</kbd> resets, <kbd>1</kbd>–<kbd>4</kbd> pick the ground, <kbd>[</kbd>
eases the turn and <kbd>]</kbd> tightens it, and <kbd>−</kbd>/<kbd>=</kbd> back off and
add throttle.

The four grounds move the ceiling enormously: **dry tarmac** takes almost any
throttle before a wheel lets go; **wet** halves it; **gravel** less again; **sheet
ice** breaks at a breath, and the axle delivers barely a tenth of what one wheel on
dry ground could pass alone. Nothing about the dry wheel has changed — only its
twin — and the equal-split rule drags them both down together.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The gears are idealised as lossless and the grounds are
stylised, but the shape is exact: the speeds sum to twice the carrier
(`ω_L + ω_R = 2·ω_c`), the torque splits equally (`T_L = T_R`), and an open
differential's tractive effort is capped at twice the grip of its worst wheel.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-22.*
