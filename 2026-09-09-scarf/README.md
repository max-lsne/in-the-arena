# Scarf

**A joint is only as strong as the way it turns a *pull* into a *slide*. Glue
does its worst work in tension — pull two faces apart and even a good glue gives
at a low stress — and its best work in shear, where the whole bonded area holds
at once. A **butt** joint gets it exactly wrong: pure tension on the bare
cross-section, and it lets go almost at first pull. A **scarf** cuts a long
shallow taper in each end and laps them, so the same pull is spread over a face
many times the cross-section and lands mostly as shear the glue can hold. Cut
the taper shallow enough and the joint disappears into the piece — the member
breaks in clear timber, well off the scarf, as if it had never been cut.**

The word is old and northern — a *scarf* is a joint made by notching, from Old
Norse *skarfr* — and every trade that has to make one length of timber out of
two carries the same secret the hand learns before the eye does: you do not glue
the ends together, you glue a slope. The boatbuilder scarfs a plank so it bends
round the hull as one piece; the joiner scarfs a moulding so the run reads
unbroken; both cut the same shallow taper for the same reason. The wood did not
get stronger and the glue did not get stronger. The cut simply keeps handing the
glue a gentler version of the same pull, until the weakest thing left in the
member is the timber itself.

## The one relation

Take a member of cross-section `A` under an axial pull `F`, so the timber
carries `σ = F/A`. Cut the scarf at a slope of `1:N` — one across the thickness
for `N` along the length — and let `φ` be the angle the cut makes with the axis,
`tanφ = 1/N`. The whole joint falls out of one resolution of that stress onto
the slanted face:

- **The face** — a plane at angle `φ` across the bar has area
  `A_face = A/sinφ = A·√(1 + N²)`. A 1:8 scarf glues eight times the
  cross-section, and that alone is most of the win.
- **The two stresses** — resolving `σ` onto the face splits it into a **shear**
  `τ = σ·sinφ·cosφ = ½σ·sin2φ` that slides the faces, and a **peel**
  `σ_n = σ·sin²φ` that pries them apart. Shallow the scarf and the peel dies as
  `sin²φ` while the shear falls too; steepen it to the butt (`φ = 90°`, `N = 0`)
  and it all lands as pure tension, `σ_n = σ`.
- **The balance** — the joint reaches the timber's own strength when the glue
  outlasts the wood: `σ_wood·N/(1+N²) ≤ τ_glue` and `σ_wood/(1+N²) ≤ σ_glue`.
  The steepest — shortest — scarf that clears both is the answer the trades
  reach for, and for real wood and glue it lands between **1:8 and 1:12**.

So the one dial is the length of the taper. A steep, short scarf saves timber
and fails in the glue; a long, shallow one spends a hand's width of good wood
and develops the full strength of the piece. The cut adds nothing — it only
decides, in one number, whether the wood or the glue is the weakest thing in the
member.

## The bench

Two timbers lapped in a scarf and pulled end to end: the **two pieces** and the
slanted **glue face** between them, the **pull** at the ends, and on the face
the resolved **shear** that slides it and the **peel** that pries it apart. Pick
the **joint** — a knotty pine batten in PVA, a Douglas-fir plank in epoxy, an
oak rail in hide glue, a hard-maple handle in polyurethane — set how hard you
**pull** as a share of what the solid timber could take, and cut the **scarf**
from a square butt out to a long 1:12 taper. The gauge reads the load the joint
holds, the wall where it breaks, and the **timber** ceiling beyond which the
wood itself gives. Press *Find the scarf* to cut the shortest taper that still
makes full strength. The numbers are the real ones: the face `A·√(1+N²)`, the
shear `½σ·sin2φ`, the peel `σ·sin²φ`, and the load and mode the joint would
fail at.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The four joints' timber and glue strengths are
stylised — plausible, not measured — but the mechanics drawn from them are
exact.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-09.*
