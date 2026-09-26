"""atlas_backend.py — adapter for Moth's Atlas API (platform.mothquantum.com).

Everything else in this repo — the QPAM encode/decode, the block loop, the
stats, the UI — is finished and tested against a local simulator. The one
piece that could not be verified from the sandbox this was built in is this
file: outbound network access to platform.mothquantum.com was blocked there,
so the exact job-submission contract (endpoint paths, request/response
shape) below is a best-effort placeholder, not a confirmed one.

Before the hackathon: open https://platform.mothquantum.com/keys, find the
API reference / code sample shown next to your key, and adjust `_submit`
and `_await_counts` to match it. The contract the rest of the pipeline
needs from you is exactly one method:

    AtlasBackend(...).run(circuit: QuantumCircuit, shots: int) -> dict

...where the returned dict is Qiskit-counts-shaped: bitstrings (e.g.
"0110") mapped to how many of `shots` measurements produced them. Nothing
downstream cares how you got there.
"""

from __future__ import annotations

import os
import time

import requests
from qiskit import QuantumCircuit, qasm2


class AtlasError(RuntimeError):
    pass


class AtlasBackend:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        poll_interval: float = 1.5,
        timeout: float = 90.0,
    ):
        self.api_key = api_key or os.environ.get("ATLAS_API_KEY")
        if not self.api_key:
            raise AtlasError(
                "No Atlas API key. Set ATLAS_API_KEY in your environment or "
                ".env file — generate one at https://platform.mothquantum.com/keys"
            )
        self.base_url = (
            base_url or os.environ.get("ATLAS_API_BASE") or "https://platform.mothquantum.com/api"
        ).rstrip("/")
        self.poll_interval = poll_interval
        self.timeout = timeout

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def run(self, circuit: QuantumCircuit, shots: int) -> dict:
        """Submit `circuit`, block until it completes, return a counts dict."""
        qasm = qasm2.dumps(circuit)
        try:
            job_id = self._submit(qasm, shots)
            return self._await_counts(job_id)
        except AtlasError:
            raise
        except requests.RequestException as exc:
            raise AtlasError(f"couldn't reach Atlas at {self.base_url}: {exc}") from exc

    # -- placeholder wire format; confirm against the Atlas API reference --

    def _submit(self, qasm: str, shots: int) -> str:
        resp = requests.post(
            f"{self.base_url}/jobs",
            headers=self._headers(),
            json={"qasm": qasm, "shots": shots},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["id"]

    def _await_counts(self, job_id: str) -> dict:
        deadline = time.time() + self.timeout
        while time.time() < deadline:
            resp = requests.get(
                f"{self.base_url}/jobs/{job_id}", headers=self._headers(), timeout=30
            )
            resp.raise_for_status()
            payload = resp.json()
            status = payload.get("status")
            if status in ("completed", "done", "succeeded"):
                return payload["result"]["counts"]
            if status in ("failed", "error"):
                raise AtlasError(f"Atlas job {job_id} failed: {payload.get('error')}")
            time.sleep(self.poll_interval)
        raise AtlasError(
            f"Atlas job {job_id} did not finish within {self.timeout}s — "
            "a real QPU queues jobs; try fewer shots or fewer blocks"
        )


def get_run_fn(engine: str):
    """engine -> callable(circuit, shots) -> counts, the one contract every
    engine in this repo shares."""
    if engine == "simulator":
        from quantum_pipeline import run_simulator

        return run_simulator
    if engine == "atlas":
        return AtlasBackend().run
    raise ValueError(f"unknown engine {engine!r}")
