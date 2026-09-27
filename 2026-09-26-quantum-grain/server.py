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

from quantum_pipeline import process_image, run_simulator, compare_images
from atlas_backend import AtlasError, run_image_on_atlas

load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=HERE, static_url_path="")

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
    if engine not in ("simulator", "atlas"):
        return jsonify({"error": f"unknown engine {engine!r}"}), 400

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
            return jsonify({"error": str(exc)}), 502
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

    return jsonify({"image": _encode_data_url(result_image), "stats": stats})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5057))
    app.run(host="127.0.0.1", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
