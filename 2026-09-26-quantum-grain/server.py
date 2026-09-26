"""Quantum Grain server: the one bench in the series with a backend, because
the point here is a real device's measurement noise, and no browser can run
that locally. Serves the static bench and one endpoint that runs the actual
encode → measure → decode loop.

    python server.py
    open http://localhost:5057
"""

from __future__ import annotations

import base64
import io
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from PIL import Image

from quantum_pipeline import process_image
from atlas_backend import AtlasError, get_run_fn

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=HERE, static_url_path="")

MAX_SIDE = 256          # longest edge we'll accept, simulator engine
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


@app.get("/")
def index():
    return send_from_directory(HERE, "index.html")


@app.get("/api/sample")
def sample():
    return jsonify({"image": _encode_data_url(Image.open(os.path.join(HERE, "sample.png")))})


@app.post("/api/process")
def process():
    body = request.get_json(force=True)
    try:
        img = _decode_data_url(body["image"])
    except Exception as exc:  # noqa: BLE001, surfaced to the UI as a plain message
        return jsonify({"error": f"couldn't read that image: {exc}"}), 400

    block = int(body.get("block", 8))
    shots = int(body.get("shots", 2000))
    engine = body.get("engine", "simulator")

    if block not in (4, 8, 16):
        return jsonify({"error": "block must be 4, 8, or 16"}), 400
    if not (10 <= shots <= 20000):
        return jsonify({"error": "shots must be between 10 and 20000"}), 400

    img.thumbnail((MAX_SIDE, MAX_SIDE))

    max_blocks = None
    if engine == "atlas":
        max_blocks = MAX_BLOCKS_ATLAS

    try:
        run_fn = get_run_fn(engine)
    except AtlasError as exc:
        return jsonify({"error": str(exc)}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        result = process_image(
            img, block=block, shots=shots, run_fn=run_fn, engine_name=engine,
            max_blocks_per_channel=max_blocks,
        )
    except AtlasError as exc:
        return jsonify({"error": str(exc)}), 502

    return jsonify(
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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5057))
    app.run(host="127.0.0.1", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
