# Siphon

**Fill a tube, hang it over the rim of a full vessel so one end reaches down
below the liquid's surface, and it empties itself — carrying the liquid *up*
over the crest and down the far side with no pump and no hand. The trick is paid
for entirely by the far side: the flow is set by how far the outlet falls below
the source, and by nothing else — not by how high the crest stands. What the
crest sets instead is whether the siphon can run at all, because the pressure at
the top of the bend falls below the atmosphere by the whole height of liquid it
must hold up, and when that pressure reaches the liquid's vapour point the column
boils, parts, and the siphon breaks. Two heights, read against one another:
the **fall** gives the flow, the **lift** spends a fixed budget of atmosphere.**

A siphon looks like something for nothing — liquid climbing a hill — and it is
not. It is a falling column that happens to route part of its drop over a rise,
held together over the top not by suction but by the weight of the atmosphere
pressing on the two open surfaces. The word is old and plain — Greek *síphon*, a
pipe — and the discipline hidden in it is that a machine can give you all the
flow you ask for and still refuse to start, and that the two are set by different
numbers.

## The one relation

Let the source surface stand a height `H` above the outlet (the **fall**) and the
crest stand a height `L` above the source (the **lift**), with the atmosphere
`P₀` pressing on both open surfaces and the liquid of density `ρ`. Take it ideal
and frictionless and the whole of it is three short lines:

- **The flow.** Read from the source surface to the outlet and the speed at the
  outlet is `v = √(2·g·H)` — set by the **fall alone**, not by the crest. So the
  discharge is `Q = A·v`. Raise the outlet toward the source and the flow
  slackens; bring it level and the flow dies; the crest, however high, does not
  enter this line.
- **The lift.** Read from the source surface to the crest and the pressure there
  is `P_crest = P₀ − ρ·g·(L + H)` — below the atmosphere by the *whole* height
  from crest to outlet. The siphon runs only while `P_crest` stays above the
  liquid's vapour pressure `P_v`, so the crest may stand at most
  `L_max = (P₀ − P_v)⁄(ρ·g) − H` above the source. That first term is the
  **barometric ceiling** `H̄` — about `10.3 m` for cold water, `0.76 m` for
  mercury. The faster it flows, the lower the crest it can clear: the fall eats
  the ceiling.
- **The prime.** Nothing starts a siphon; the tube must be filled first. Once the
  falling leg outweighs the rising one, the atmosphere holds the column charged
  on its own — but let air into the crest, or let the source fall below the tube's
  mouth, and the column parts and it stops.

So two heights do two different jobs. The **fall** sets how hard it runs and can
be made as large as the drop allows. The **lift** sets whether it runs at all,
and spends against a fixed budget — the barometric ceiling — that the fall is
already drawing down. Between a feeble trickle and a parted column is the rig a
fitter sets: fall enough to move the liquid, crest low enough to keep the top of
the bend clear of the vapour point with margin.

## The bench

A siphon primed and running: a **source** vessel at the left, the tube climbing
to a **crest** and falling to an **outlet** below, the liquid coloured heavier
and darker as the pressure at the crest nears its vapour point. Pick the
**liquid** — cold **water**, light **oil**, **mercury**, near-boiling **hot**
water — each with its own barometric ceiling; set the **fall** from the source to
the outlet, and the **lift** of the crest above the source. The gauge reads the
crest against the ceiling the liquid can clear *at this fall*, and the panel reads
the flow, the crest pressure, and the head to spare. Press *Find the crest* to
raise the bend to the tallest it will still carry with margin below the vapour
point. The liquid, fall and lift you set are kept in `localStorage`, so a reader
finds the bench as they left it between visits; *Reset* returns it to the low,
timid crest it opens on.

The four liquids break at wildly different lifts, and none of it is the fall's to
fix: **water** clears about ten metres, light **oil** a little more (lighter, and
almost no vapour), **mercury** barely three-quarters of a metre — which is why a
barometer is a mercury column and not a water one — and **hot** water almost
nothing at all, because near the boil its vapour pressure has already eaten most
of the atmosphere's budget. The ceiling is the liquid's, not the plumbing's.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The flows are the ideal, frictionless figures — a
real tube runs slower — but the pressures and the ceilings are exact: the flow
`√(2·g·H)`, the crest pressure `P₀ − ρ·g·(L+H)`, the ceiling
`(P₀ − P_v)⁄ρg − H`, and the break where the crest pressure meets the vapour
point.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-20.*
