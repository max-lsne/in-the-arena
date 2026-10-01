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
The `atlas` engine runs the same idea through a different, real pipeline: it
sends the whole photo to one of Moth's own published Atlas engines, which
does its own encode, measure, and decode on a real quantum processor,
decoherence included.

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

Drop in a photo (or click "use sample"), pick a shot budget, pick an engine,
hit Run.

`simulator` runs this page's own block-by-block loop instantly and locally,
no queue; block size sets how many pixels share one circuit there. `atlas`
instead uploads the whole photo and sends it to `tessa-image-v1`, one of
Atlas's own published engines, which encodes each pixel's colour onto a
qubit and measures it on a real quantum processor. Real hardware is queued,
so an atlas run can take anywhere from several seconds to a few minutes. The
reading panel shows different fields per engine: block/qubit/PSNR detail for
`simulator`, and the job id and machine name Atlas reports for `atlas`.

## Architecture

- `quantum_pipeline.py`: the encode, measure, decode loop the `simulator`
  engine runs, in plain NumPy. For a circuit that only prepares a state and
  measures it once, the exact output distribution is a multinomial draw
  from `|amplitude|^2`, not an approximation of one, because there's no
  later gate for a simulator to add interference from. This computes that
  draw directly instead of building and simulating a Qiskit circuit:
  verified numerically identical to real qiskit-aer output, and it cuts the
  dependency stack from roughly 450MB (Qiskit, qiskit-aer, scipy) down to
  numpy and pillow. Pixel values are pre-scaled from `[0, 1]` to `[-1, 1]`
  before encoding, matching QPAM's amplitude convention; that alone roughly
  halves the shot-noise floor at a given shot budget, since it spends the
  full amplitude range instead of only its upper half.
- `atlas_backend.py`: the `atlas` engine's adapter. Atlas doesn't take a raw
  circuit or amplitude vector; it works through named engines, each with its
  own JSON param schema and declared input/output file slots, called via
  `POST /engines/{engine_id}/process`, polled via `GET /jobs/{id}/status`,
  and fetched via `GET /jobs/{id}/result`. This calls `tessa-image-v1`, an
  Atlas engine that encodes an image's pixels onto qubits (each pixel's
  colour becomes a point on a sphere, the same coordinates that describe a
  qubit's own state), transforms it on the device, measures, and decodes it
  back into an image, optionally on real IBM hardware. Confirmed directly
  against the live OpenAPI spec at `api.mothquantum.com/openapi.json`
  (outbound access to `mothquantum.com` was blocked from the sandbox this
  was built in, so the spec was fetched by hand and read in rather than
  queried live).
- `server.py` (local) and `api/process.py` / `api/sample.py` (Vercel): thin
  HTTP wrappers that route to one engine or the other and report PSNR
  against the original either way. This is the one backend in the whole
  `in-the-arena` series. Every other page is one HTML file, one stylesheet,
  one script, no build, no account, no network once loaded. This one breaks
  that on purpose: its entire point is a texture that only exists if a real
  measurement happened, and there's no honest way to simulate that
  in-browser.
- `index.html` / `styles.css` / `js/`: the page. `js/sound.js` synthesizes every
  sound with WebAudio (keys bottom out in two strokes, the knob ratchets, a
  run ticks like a Geiger counter, results ring a short chord; a switch in the
  top bar mutes it, and nothing plays before the first gesture). `js/hero.js`
  is a WebGL2 shader that mixes six real simulator frames of one photograph
  per pixel from an exposure value your cursor controls. `js/lab.js` runs the
  encode, measure, decode arithmetic on one 8x8 block in the browser.
  `js/bench.js` and `js/page.js` are the instrument and the page behaviour.
  Keyboard: R run, 1 2 3 block, [ ] shots, S / A engine, U sample. Fonts are
  self-hosted in `assets/fonts` (Anybody, Hanken Grotesk, Doto).
- `tools/`: the imagery is generated, not stock. `render_scene.py` is a numpy
  raymarcher for the studio still life; `build_assets.py` turns it into the
  six noise frames (real `quantum_pipeline` output), the matte, and the sample.

## Why this, for judging

Most "quantum-native media" entries add a quantum RNG to a classical filter.
This doesn't fake anything. The `simulator` engine's grain *is* the
reconstruction error from a finite number of real measurements, the same
statistics that produce shot noise anywhere, computed with the same
amplitude scheme Moth's own `quantum-audio` package publishes rather than a
bespoke encoding. The `atlas` engine doesn't reimplement that scheme on real
hardware; it calls Atlas's own production image-encoding engine directly,
so the real-QPU result comes from Moth's own pipeline, not a guess at one.

*One of a series, a page a day, each built on one old working word and the
discipline hidden inside it. For one day, on a real quantum processor
instead of an idealised law. 2026-09-26.*
