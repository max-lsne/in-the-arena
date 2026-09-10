# Flitch

**Fasten two materials so they cannot bend apart, and they must bend
*together*. Bolt a steel plate between two timber leaves — a **flitch beam** —
and the sandwich is forced to deflect as one member, so wood and steel share a
single curvature. From that one geometric fact the whole beam follows: the load
splits between them in proportion to *stiffness*, not strength; at every fibre
the steel carries `n = E_s/E_w` times the stress the wood carries there; and the
pair carries more, and sags less, than either could alone. The plate's thickness
is the one sizing dial — and it never changes which material reaches its limit
first. That is decided the moment you pair a timber with a steel.**

The word is a plain one from the sawmill — a *flitch* is a slab cut the length
of a log, from Old English *flicce*, a side of bacon — and the flitch beam is
the trick a builder reaches for when a timber will not do on its own but a steel
joist is too dear, too heavy, or too cold to leave bare. Two boards and a plate
of mild steel, drilled and bolted, and you have a beam that hides its strength
inside honest wood. The wood did not get stronger and the steel did not get
stronger. The bolts simply forbid the two from taking up their own separate
radii, and force them onto one.

## The one relation

Bending bends a beam to some radius `R`, and the strain at a fibre a height `y`
off the neutral axis is `y/R` — the same for every material fastened into that
curve. Take two timber leaves and a steel plate, all of depth `d`, and let `t`
be the plate's thickness:

- **The share** — each material has a flexural rigidity `E·I`, and because they
  share one curvature the moment splits as the rigidities do,
  `M_s/M_w = E_s·I_s / E_w·I_w`, with the pair bending to `1/R = M/ΣEI` where
  `ΣEI = E_w·I_w + E_s·I_s`. Add plate and `ΣEI` climbs, so the deflection
  `δ = W·L³/48ΣEI` falls.
- **The two stresses** — at the extreme fibre `y = d/2` the wood carries
  `σ_w = E_w·(d/2)/R` and the steel `σ_s = n·σ_w`, with `n = E_s/E_w` — about
  twenty for steel on softwood. Thicken the plate and both fall together, in
  fixed ratio; the plate never touches `n`.
- **Who gives first** — the timber governs if `n·f_w < f_y` and the steel
  governs if it does not, where `f_w` is the wood's bending strength and `f_y`
  the steel's yield. A property of the pairing, decided before a bolt is driven.

So the plate thickness does two honest things at once — it raises the load the
pair can carry and it cuts how far the pair sags — but it cannot change the
character of the beam. A soft timber under a hard steel always yields in the
wood; a strong timber under a mild steel always feels the plate reach its limit
first.

## The bench

A flitch beam on two supports under a load at midspan: the **two timber leaves**
and the **steel plate** between them, drawn both in span — bending down by the
**sag** the load draws out of it — and in section, where the plate you set
thickens between the leaves, beside the shared strain `ε = y/R`. Pick the
**beam** — a spruce joist in mild steel, a Douglas-fir beam, a short deep oak
lintel, a long glulam header — set the **load** as a share of what the bare
timber alone could carry to its bending limit, and slide the **plate** from none
up to a stout half-inch. The gauge reads the stress in the wood and in the steel
against each one's limit, the deflection against the span-in-360 line, and the
load the pair safely carries. Press *Find the flitch* to cut the thinnest plate
that brings all three inside their limits.

The four beams show the three ways a flitch can be governed: the soft **spruce**
yields in the wood, the hard **oak** makes the mild plate yield first, and the
long **glulam** runs into its deflection limit before either material is near
breaking — the commonest reason a sound timber gets a flitch at all: not
weakness, but bounce.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded. The four beams' sections and material strengths are
stylised — plausible, not measured — but the mechanics drawn from them are
exact: the shared curvature `1/R = M/ΣEI`, the split by `ΣEI`, the stresses in
fixed ratio `n`, the deflection `W·L³/48ΣEI`.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-09-10.*
