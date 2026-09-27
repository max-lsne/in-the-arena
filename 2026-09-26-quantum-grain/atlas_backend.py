"""atlas_backend.py: adapter for Moth's Atlas API (api.mothquantum.com).

Atlas does not take a raw circuit or amplitude vector. It works through
engines: fixed, pre-registered quantum programs, each with a JSON schema for
its params and declared input/output file slots. You call
POST /engines/{engine_id}/process, poll GET /jobs/{id}/status, then fetch
GET /jobs/{id}/result.

This adapter calls one of Atlas's own published engines, `tessa-image-v1`.
It encodes an image's pixels onto qubits (each pixel's colour becomes a
point on a sphere, the same coordinates that describe a qubit's own state:
a radius and two angles), transforms it on the device, measures, and decodes
it back into an image, optionally on a real IBM QPU. That is the same
encode/measure/decode idea this whole project is built on, published as a
real engine rather than hand-built here, so the Atlas engine in this bench
runs the whole photo through Moth's own pipeline instead of a custom
per-block amplitude scheme.

Confirmed against the live OpenAPI spec at api.mothquantum.com/openapi.json,
fetched by hand and pasted in (outbound access to mothquantum.com is
blocked from the sandbox this was built in). Endpoint paths, request/response
shapes, and the engine's param names below are taken directly from that spec,
not guessed.
"""

from __future__ import annotations

import io
import os
import time
from typing import Optional

import requests
from PIL import Image

API_BASE = os.environ.get("ATLAS_API_BASE", "https://api.mothquantum.com/api/v1")
ENGINE_ID = os.environ.get("ATLAS_ENGINE_ID", "tessa-image-v1")
# Real IBM hardware by default ("least_busy" picks whichever device is
# queued shortest). Set ATLAS_MACHINE=aer for a fast noiseless check, or a
# fake_<chip> name for a real chip's noise model without the real queue.
MACHINE = os.environ.get("ATLAS_MACHINE", "least_busy")


class AtlasError(RuntimeError):
    pass


class AtlasClient:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.environ.get("ATLAS_API_KEY")
        if not self.api_key:
            raise AtlasError(
                "No Atlas API key. Set ATLAS_API_KEY in your environment, "
                "create one at https://platform.mothquantum.com/"
            )

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}"}

    def _request(self, method: str, path: str, **kwargs):
        timeout = kwargs.pop("timeout", 30)
        try:
            resp = requests.request(method, f"{API_BASE}{path}", headers=self._headers(), timeout=timeout, **kwargs)
        except requests.RequestException as exc:
            raise AtlasError(f"couldn't reach Atlas at {API_BASE}: {exc}") from exc
        if resp.status_code >= 400:
            detail = resp.text
            try:
                body = resp.json()
                detail = body.get("detail") or body.get("title") or detail
                errors = body.get("errors")
                if errors:
                    detail += ": " + "; ".join(f"{e.get('location')}: {e.get('message')}" for e in errors)
            except ValueError:
                pass
            raise AtlasError(f"Atlas {method} {path} failed ({resp.status_code}): {detail}")
        return resp

    def upload_image(self, image_bytes: bytes, filename: str = "photo.png", content_type: str = "image/png") -> str:
        created = self._request(
            "POST", "/assets",
            json={"filename": filename, "content_type": content_type, "size_bytes": len(image_bytes)},
        ).json()
        asset_id = created["asset_id"]
        upload = created["upload"]
        put = requests.put(upload["url"], data=image_bytes, headers=upload.get("headers", {}), timeout=60)
        if put.status_code >= 300:
            raise AtlasError(f"asset upload failed ({put.status_code}): {put.text}")
        self._request("POST", f"/assets/{asset_id}/complete")
        return asset_id

    def submit_job(self, engine_id: str, params: dict, input_files: dict | None = None) -> str:
        body = {"params": params}
        if input_files:
            body["input_files"] = input_files
        return self._request("POST", f"/engines/{engine_id}/process", json=body).json()["job_id"]

    def wait_for_job(self, job_id: str, poll_interval: float = 2.0, timeout: Optional[float] = None) -> dict:
        if timeout is None:
            timeout = float(os.environ.get("ATLAS_JOB_TIMEOUT", 280.0))
        deadline = time.time() + timeout
        while time.time() < deadline:
            status = self._request("GET", f"/jobs/{job_id}/status").json()
            state = status["status"]
            if state == "completed":
                return status
            if state in ("failed", "cancelled"):
                err = status.get("error") or {}
                raise AtlasError(f"Atlas job {job_id} {state}: {err.get('message', 'no detail given')}")
            time.sleep(poll_interval)
        raise AtlasError(
            f"Atlas job {job_id} did not finish within {timeout}s. "
            "A real QPU queues jobs; try again or set ATLAS_MACHINE=aer to check the pipeline without the queue."
        )

    def fetch_result(self, job_id: str) -> dict:
        return self._request("GET", f"/jobs/{job_id}/result").json()


def run_image_on_atlas(image: Image.Image, shots: int, machine: str | None = None) -> tuple[Image.Image, dict]:
    """Upload `image`, run it through Atlas's tessa-image-v1 engine, return
    (result_image, info). info has job_id, machine, engine_id."""
    client = AtlasClient()
    machine = machine or MACHINE

    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="PNG")
    asset_id = client.upload_image(buf.getvalue())

    job_id = client.submit_job(
        ENGINE_ID,
        params={"shots": shots, "machine": machine},
        input_files={"image": asset_id},
    )
    client.wait_for_job(job_id)
    result = client.fetch_result(job_id)

    outputs = result.get("outputs")
    if not outputs:
        raise AtlasError(f"{ENGINE_ID} returned no file output: {result}")
    img_resp = requests.get(outputs[0]["url"], timeout=60)
    if img_resp.status_code >= 300:
        raise AtlasError(f"couldn't download Atlas result image ({img_resp.status_code})")
    result_image = Image.open(io.BytesIO(img_resp.content)).convert("RGB")
    return result_image, {"job_id": job_id, "machine": machine, "engine_id": ENGINE_ID}
