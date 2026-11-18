# Swash

**Three small pages, made the same morning, for the part that trades a spin for a stroke: the
swashplate — a disc fixed to a shaft but set *aslant*, tilted off square by an angle α. Hold a
follower against its face and the slant reads the shaft's steady turn as a clean back-and-forth;
set a *ring* of followers round the one plate and their strokes stagger into a near-steady flow;
split the plate's single job into a *lift* and a *lean* and the same disc will fly a helicopter. It
reads three ways: the *stroke*, where one follower draws a pure sine; the *ring*, where many sum to
a delivery with a small ripple; and the *control*, where a collective height and a cyclic tilt lie
one on the other.**

Most days in this folder are one page. Some mornings the idea arrives already in threes. A
*swashplate* — also a *wobble plate*, or a *nutating disc* when it is the plate that tumbles rather
than the followers that march — is the plainest answer to a plain problem: how do you turn a rotation
into a straight-line push, or a push back into a rotation, without a crankpin sticking out the side?
Tilt a disc. That is the whole trick. The tilt is a slope, the slope is a sine, and the sine is the
stroke — and because the follower slides dead straight along the shaft, there is no connecting rod to
bend the sine out of true. It is the cleanest rotation-to-reciprocation there is.

## The three

- **[Stroke](./stroke/)** — *the pure sine.* One follower rides the tilted face at a radius `r`;
  barred from turning, it only slides along the shaft. Its travel is `z = r·tan α·sin θ` — a sine with
  no second harmonic, because nothing foreshortens it. The amplitude is `r·tan α` and the full stroke
  `2·r·tan α`, set by the tilt and the radius alone.
  Set the slant → turn the shaft → watch a spin come out as a clean rise and fall.

- **[Ring](./ring/)** — *the delivery.* Set `N` followers equally round the plate, each a quarter, a
  fifth, a seventh of a turn behind the last. On a pump, the ones on their out-stroke deliver; their
  flows add to a total `Q(θ)` that is nearly flat but carries a small **ripple** at `N` times a turn —
  and an **odd** `N` ripples far less than an even one. The same lopsided-sum lesson the
  **[Cardan](../2026-11-16-cardan/ripple/)** joint teaches about a single joint's flutter.
  Set the count → read the summed delivery → see the ripple shrink, and odd beat even.

- **[Control](./control/)** — *the two jobs.* The non-rotating plate can be *raised* bodily —
  **collective** — adding the same offset to every blade's pitch; and it can be *tilted* —
  **cyclic** — adding a once-per-turn swing that peaks at one azimuth. Blade pitch is their sum,
  `A₀ + A₁·cos(ψ − φ)`: a flat lift with a single wave laid over it. One plate, read by the rotating
  head as two independent commands.
  Set the lift and the lean → watch the flat and the wave add → steer the disc.

## The one relation

Everything here is one tilted disc, read at three depths. A plate on a shaft, tilted by `α`, spun to a
roll angle `θ`; a follower (or a blade root) sits at a plate-radius `r` and an azimuth `ψ`. The slant
forces the follower's axial position to

```
z(ψ, θ) = r·tan α·sin(θ − ψ)
```

Read it for one, for many, and for its parts:

- One follower at a fixed azimuth, `z = r·tan α·sin θ` — the **pure sine**, amplitude `r·tan α`.
  ([stroke](./stroke/))
- `N` followers at `ψ_k = 2πk/N`, their out-strokes summed — a near-flat **delivery** with an `N`-per-turn
  ripple, smallest when `N` is odd. ([ring](./ring/))
- The tilt split into a bodily lift `A₀` and a directed lean `A₁∠φ` — pitch `A₀ + A₁·cos(ψ − φ)`, a
  **constant plus a first harmonic**, the two helicopter controls superposed on one plate. ([control](./control/))

One slant makes the stroke; many slants, staggered, make the flow; one slant split in two makes the
steering. All three are that single line `z = r·tan α·sin(θ − ψ)`, asked three questions.

## What the plate is *not*

A **[crank](../2026-11-15-crank/)** also turns a rotation into a straight push — but it hangs the push
off a *finite rod*, and the rod bends the sine with a **[second harmonic](../2026-11-15-crank/rod/)**;
the swash has no rod and keeps the sine pure. A **[cam](../2026-08-27-cam/)** can shape *any* rise-and-fall
it likes by cutting a profile, paying with a line contact that wears; the swash gives only a sine, but
gives it with a full-face bearing and no profile to cut. A **[Geneva](../2026-08-30-geneva/)** hands
rotation on in *steps* with dwells; the swash never dwells — its follower only slows and reverses. And
where a **[flywheel](../2026-09-25-flywheel/)** is brought in to *smooth* a delivery after the fact, the
swash's own ring smooths it at the source, by staggering many strokes so their ripples nearly fill each
other in — most nearly when their count is odd.

## What's here

Three folders, each a self-contained page — one HTML file, one stylesheet, one script, no build and no
network once it has loaded. Each works the same tilted disc, read in its own trade: the one clean
stroke, the many-summed flow, the split control. Each keeps its settings in `localStorage`, reads
itself to a screen reader with a live status line, holds still under `prefers-reduced-motion` (the plate
shown at a settled angle, the follower mid-stroke), and works from the keyboard. Open any `index.html`
in a browser.

*One of a series — a page a day, each built on one old working word and the discipline hidden inside it.
Some mornings, three. 2026-11-18. A disc set aslant, and the stroke the slant is.*
