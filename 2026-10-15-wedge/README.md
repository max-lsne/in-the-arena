# Wedge

**A wedge is an inclined plane you drive instead of climb: two shallow faces meeting at an
edge, pushed in along their length to force apart whatever they enter. Like any simple
machine it trades force for distance — the shallower the taper, the greater the force, and
the further the wedge must travel to deliver it, the same bargain a lever makes. But a
wedge keeps a second account no lever opens. Friction along its faces can grip hard enough
that the load cannot push the wedge back out, so the wedge stays exactly where it was
driven — it self-locks — and it does so on one clean condition: when its taper angle falls
inside the friction cone, `α ≤ φ`. Steepen the wedge and it delivers more work for less
travel and runs more efficiently; but the holding margin shrinks as you do, and the instant
the taper passes the cone the load spits the wedge out on its own.**

A *wedge* is the oldest and simplest machine there is — an axe, a chisel, a splitting maul,
a door wedge, a taper key, a folding shim under a machine foot are all one shape. It is an
inclined plane freed from the ground and set moving, and everything it does is read off one
angle set against one other: the **taper** it is ground to, and the **friction angle** its
faces happen to have.

## The one inequality, read a few ways

Take the taper half-angle `α` — the angle each face makes with the line you drive along —
the coefficient of friction `μ` between the faces, and from it the *friction angle*
`φ = arctan μ`, the steepest slope a surface holds a resting weight on before it slides.
Drive the wedge against a resistance `W` normal to its face. Idealise the faces as flat and
the resistance as a single normal force, and the whole machine is this:

- **Advantage is the taper.** The frictionless force the wedge delivers is `MA = cot α`
  times your push: a 10° wedge multiplies by about six, a 5° wedge by eleven. It is bought
  back, to the last foot-pound, in travel — you push `cot α` as far as the load moves. Force
  for distance, the lever's own coin.
- **Driving in and backing out are never the same price.** Pushing a wedge in takes
  `P = W·tan(α + φ)` — taper and friction both fought on the way in. Backing it out takes
  `W·tan(α − φ)` — the taper helping now, the friction still resisting. Friction is added
  going in and subtracted coming out.
- **It self-locks inside the friction cone.** When `α ≤ φ` the withdrawal force turns
  negative: the load cannot push the wedge out, you must *pull* it. The wedge holds its own
  output with nothing holding it — the one trick no lever, pulley, or gear train can do
  unaided.
- **Efficiency and grip pull opposite ways.** The work delivered is `η = tan α ⁄ tan(α + φ)`,
  which *rises* as the wedge steepens, while the holding margin `φ − α` *shrinks*. So the
  best wedge is the **steepest one still inside the cone**, `α` a hair under `φ`: the most
  work delivered, and still held.

The load `W` scales the forces but not the regime: whether a wedge holds, labours, or
springs is set by the taper against the friction angle alone. It is the same force-for-distance
discipline the [fulcrum](../2026-10-04-fulcrum/) knows — where the best lever is likewise the
least advantage that does the job, never the most — and the self-locking is the same one-way
grip that lets a [worm](../2026-09-21-worm/) gear drive its wheel and never be back-driven,
near-cousin to the [pawl](../2026-09-24-pawl/) that holds a ratchet with a tooth where the
wedge holds with an angle. A screw is only a wedge wrapped round a cylinder, and locks by
the same line.

## Four states

- **Holds** — the taper sits well inside the cone, with efficiency enough to be worth
  driving. It bites, lifts, and stays; a gib key, a cotter, a taper pin.
- **On the edge** — the taper has crept near the friction line. It still holds, and holds
  efficiently, but a film of oil or a little wear would drop `φ` toward `α` and free it.
- **Thankless** — the taper is far below the cone. Enormous force and an absolute hold, but
  tiny efficiency: you drive it forever, most of your work turns to heat, and it is murder
  to extract.
- **Springs** — the taper has passed the cone. Not self-locking: the load drives the wedge
  straight back out. A splitting wedge wants this; a holding wedge is ruined by it.

## The bench

A wedge driven under a load between two faces that rub. Set the **taper** — how shallow or
steep the wedge is — and watch the force and the travel trade against each other. Choose the
**faces**, from oiled steel through dry metal to a rough, rusted pair, and watch the friction
cone `φ` widen or shrink — the line the taper must stay inside to hold. Set the **load**: it
scales the forces but not the regime. Press *Seat it* to set the steepest taper that still
self-locks on these faces — the most work delivered, and still held.

The panel reads the taper and its travel ratio `1:cot α`, the friction cone `φ` the faces
give, the advantage `MA = cot(α + φ)`, the drive-in force `P = W·tan(α + φ)`, the efficiency
`η`, and the holding margin `φ − α` — positive while it holds, negative when it springs. The
curve plots efficiency rising and advantage falling against the taper, with the spring line
at `α = φ` and the band just inside it where the hold grows thin; the work panel splits your
effort into the share that reaches the load and the share lost to friction in the faces; and
the gauge below sets the taper against the friction cone, green where it self-locks, amber on
the edge, oxblood where it springs.

The taper, the faces and the load are kept in `localStorage`, so a reader finds the bench as
they left it. A live status line (`aria-live`) reads each state to a screen reader — the
wedge, the faces, the load, the advantage and efficiency, and whether it holds, sits on the
edge, works thanklessly, or springs — debounced past slider drags. Under
`prefers-reduced-motion` the wedge is held at its settled place: it does not drive in or get
ejected, each state landing as a single arrangement read at a glance rather than a running
action; a live change to the setting is honoured. The whole bench works from the keyboard —
<kbd>S</kbd> seats it, <kbd>R</kbd> resets, <kbd>1</kbd>–<kbd>4</kbd> pick the faces,
<kbd>[</kbd> shallower and <kbd>]</kbd> steeper, and <kbd>−</kbd>/<kbd>=</kbd> ease and add
load.

Each page is one HTML file, one stylesheet, one script. No build, no account, no network once
it has loaded. The faces are idealised as flat and the load as a single normal force, but the
shape is exact: the advantage runs as `cot α`, the drive-in force as `W·tan(α + φ)`, the
efficiency as `tan α ⁄ tan(α + φ)`, and the wedge self-locks on exactly the one condition that
`α ≤ φ`.

*One of a series — a page a day, each built on one old working word and the discipline hidden
inside it. 2026-10-15. One angle, standing in for a hand that holds.*
