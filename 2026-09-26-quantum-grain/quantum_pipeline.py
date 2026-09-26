"""Quantum Grain — block-wise QPAM encode/measure/decode over image data.

Each block of pixels is flattened into a signal, the same shape of object
quantumaudio.QPAM already knows how to put onto a circuit (an image, read
this way, is just another 1-D signal). The circuit is measured and decoded
back. Whatever comes back is not a filter's guess at what grain should look
like — it is the real gap between the amplitudes you asked for and the ones
a finite number of measurements actually recovered, on whichever engine ran
the shots.

Two engines share one contract: run(circuit, shots) -> counts (dict).
  - `simulator`: qiskit-aer, local, unlimited shots, no queue.
  - `atlas`: Moth's Atlas API, a real QPU, shots that cost time and money.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np
import quantumaudio
from PIL import Image
from qiskit import QuantumCircuit

_QPAM = quantumaudio.load_scheme("qpam")

CountsFn = Callable[[QuantumCircuit, int], dict]


def qubits_for_block(block_size: int) -> int:
    """Index qubits QPAM will allocate for a block_size**2-sample block."""
    n_samples = block_size * block_size
    _, (num_index_qubits, num_value_qubits) = _QPAM.calculate(
        np.zeros(n_samples), verbose=False
    )
    return num_index_qubits + num_value_qubits


def _encode_block(flat: np.ndarray) -> QuantumCircuit:
    circuit = _QPAM.encode(flat, measure=True, verbose=0)
    return circuit


def _decode_block(counts: dict, metadata: dict, shots: int, n_samples: int) -> np.ndarray:
    # QPAM's amplitude convention assumes samples in [-1, 1]; blocks are
    # pre-scaled to that range before encoding (see process_channel), which
    # spends the full amplitude range instead of only its upper half and
    # roughly halves the shot-noise floor for the same shot budget. Undo
    # that scaling here, back to the [0, 1] pixel range.
    data = _QPAM.decode_counts(counts, metadata=metadata, shots=shots)
    data = (data + 1.0) / 2.0
    data = np.clip(data, 0.0, 1.0)
    if len(data) < n_samples:
        data = np.pad(data, (0, n_samples - len(data)))
    return data[:n_samples]


def run_simulator(circuit: QuantumCircuit, shots: int) -> dict:
    from qiskit_aer import AerSimulator

    backend = AerSimulator()
    transpiled = backend.run(circuit, shots=shots, optimization_level=1)
    return transpiled.result().get_counts()


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

            circuit = _encode_block(2.0 * flat - 1.0)
            metadata = dict(circuit.metadata)
            counts = run_fn(circuit, shots)
            decoded = _decode_block(counts, metadata, shots, flat.size)

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
