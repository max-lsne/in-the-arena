"""Vercel serverless entrypoint for GET /api/sample."""

import base64
import io
import os

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from PIL import Image

app = FastAPI()

HERE = os.path.dirname(os.path.abspath(__file__))


@app.get("/{_path:path}")
async def sample(_path: str = ""):
    img = Image.open(os.path.join(HERE, "sample.png"))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    return JSONResponse({"image": data_url})
