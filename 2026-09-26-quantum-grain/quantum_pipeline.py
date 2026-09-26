"""Quantum Grain: block-wise QPAM-equivalent encode/measure/decode over image data.

Pure NumPy. No Qiskit, no scipy, no Aer.

Each block of pixels is flattened into a signal and its values become the
amplitudes of a quantum state, normalised so their squares sum to one. That's
the same QPAM (Quantum Probability Amplitude Modulation) scheme Moth's own
`quantum-audio` package uses for sound, applied here to pixels. An amplitude
cannot be read directly, only measured. Sampling `shots` times from
|amplitude|^2 and reconstructing from the resulting histogram is the only
way back. That reconstruction is exact quantum mechanics for a circuit that
does nothing but prepare a state and then measure every qubit: there is no
later gate for a simulator to add interference from, so its output
distribution *is* a multinomial draw from |amplitude|^2, not an
approximation of one. This module computes that draw directly instead of
building a circuit and simulating it, which produces numerically identical
statistics (verified against qiskit-aer) while cutting a ~450MB dependency
stack down to two ordinary libraries. That's the difference between a bench
that only runs on a laptop and one that deploys anywhere.

Two engines share one contract: run(amplitudes, shots) -> counts.
  - `simulator`: local, in-process, unlimited shots, no queue.
  - `atlas`: Moth's Atlas API, a real QPU, shots that cost time and money.
    Its counts carry a real device's decoherence on top of this same
    shot noise, which no local engine can add honestly.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Optional, Union

import numpy as np
from PIL import Image

Counts = Union[np.ndarray, list, dict]
CountsFn = Callable[[np.ndarray, int], Counts]


def qubits_for_block(block_size: int) -> int:
    """Index qubits needed for a block_size**2-sample block (must be a power of two)."""
    n_samples = block_size * block_size
    q = int(round(np.log2(n_samples)))
    assert 2 ** q == n_samples, "block_size**2 must be a power of two"
    return q


def _encode(flat_pm1: np.ndarray) -> tuple[np.ndarray, float]:
    """flat_pm1: samples in [-1, 1]. Returns (amplitudes, norm), QPAM's convert step."""
    shifted = (flat_pm1 + 1.0) / 2.0
    norm = float(np.linalg.norm(shifted))
    if not norm:
        norm = 1.0
    amplitudes = shifted / norm
    return amplitudes, norm


def run_simulator(amplitudes: np.ndarray, shots: int, rng: Optional[np.random.Generator] = None) -> np.ndarray:
    """The Born rule, sampled directly: counts[i] ~ Multinomial(shots, |amplitudes|^2)."""
    probs = amplitudes.astype(np.float64) ** 2
    total = probs.sum()
    probs = probs / total if total > 0 else np.full_like(probs, 1.0 / len(probs))
    rng = rng or np.random.default_rng()
    return rng.multinomial(shots, probs)


def _counts_to_array(counts: Counts, n: int) -> np.ndarray:
    if isinstance(counts, dict):
        arr = np.zeros(n)
        for k, v in counts.items():
            arr[int(k)] = v
        return arr
    arr = np.asarray(counts, dtype=np.float64)
    if arr.shape[0] < n:
        arr = np.pad(arr, (0, n - arr.shape[0]))
    return arr[:n]


def _decode(counts: Counts, norm: float, shots: int, n_samples: int) -> np.ndarray:
    """QPAM's restore step: 2*norm*sqrt(p/shots) - 1, then back from [-1,1] to [0,1]."""
    arr = _counts_to_array(counts, n_samples)
    p = arr / shots
    restored_pm1 = 2.0 * norm * np.sqrt(np.clip(p, 0.0, None)) - 1.0
    data = (restored_pm1 + 1.0) / 2.0
    return np.clip(data, 0.0, 1.0)


@dataclass
class BlockReport:
    row: int
    col: int
    qubits: int
    mse: float


@dataclass
class ChannelReport:
    blocks: int = 0
    qubits_per_block: int = 0
    mse_sum: float = 0.0
    worst: Optional[BlockReport] = None
    wall_time_s: float = 0.0


def _psnr(mse: float, peak: float = 1.0) -> float:
    if mse <= 1e-12:
        return 99.0
    return 10.0 * np.log10((peak * peak) / mse)


def _pad_to_grid(channel: np.ndarray, block: int) -> tuple[np.ndarray, int, int]:
    h, w = channel.shape
    ph = (-h) % block
    pw = (-w) % block
    if ph or pw:
        channel = np.pad(channel, ((0, ph), (0, pw)), mode="edge")
    return channel, h, w


def process_channel(
    channel: np.ndarray,
    block: int,
    shots: int,
    run_fn: CountsFn,
    max_blocks: Optional[int] = None,
) -> tuple[np.ndarray, ChannelReport]:
    """channel: 2-D float array in [0, 1]. Returns (reconstructed, report)."""
    padded, orig_h, orig_w = _pad_to_grid(channel, block)
    out = padded.copy()
    n_rows, n_cols = padded.shape[0] // block, padded.shape[1] // block
    n_samples = block * block
    report = ChannelReport(qubits_per_block=qubits_for_block(block))

    t0 = time.time()
    done = 0
    for r in range(n_rows):
        for c in range(n_cols):
            if max_blocks is not None and done >= max_blocks:
                break
            y0, x0 = r * block, c * block
            patch = padded[y0 : y0 + block, x0 : x0 + block]
            flat = patch.reshape(-1)

            amplitudes, norm = _encode(2.0 * flat - 1.0)
            counts = run_fn(amplitudes, shots)
            decoded = _decode(counts, norm, shots, n_samples)

            out[y0 : y0 + block, x0 : x0 + block] = decoded.reshape(block, block)

            mse = float(np.mean((flat - decoded) ** 2))
            report.blocks += 1
            report.mse_sum += mse
            if report.worst is None or mse > report.worst.mse:
                report.worst = BlockReport(r, c, report.qubits_per_block, mse)
            done += 1
        if max_blocks is not None and done >= max_blocks:
            break
    report.wall_time_s = time.time() - t0
    return out[:orig_h, :orig_w], report


@dataclass
class ProcessResult:
    image: Image.Image
    engine: str
    block: int
    shots: int
    qubits_per_block: int
    blocks_processed: int
    blocks_total: int
    mse: float
    psnr_db: float
    worst_psnr_db: float
    wall_time_s: float
    patch_box: Optional[tuple[int, int, int, int]] = None


def process_image(
    img: Image.Image,
    block: int,
    shots: int,
    run_fn: CountsFn,
    engine_name: str,
    max_blocks_per_channel: Optional[int] = None,
) -> ProcessResult:
    img = img.convert("RGB")
    arr = np.asarray(img).astype(np.float64) / 255.0  # H, W, 3

    out = np.empty_like(arr)
    total_mse = 0.0
    worst_psnr = 99.0
    total_blocks = 0
    processed_blocks = 0
    wall = 0.0
    qpb = qubits_for_block(block)

    for ch in range(3):
        recon, rep = process_channel(
            arr[:, :, ch], block, shots, run_fn, max_blocks=max_blocks_per_channel
        )
        out[:, :, ch] = recon
        total_mse += rep.mse_sum
        processed_blocks += rep.blocks
        wall += rep.wall_time_s
        h, w = arr[:, :, ch].shape
        total_blocks += ((h + block - 1) // block) * ((w + block - 1) // block)
        if rep.worst is not None:
            worst_psnr = min(worst_psnr, _psnr(rep.worst.mse))

    mean_mse = total_mse / max(processed_blocks, 1)
    out_img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))

    patch_box = None
    if max_blocks_per_channel is not None and processed_blocks < total_blocks:
        h, w, _ = arr.shape
        n_cols_full = (w + block - 1) // block
        n_done = min(max_blocks_per_channel, n_cols_full * ((h + block - 1) // block))
        rows_done = -(-n_done // n_cols_full)
        patch_h = min(h, rows_done * block)
        patch_box = (0, 0, w, patch_h)

    return ProcessResult(
        image=out_img,
        engine=engine_name,
        block=block,
        shots=shots,
        qubits_per_block=qpb,
        blocks_processed=processed_blocks,
        blocks_total=total_blocks,
        mse=mean_mse,
        psnr_db=_psnr(mean_mse),
        worst_psnr_db=worst_psnr,
        wall_time_s=wall,
        patch_box=patch_box,
    )
