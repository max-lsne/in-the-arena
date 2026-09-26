# Quantum Grain

**A photograph's pixels, held as the amplitudes of a quantum state — and an
amplitude is a thing you can never read, only measure.** Each block of pixels
is flattened into a signal and put onto a quantum circuit the same way Moth's
own `quantum-audio` package puts sound there: as the amplitudes of a prepared
state, via Quantum Probability Amplitude Modulation (QPAM). There is no way
to ask a circuit "what are your amplitudes." You measure it, many times, and
count how often each outcome came up. From that histogram you reconstruct
the pixels — approximately, because a finite number of shots is a finite
amount of evidence. Few shots and the picture comes back **grainy**, in the
oldest sense of the word: not a stylised filter, but literally what a
measurement looks like when it hasn't been given enough tries. Run the same
circuit on a real quantum processor through Moth's **Atlas** API instead of a
simulator, and the grain picks up something no simulator can add: the
device's own decoherence, on top of the shot noise.

Built for [Moth Hack 2026](https://luma.com/wmrrdpcj), the "Quantum-native"
challenge — a repo of a quantum application that runs a process on media.

## The one relation, read three ways

- **Fidelity rises with shots, but only as a square root.** Halving the noise
  takes *four times* the shots, not two. On a real QPU, shots aren't free —
  they're queued time on a scarce device.
- **Bigger blocks spend the same shot budget on exponentially more
  amplitudes.** An 8×8 block needs 6 qubits; a 16×16 block needs 8 — but the
  second has *four times* as many amplitude buckets sharing the same shots,
  so each is measured four times more thinly.
- **A real device adds a floor no shot count erases.** A simulator's only
  error is shot noise, which → 0 as shots → ∞. A real QPU decoheres, its
  gates aren't perfect, and its readout misfires sometimes — a floor set by
  the hardware, not moved by adding more shots. That's the one thing here a
  simulator cannot fake.

## Run it

```
pip install -r requirements.txt
python server.py
# open http://localhost:5057
```

Drop in a photo (or click "use sample"), pick a block size and shot budget,
pick an engine, hit Run. `simulator` runs instantly and locally. `atlas`
sends the same circuits to a real QPU through Moth's API — and because real
QPU time is queued, it processes a bounded patch of the frame (marked with a
dashed line) rather than the whole thing; the rest of the frame is shown
exactly as uploaded, never simulated in its place. The reading panel gives
PSNR against the original, mean and worst-block, plus wall time and how many
blocks actually got processed.

## Architecture

- `quantum_pipeline.py` — the encode → measure → decode loop. Block-splits an
  image, runs each block through `quantumaudio`'s QPAM scheme, computes
  PSNR/MSE. Pixel values are pre-scaled from `[0, 1]` to `[-1, 1]` before
  encoding (QPAM's amplitude convention assumes that range) — this alone
  roughly halves the shot-noise floor at a given shot budget over encoding
  `[0, 1]` directly, since it spends the full available amplitude range
  instead of only its upper half.
- `atlas_backend.py` — the one piece that could not be tested end-to-end:
  outbound access to `platform.mothquantum.com` was blocked from the sandbox
  this was built in, so the exact job-submission contract (endpoint paths,
  request/response shape) is a **documented best-effort placeholder**, not a
  confirmed one. Everything it needs to satisfy is one method —
  `AtlasBackend.run(circuit, shots) -> counts dict` — so fixing it up against
  the real API reference (shown on your dashboard next to your key) is a
  self-contained, one-file change; nothing downstream needs to know.
- `server.py` — the one backend in the whole `in-the-arena` series. Every
  other page here is one HTML file, one stylesheet, one script, no build, no
  account, no network once loaded. This one breaks that on purpose: the
  entire point is a texture that only exists if a real measurement happened,
  and there's no honest way to simulate that in-browser.
- `index.html` / `styles.css` / `script.js` — the bench itself, in the same
  visual language as the rest of the series (localStorage, `aria-live`
  status, full keyboard control, `prefers-reduced-motion`).

## Why this, for judging

Most "quantum-native media" entries reach for a quantum RNG bolted onto a
classical filter. This doesn't fake anything: the grain you see *is* the
reconstruction error from a finite number of real measurements, the same
statistics behind shot noise anywhere, computed with Moth's own published
QPAM scheme rather than a bespoke encoding, and the `atlas` engine's patch is
never backfilled with simulated pixels — if it doesn't come from the QPU, it
isn't shown as if it did.

*One of a series — a page a day, each built on one old working word and the
discipline hidden inside it. For one day, on a real quantum processor
instead of an idealised law. 2026-09-26.*
