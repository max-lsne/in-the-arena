"""Rebuild the page's imagery from scratch.

    python tools/render_scene.py 2560 1920 tools/final     # the studio render (~2 min)
    python tools/build_assets.py                            # frames, matte, sample

Everything on the page comes from these two scripts. The photograph is a
raymarched still life (numpy, no 3D engine). The six noise frames are real
output of quantum_pipeline.py at 10, 50, 200, 1 000, 4 000 and 16 000 shots,
so what the hero shader mixes is the project's own measurement, not a filter.
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from quantum_pipeline import process_image, run_simulator  # noqa: E402

OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)
big = Image.open(ROOT / "tools" / "final.png").convert("RGB")
mask = Image.open(ROOT / "tools" / "final_mask.png").convert("L")

big.resize((1280, 960), Image.LANCZOS).save(OUT / "scene.webp", quality=86, method=6)
mask.resize((640, 480), Image.LANCZOS).save(OUT / "scene-mask.png", optimize=True)

w, h = big.size
sample = big.crop((int(0.35 * w), int(0.06 * h), w, int(0.71 * h))).resize((256, 192), Image.LANCZOS)
sample.save(ROOT / "sample.png", optimize=True)
sample.save(ROOT / "api" / "sample.png", optimize=True)

base = big.resize((960, 720), Image.LANCZOS)
rng = np.random.default_rng(192)
stats = {}
for shots in (10, 50, 200, 1000, 4000, 16000):
    r = process_image(base, 8, shots, lambda amp, s: run_simulator(amp, s, rng=rng), "simulator")
    r.image.save(OUT / f"frame-{shots:05d}.webp", quality=78, method=6)
    stats[shots] = round(r.psnr_db, 1)
    print(shots, stats[shots], "dB")
json.dump(stats, open(ROOT / "tools" / "frame_stats.json", "w"))
