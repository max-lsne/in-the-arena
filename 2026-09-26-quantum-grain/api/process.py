"""Vercel serverless entrypoint for POST /api/process.

Thin HTTP wrapper around quantum_pipeline.process_image — see that module
(and atlas_backend.py) for the actual encode/measure/decode logic, which is
identical to what server.py runs for local development. Both import from
the project root, one directory up, added to sys.path below.
"""

import base64
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from PIL import Image  # noqa: E402

from atlas_backend import AtlasError, get_run_fn  # noqa: E402
from quantum_pipeline import process_image  # noqa: E402

app = FastAPI()

MAX_SIDE = 256          # longest edge accepted, simulator engine
# Hard cap on real-QPU jobs per request. Tune this once you've seen actual
# Atlas job latency: each block is one job, submitted and polled in series.
MAX_BLOCKS_ATLAS = int(os.environ.get("MAX_BLOCKS_ATLAS", 24))


def _decode_data_url(data_url: str) -> Image.Image:
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    raw = base64.b64decode(data_url)
    return Image.open(io.BytesIO(raw))


def _encode_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@app.post("/{_path:path}")
async def process(request: Request, _path: str = ""):
    body = await request.json()
    try:
        img = _decode_data_url(body["image"])
    except Exception as exc:  # noqa: BLE001 — surfaced to the UI as a plain message
        return JSONResponse({"error": f"couldn't read that image: {exc}"}, status_code=400)

    block = int(body.get("block", 8))
    shots = int(body.get("shots", 2000))
    engine = body.get("engine", "simulator")

    if block not in (4, 8, 16):
        return JSONResponse({"error": "block must be 4, 8, or 16"}, status_code=400)
    if not (10 <= shots <= 20000):
        return JSONResponse({"error": "shots must be between 10 and 20000"}, status_code=400)

    img.thumbnail((MAX_SIDE, MAX_SIDE))

    max_blocks = MAX_BLOCKS_ATLAS if engine == "atlas" else None

    try:
        run_fn = get_run_fn(engine)
    except (AtlasError, ValueError) as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)

    try:
        result = process_image(
            img, block=block, shots=shots, run_fn=run_fn, engine_name=engine,
            max_blocks_per_channel=max_blocks,
        )
    except AtlasError as exc:
        return JSONResponse({"error": str(exc)}, status_code=502)

    return JSONResponse(
        {
            "image": _encode_data_url(result.image),
            "stats": {
                "engine": result.engine,
                "block": result.block,
                "shots": result.shots,
                "qubitsPerBlock": result.qubits_per_block,
                "blocksProcessed": result.blocks_processed,
                "blocksTotal": result.blocks_total,
                "mse": result.mse,
                "psnrDb": result.psnr_db,
                "worstPsnrDb": result.worst_psnr_db,
                "wallTimeS": result.wall_time_s,
                "patchBox": result.patch_box,
            },
        }
    )
