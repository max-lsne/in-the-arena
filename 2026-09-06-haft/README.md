# Haft

**Every tool you swing has one point on its head where a blow lands clean — the
target takes the whole of it and the hand feels nothing. Miss it and a shock
runs back up the *haft*: hit short of it and the handle throws your hands
forward, hit past it and the tip snaps them back. That point is the **centre of
percussion**, and where it sits is fixed by nothing but how the tool's mass is
spread. It is the same point a clockmaker calls the centre of oscillation — the
length of the pendulum that would swing in step with the tool. The sweet spot,
the balance, and the swing are one fact wearing three names.**

The word is old and plain — the *haft* is the handle, the shaft you hold and
swing, from Old English *hæft*. And every hafted thing, from a framing hammer to
a felling axe to a bat, carries a secret the hand learns before the head does:
there is exactly one place to land the blow. Strike a fencepost with an axe an
inch too near the tip and the recoil stings your palms; land it on the sweet
spot and the same blow bites deep and your hands stay quiet. The wood didn't
change. You found the **centre of percussion** — the point conjugate to your
grip, where the reaction the handle must carry falls to nothing.

## The one relation

Hold the tool at a grip, and follow a blow struck a distance `x` down the head
from that grip. The reaction the grip must supply — the jolt the hand feels —
comes out astonishingly simple:

- **The reaction** — `P = J · (x / L_cop − 1)`, where `J` is the blow and
  `L_cop` the distance from the grip to the sweet spot. The shock the hand takes
  is the blow, scaled by *how far the strike sits past the sweet spot* as a
  fraction of the sweet-spot distance. Land on it — `x = L_cop` — and `P` is
  exactly zero, whatever the blow.
- **Where the spot is** — `L_cop = I / (m · d) = k² / d`. The sweet spot sits at
  the tool's moment of inertia about the grip, divided by its mass and by the
  grip-to-centre-of-mass distance `d`. Equally, at the radius of gyration
  squared over that same arm — so `k² = L_cop · d`: the radius of gyration is
  the *geometric mean* of the arm to the balance point and the arm to the sweet
  spot.
- **The three names.** That same `L_cop` is the length of the simple pendulum
  that swings from the grip in the tool's own time — the **centre of
  oscillation**. Huygens proved the two points reciprocal; Kater hung a bar by
  each in turn and, when the two swings matched, read the Earth's gravity off a
  ruler and a clock. The place that eats the shock and the place that sets the
  swing are the same place.

Put the mass in the head — a hammer, a maul — and the sweet spot walks out to
sit almost on the head itself, which is why you must strike a hammer nearly
true. Spread it thin and even — a plain rod off one end — and it settles at two
thirds of the way down, the schoolbook result. Choke up on the handle and it
shifts again. The hand never computes any of this; it just moves the grip until
the sting goes quiet, and lands on the answer.

## The bench

One tool, held at the grip and seen along its length: the **head**, the
**centre of mass**, and the lit band of the **sweet spot**. Pick the
**implement** — a bat, a framing hammer, a felling axe, a sword — set where you
**choke** up the handle and how hard you **swing**, then slide the **strike
point** along the head and watch the reaction arrow at the grip grow, vanish,
and flip. The gauge below reads the strike against the sweet spot, with the
comfort walls that close in as you swing harder. Press *Find the sweet spot* to
drop the strike onto `L_cop`, and the hand goes dead. The numbers are the real
ones: `L_cop = I/(m·d)`, the reaction `J·(x/L_cop − 1)`, the radius of gyration
`√(I/m)`, and the equal-pendulum period the same length would keep.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The mass models of the four tools are stylised —
plausible, not measured — but the mechanics drawn from them are exact.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-06.*
