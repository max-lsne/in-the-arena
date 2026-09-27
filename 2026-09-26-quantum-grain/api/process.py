"""Vercel serverless entrypoint for POST /api/process.

Thin HTTP wrapper around quantum_pipeline / atlas_backend — see those
modules for the actual encode/measure/decode logic and the Atlas engine
call, which is identical to what server.py runs for local development. Both
import from the project root, one directory up, added to sys.path below.
"""

import base64
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from PIL import Image  # noqa: E402

from atlas_backend import AtlasError, run_image_on_atlas  # noqa: E402
from quantum_pipeline import process_image, run_simulator, compare_images  # noqa: E402

app = FastAPI()

MAX_SIDE = 256                                              # simulator engine
ATLAS_MAX_SIDE = int(os.environ.get("ATLAS_MAX_SIDE", 96))  # keeps real-QPU jobs quick and cheap by default


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
    except Exception as exc:  # noqa: BLE001, surfaced to the UI as a plain message
        return JSONResponse({"error": f"couldn't read that image: {exc}"}, status_code=400)

    block = int(body.get("block", 8))
    shots = int(body.get("shots", 2000))
    engine = body.get("engine", "simulator")

    if block not in (4, 8, 16):
        return JSONResponse({"error": "block must be 4, 8, or 16"}, status_code=400)
    if not (10 <= shots <= 20000):
        return JSONResponse({"error": "shots must be between 10 and 20000"}, status_code=400)
    if engine not in ("simulator", "atlas"):
        return JSONResponse({"error": f"unknown engine {engine!r}"}, status_code=400)

    if engine == "simulator":
        img.thumbnail((MAX_SIDE, MAX_SIDE))
        result = process_image(img, block=block, shots=shots, run_fn=run_simulator, engine_name="simulator")
        stats = {
            "engine": "simulator",
            "block": result.block,
            "shots": result.shots,
            "qubitsPerBlock": result.qubits_per_block,
            "blocksProcessed": result.blocks_processed,
            "blocksTotal": result.blocks_total,
            "psnrDb": result.psnr_db,
            "worstPsnrDb": result.worst_psnr_db,
            "wallTimeS": result.wall_time_s,
        }
        result_image = result.image
    else:
        img = img.convert("RGB")
        img.thumbnail((ATLAS_MAX_SIDE, ATLAS_MAX_SIDE))
        try:
            result_image, info = run_image_on_atlas(img, shots=shots)
        except AtlasError as exc:
            return JSONResponse({"error": str(exc)}, status_code=502)
        mse, psnr_db = compare_images(img, result_image)
        stats = {
            "engine": "atlas",
            "shots": shots,
            "machine": info["machine"],
            "jobId": info["job_id"],
            "psnrDb": psnr_db,
            "worstPsnrDb": psnr_db,
            "wallTimeS": None,
        }

    return JSONResponse({"image": _encode_data_url(result_image), "stats": stats})
