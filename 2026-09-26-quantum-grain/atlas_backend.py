"""atlas_backend.py — adapter for Moth's Atlas API (platform.mothquantum.com).

Every engine in this pipeline shares one contract:

    run(amplitudes: np.ndarray, shots: int) -> counts

`counts` is either a flat array of length 2**n (index i -> how many of
`shots` measurements landed on basis state i) or a dict {"<index>": count}.
`quantum_pipeline.py` and the whole rest of the app only ever see that
contract — nothing downstream cares how a given engine satisfies it.

This sends the amplitude vector itself, not a hand-built quantum circuit or
QASM string — a bet that Atlas, built to need "no quantum experience,"
exposes a state-prep-and-measure endpoint rather than requiring callers to
construct circuits by hand. That bet, and the exact job-submission shape
below (`_submit` / `_await_counts`), is the one piece of this repo that
could not be verified end-to-end: outbound access to
platform.mothquantum.com was blocked from the sandbox this was built in.
Before relying on this at the hackathon, check the API reference shown next
to your key at https://platform.mothquantum.com/keys and adjust those two
methods if the real shape differs. Nothing else needs to change.
"""

from __future__ import annotations

import os
import time

import numpy as np
import requests


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
                "No Atlas API key. Set ATLAS_API_KEY in your environment — "
                "generate one at https://platform.mothquantum.com/keys"
            )
        self.base_url = (
            base_url or os.environ.get("ATLAS_API_BASE") or "https://platform.mothquantum.com/api"
        ).rstrip("/")
        self.poll_interval = poll_interval
        self.timeout = timeout

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    def run(self, amplitudes: np.ndarray, shots: int):
        """Submit `amplitudes`, block until the job completes, return counts."""
        try:
            job_id = self._submit(amplitudes, shots)
            return self._await_counts(job_id)
        except AtlasError:
            raise
        except requests.RequestException as exc:
            raise AtlasError(f"couldn't reach Atlas at {self.base_url}: {exc}") from exc

    # -- placeholder wire format; confirm against the Atlas API reference --

    def _submit(self, amplitudes: np.ndarray, shots: int) -> str:
        resp = requests.post(
            f"{self.base_url}/jobs",
            headers=self._headers(),
            json={"amplitudes": amplitudes.tolist(), "shots": shots},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["id"]

    def _await_counts(self, job_id: str):
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
    """engine -> callable(amplitudes, shots) -> counts, the one contract every
    engine in this repo shares."""
    if engine == "simulator":
        from quantum_pipeline import run_simulator

        return run_simulator
    if engine == "atlas":
        return AtlasBackend().run
    raise ValueError(f"unknown engine {engine!r}")
