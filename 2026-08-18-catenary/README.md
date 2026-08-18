# Catenary

**Hang a chain from two points and let it settle. It does not fall into just any
droop — it takes one exact curve, the same every time, set by nothing but its own
weight and where you pinned the ends. Each link must carry the whole weight of the
chain below it, so the chain is steepest at the ends, where the full load pulls
through, and flattest at the bottom, where it carries only itself. Follow that rule
link by link and the curve it forces is `y = a·cosh(x/a)` — the hyperbolic cosine,
not the parabola it so resembles. Galileo looked at a hanging chain and called it a
parabola; he was wrong, and it took Huygens, Leibniz, and Johann Bernoulli in 1691
to find the true shape. Turn that curve upside down and it stands as an arch that
holds itself up in pure compression. This is the catenary.**

The word is Latin — *catēna*, a chain — and it was coined by Christiaan Huygens,
who as a boy of seventeen had already proved the curve was *not* the parabola
everyone assumed. Before his word for it, people called the shape the *chainette*.
Its study is where the calculus of variations cut its teeth: the catenary is the
curve that, for a chain of given length hung between two points, sits with its
centre of gravity as low as it can go.

## Where the curve comes from

Look at the piece of chain from the lowest point out to some point along the curve.
Three forces hold it still:

- At the **low point**, the rest of the chain pulls horizontally with a tension
  `H` — purely sideways, because the curve is level there.
- At the **far end**, the chain beyond pulls along the curve, at whatever slope the
  curve has reached.
- **Straight down** hangs the weight of the piece — its length times the weight per
  unit length `w`.

Balancing them gives two facts. The horizontal pull `H` is the **same everywhere**
along the chain, since nothing acts sideways to change it. And the slope at any
point equals the weight hung below divided by `H`. Because that weight grows with
the **arc length** of chain, differentiating once more turns the balance into the
equation whose solution is the hyperbolic cosine:

> **y = a · cosh(x / a),   with   a = H / w.**

The single constant `a` — horizontal tension over weight-per-length — sets the
whole shape. A taut, lightly loaded chain has a large `a` and hangs shallow; a
slack or heavy one has a small `a` and plunges.

For a chain pinned across a horizontal span `S`, with one end raised by `h`, and
given a length `L` longer than the straight gap, the constant `a` is found from a
single equation:

> **√(L² − h²) = 2a · sinh(S / 2a).**

The bench solves this for `a` on every change and reads everything else off it —
the sag, the pull at the anchors and at the belly, the steepest slope.

## A chain is not a parabola

The catenary and the parabola nearly agree near the bottom, which is why Galileo
mistook one for the other, but they part toward the ends — and the difference says
what is doing the loading. A bare chain is loaded by **its own length**, spread
evenly along the curve, and that gives the cosh. Load the same cable by its
**horizontal span** instead — hang a heavy level roadway from it, so every metre
*across* carries equal weight — and the curve becomes an exact **parabola**.

That is the difference between a power line, which droops in a true catenary
because it carries only itself, and a **suspension bridge**, whose cables pull into
a parabola because what they really hold is the flat deck below. Toggle the
**parabola** overlay on the bench to watch the two curves kiss at the bottom and
separate toward the ends, the catenary always the fuller of the two.

## The bench

A chain pinned between two anchors, drawn side-on.

- **span** — how far apart the anchors sit. Widen it without paying out more chain
  and the same slack pulls taut, driving the anchor tension up.
- **slack** — how much longer the chain is than the straight gap. A hair of slack
  hangs shallow and pulls hard; a lot of slack plunges deep but eases the anchors
  toward simply carrying half the weight each.
- **tilt** — raise one anchor above the other. The chain keeps its shape but slides
  its lowest point toward the lower end; lift too far for the slack and it runs out
  straight.

The chain is drawn **thicker where it pulls harder** — thin at the slack belly,
taut and thick at the ends. The readout gives the pull at the anchors and at the
belly in multiples of the chain's own weight `W`, the steepest slope, the length,
and the curve constant `a`. Press **Flip to arch** and the same curve turns over to
stand on the ground, every pull becoming a push.

## As hangs the chain, so stands the arch

Robert Hooke hid the whole of arch theory in a Latin anagram in 1675; unscrambled,
it reads *as hangs the flexible line, so but inverted will stand the rigid arch*. A
hanging chain is in pure **tension** — every part pulls. Freeze the curve, turn it
over, and every pull becomes a push: the inverted catenary stands in pure
**compression**, each stone leaning on its neighbours with no sideways bending to
crack it. Wren shaped the dome of St Paul's near this curve; Gaudí hung weighted
strings upside down to design his churches and read the arches straight off the
shadows; the Gateway Arch in St Louis is a *weighted* catenary, thickened at the
feet. Flipping the chain on the bench is that same trick, done in a browser.

Each page is one HTML file, one stylesheet, one script. No build, no account, no
network once it has loaded.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. 2026-08-18.*
