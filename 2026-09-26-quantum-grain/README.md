# Quantum Grain

**A photograph's pixels, held as the amplitudes of a quantum state. An
amplitude is a thing you can never read, only measure.** Each block of pixels
is flattened into a signal and its values become the amplitudes of a quantum
state, normalised so their squares sum to one. That's the same QPAM (Quantum
Probability Amplitude Modulation) scheme Moth's own `quantum-audio` package
uses for sound, applied here to pixels. There is no operation that returns a
quantum state's amplitudes directly. You measure it, many times, and count
how often each outcome came up. From that histogram you reconstruct the
pixels, approximately, because a finite number of shots is a finite amount
of data. Few shots and the picture comes back **grainy**. That's literally
what a reconstruction looks like when it's based on too few measurements.
Run the same circuit on a real quantum processor through Moth's **Atlas**
API instead of a simulator, and the result also contains something no
simulator can produce: the device's own decoherence, added to the shot
noise.

Built for [Moth Hack 2026](https://luma.com/wmrrdpcj), the "Quantum-native"
challenge: a repo of a quantum application that runs a process on media.

## The one relation, read three ways

- **Fidelity rises with shots, but only as a square root.** Halving the noise
  takes *four times* the shots, not two. On a real QPU, shots aren't free.
  They're queued time on a scarce device.
- **Bigger blocks spend the same shot budget on exponentially more
  amplitudes.** An 8×8 block needs 6 qubits; a 16×16 block needs 8. The
  second has *four times* as many amplitude buckets sharing the same shots,
  so each is measured four times more thinly.
- **A real device adds a floor no shot count erases.** A simulator's only
  error is shot noise, which goes to 0 as shots go to infinity. A real QPU
  decoheres, its gates aren't perfect, and its readout misfires sometimes.
  That's a floor set by the hardware, not moved by adding more shots, and the
  one thing here a simulator cannot fake.

## Run it

```
pip install -r requirements.txt
python server.py
# open http://localhost:5057
```

Drop in a photo (or click "use sample"), pick a block size and shot budget,
pick an engine, hit Run. `simulator` runs instantly and locally. `atlas`
sends the same amplitudes to a real QPU through Moth's API, and because real
QPU time is queued, it processes a bounded patch of the frame (marked with a
dashed line) rather than the whole thing. The rest of the frame is shown
exactly as uploaded, never simulated in its place. The reading panel gives
PSNR against the original, mean and worst-block, plus wall time and how many
blocks actually got processed.

## Architecture

- `quantum_pipeline.py`: the encode, measure, decode loop, in plain NumPy.
  For a circuit that only prepares a state and measures it once, the exact
  output distribution is a multinomial draw from `|amplitude|^2`, not an
  approximation of one, because there's no later gate for a simulator to add
  interference from. This computes that draw directly instead of building
  and simulating a Qiskit circuit: verified numerically identical to real
  qiskit-aer output, and it cuts the dependency stack from roughly 450MB
  (Qiskit, qiskit-aer, scipy) down to numpy and pillow. Pixel values are
  pre-scaled from `[0, 1]` to `[-1, 1]` before encoding, matching QPAM's
  amplitude convention; that alone roughly halves the shot-noise floor at a
  given shot budget, since it spends the full amplitude range instead of
  only its upper half.
- `atlas_backend.py`: the one piece that could not be tested end to end.
  Outbound access to `platform.mothquantum.com` was blocked from the sandbox
  this was built in, so the exact job-submission contract (endpoint paths,
  request/response shape) is a **documented best-effort placeholder**, not a
  confirmed one. It sends the amplitude vector itself rather than a
  hand-built circuit or QASM string, on the bet that Atlas exposes a
  state-prep-and-measure endpoint rather than requiring callers to construct
  circuits by hand. Everything it needs to satisfy is one method,
  `AtlasBackend.run(amplitudes, shots) -> counts`, so fixing it up against
  the real API reference (shown on your dashboard next to your key) is a
  self-contained, one-file change. Nothing downstream needs to know.
- `server.py` (local) and `api/process.py` / `api/sample.py` (Vercel): thin
  HTTP wrappers around the same pipeline. This is the one backend in the
  whole `in-the-arena` series. Every other page is one HTML file, one
  stylesheet, one script, no build, no account, no network once loaded. This
  one breaks that on purpose: its entire point is a texture that only exists
  if a real measurement happened, and there's no honest way to simulate that
  in-browser.
- `index.html` / `styles.css` / `script.js`: the bench itself, in the same
  visual language as the rest of the series (localStorage, `aria-live`
  status, full keyboard control, `prefers-reduced-motion`).

## Why this, for judging

Most "quantum-native media" entries add a quantum RNG to a classical filter.
This doesn't fake anything. The grain you see *is* the reconstruction error
from a finite number of real measurements, the same statistics that produce
shot noise anywhere, computed with the same amplitude
scheme Moth's own quantum-audio package publishes rather than a bespoke
encoding. The `atlas` engine's patch is never backfilled with simulated
pixels: if a pixel doesn't come from the QPU, it isn't shown as if it did.

*One of a series, a page a day, each built on one old working word and the
discipline hidden inside it. For one day, on a real quantum processor
instead of an idealised law. 2026-09-26.*
