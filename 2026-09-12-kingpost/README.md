# Kingpost

**Lean two rafters together and their feet kick outward; the harder they carry,
the harder they spread. A **tie beam** across the feet stops the spread, taking
in tension the exact sideways thrust the rafters throw. That leaves the long tie
sagging under its own ceiling — so a **kingpost** drops from the ridge to the
middle of the tie and hangs it up. The surprise is in the word: a *post* should
prop something up, in compression, but this one is in **tension**, holding the
tie beam up. Every force in the frame follows from the geometry of that one
triangle, and the pitch of the roof is the dial that sets them all.**

The word is plain carpentry — the *king* post is the chief upright of the frame,
as the *king* pin is the chief pin — and it names the member, not its job, which
is why it misleads. A kingpost does not carry the ridge down to the ground; there
is no ground under it, only the tie beam it hangs from. It is a hanger with the
build of a strut, and it stands in tension because the load it carries — the
ceiling slung below the tie — pulls it down, and the ridge above holds it up.

## The one relation

Cut the truss at a joint and balance the arrows — the method of joints. Each wall
carries half the total load, a reaction `R = (W_roof + W_ceiling)/2`. Let the
rafters rise at a pitch `θ`. Three balances give the whole frame:

- **The rafters** — balancing the vertical at a foot, the reaction pushes up and
  the rafter pushes down its slope: `C = R / sin θ`, compression. Flatten the
  roof and `sin θ` shrinks, so the compression climbs.
- **The tie** — balancing the horizontal at the same foot, the tie holds back the
  rafter's outward push: `T = R / tan θ`, tension. This is the wall thrust, and
  as `θ → 0` it grows without bound. Halve the pitch, roughly double the thrust.
- **The kingpost** — balance the joint at the middle of the tie, where only the
  post reaches up: it carries whatever hangs there, `P = W_ceiling`, in tension,
  *independent of the pitch and of the roof load overhead*.

So the pitch is the one dial, and it pulls the rafters and the tie in opposite
directions. Steepen the roof and the rafters ease but grow long and slender, apt
to buckle; the tie relaxes. Flatten it and the rafters stand stout and upright,
but the tie and the walls take a punishing thrust. Between them is the pitch that
shares the load most evenly — and for almost any span it lands near the pitch old
roofs were cut to. The kingpost sits the argument out.

## The bench

A kingpost truss on two walls under a roof load at the ridge and a ceiling load
hung on the post: the **two rafters** in compression, the **tie** and the
**kingpost** in tension, each drawn heavier and darker as it nears its limit,
with the outward **thrust** on the walls and the force triangle that closes at
the foot. Pick the **truss** — a steep cottage roof, a common barn, a wide low
chapel, a loft under a heavy ceiling — set the **load** as a share of the truss's
design load, and swing the **pitch** from a low 12° up to a steep 62°. The gauge
reads the force in each member against its limit, and the load the truss safely
carries. Press *Find the pitch* to swing the roof to the pitch that shares the
load most evenly between the rafters and the tie.

The four trusses show a different member giving first: the steep **cottage**
buckles a rafter, the wide low **chapel** tears the tie's heel joint under its
thrust, the **loft** hangs too much ceiling on its post for any pitch to help —
because the post carries the ceiling whatever the roof does. The **barn** is the
everyman truss, sound at a common pitch.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The four trusses' sections and design loads are
stylised — plausible, not measured — but the forces drawn from them are exact:
the reactions `R`, the rafter `C = R/sin θ`, the tie and wall thrust
`T = R/tan θ`, and the kingpost carrying the ceiling load flat. Rafter capacity
is the Rankine blend of squash and Euler buckling over the rafter's length; the
tie is limited by its heel joint, the post by its hanger.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-12.*
