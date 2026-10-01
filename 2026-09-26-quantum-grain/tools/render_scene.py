"""Studio product shot, rendered with a small numpy SDF raymarcher.

Subject: the four things the bench is made of. A vermilion sphere, a cream
keycap, an ink knob with an amber indicator, a chrome ball. Seamless
ultramarine sweep, one big softbox, one strip light.
"""
import sys, time
import numpy as np
from PIL import Image

F = np.float32


def nrm(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def lin(rgb):
    return (np.array(rgb, F) / 255.0) ** 2.2


# ---------------------------------------------------------------- scene
SPH_C = np.array([-1.2, 1.0, -1.05], F); SPH_R = 1.0
KEY_C = np.array([1.2, 0.38, -0.15], F); KEY_B = np.array([0.8, 0.38, 0.8], F); KEY_RR = 0.2; KEY_ANG = np.deg2rad(23)
KNOB_C = np.array([0.0, 0.3, 1.25], F); KNOB_R = 0.64; KNOB_H = 0.3
CHR_C = np.array([-1.05, 0.42, 1.75], F); CHR_R = 0.42
IND_ANG = np.deg2rad(58)  # knob indicator direction

MAT = {
    0: dict(alb=lin((30, 18, 165)), F0=0.05, rough=0.55, metal=0.0),   # floor
    1: dict(alb=lin((255, 46, 20)), F0=0.05, rough=0.14, metal=0.0),   # vermilion
    2: dict(alb=lin((236, 226, 201)), F0=0.04, rough=0.45, metal=0.0), # cream keycap
    3: dict(alb=lin((26, 20, 70)), F0=0.05, rough=0.35, metal=0.0),    # ink knob
    4: dict(alb=lin((205, 200, 255)), F0=0.95, rough=0.03, metal=1.0), # chrome
}
AMBER = lin((255, 176, 30))
CREAM = lin((236, 226, 201))


def smax(a, b, k):
    h = np.clip(0.5 - 0.5 * (b - a) / k, 0, 1)
    return a * h + b * (1 - h) + k * h * (1 - h) * 0  # plain mix, k only sets blend range


def scene(p, want_id=True):
    px, py, pz = p[:, 0], p[:, 1], p[:, 2]
    d_floor = py
    # sphere
    d_sph = np.linalg.norm(p - SPH_C, axis=-1) - SPH_R
    # keycap: rounded box, rotated about y, with a dished top
    q = p - KEY_C
    c, s = np.cos(KEY_ANG), np.sin(KEY_ANG)
    qx = c * q[:, 0] - s * q[:, 2]
    qz = s * q[:, 0] + c * q[:, 2]
    qy = q[:, 1]
    # slight taper toward top, like a real keycap
    taper = 1.0 - 0.10 * np.clip((qy + KEY_B[1]) / (2 * KEY_B[1]), 0, 1)
    ax = np.abs(qx) / taper - KEY_B[0] + KEY_RR
    ay = np.abs(qy) - KEY_B[1] + KEY_RR
    az = np.abs(qz) / taper - KEY_B[2] + KEY_RR
    outside = np.sqrt(np.maximum(ax, 0) ** 2 + np.maximum(ay, 0) ** 2 + np.maximum(az, 0) ** 2)
    inside = np.minimum(np.maximum(np.maximum(ax, ay), az), 0)
    d_box = (outside + inside - KEY_RR) * taper
    dish_c = np.array([0, KEY_B[1] + 3.2 - 0.09, 0], F)
    d_dish = 3.2 - np.sqrt(qx ** 2 + (qy - dish_c[1]) ** 2 + qz ** 2) * 1.0
    d_dish = np.sqrt(qx ** 2 + (qy - dish_c[1]) ** 2 + qz ** 2) - 3.2
    d_key = np.maximum(d_box, -d_dish)
    # knob: body + base ring
    k = p - KNOB_C
    r = np.hypot(k[:, 0], k[:, 2])
    def rcyl(r, y, rad, h, rr):
        dx = r - rad + rr
        dy = np.abs(y) - h + rr
        return np.minimum(np.maximum(dx, dy), 0) + np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) - rr
    d_k1 = rcyl(r, k[:, 1], KNOB_R, KNOB_H, 0.07)
    d_k2 = rcyl(r, k[:, 1] + 0.22, KNOB_R + 0.12, 0.09, 0.03)
    d_knob = np.minimum(d_k1, d_k2)
    # chrome ball
    d_chr = np.linalg.norm(p - CHR_C, axis=-1) - CHR_R

    ds = np.stack([d_floor, d_sph, d_key, d_knob, d_chr], 0)
    d = ds.min(0)
    if not want_id:
        return d
    return d, ds.argmin(0).astype(np.int8)


def march(ro, rd, steps=110, tmax=45.0):
    N = ro.shape[0]
    t = np.zeros(N, F)
    hit = np.zeros(N, bool)
    ids = np.zeros(N, np.int8)
    act = np.arange(N)
    for _ in range(steps):
        if act.size == 0:
            break
        p = ro[act] + rd[act] * t[act, None]
        d, mid = scene(p)
        t[act] += d * 0.92
        h = d < 0.0006 * (1 + t[act])
        far = t[act] > tmax
        hit[act[h]] = True
        ids[act[h]] = mid[h]
        act = act[~(h | far)]
    return t, hit, ids


def normal(p):
    e = 0.0006
    k0 = np.array([1, -1, -1], F); k1 = np.array([-1, -1, 1], F)
    k2 = np.array([-1, 1, -1], F); k3 = np.array([1, 1, 1], F)
    n = (k0 * scene(p + k0 * e, False)[:, None] + k1 * scene(p + k1 * e, False)[:, None]
         + k2 * scene(p + k2 * e, False)[:, None] + k3 * scene(p + k3 * e, False)[:, None])
    return nrm(n)


def soft_shadow(ro, rd, k=9.0, tmax=14.0, steps=56):
    N = ro.shape[0]
    res = np.ones(N, F)
    t = np.full(N, 0.03, F)
    act = np.arange(N)
    for _ in range(steps):
        if act.size == 0:
            break
        d = scene(ro[act] + rd[act] * t[act, None], False)
        res[act] = np.minimum(res[act], k * d / t[act])
        t[act] += np.clip(d, 0.02, 0.6)
        act = act[(res[act] > 0.002) & (t[act] < tmax)]
    res = np.clip(res, 0, 1)
    return res * res * (3 - 2 * res)


def ambient_occ(p, n):
    occ = np.zeros(p.shape[0], F)
    sca = 1.0
    for i in range(1, 6):
        h = 0.03 + 0.13 * i
        d = scene(p + n * h, False)
        occ += (h - d) * sca
        sca *= 0.78
    return np.clip(1.0 - 1.7 * occ, 0, 1)


LK = nrm(np.array([[-0.62, 0.78, 0.62]], F))[0]   # key softbox direction (upper left, front)
LR = nrm(np.array([[0.85, 0.30, -0.45]], F))[0]   # strip light, right/back
_t = nrm(np.cross(LK, np.array([0, 1, 0], F))[None])[0]
_b = np.cross(LK, _t)


def env(rd):
    y = rd[:, 1]
    top = lin((8, 5, 44)); mid = lin((34, 24, 170)); hor = lin((70, 56, 235))
    up = np.clip(y, 0, 1)[:, None]
    col = np.where(y[:, None] > 0, mid * (1 - up) + top * up, lin((16, 10, 90)) * 0.5)
    col = col + hor * np.exp(-np.abs(y)[:, None] * 6.0) * 0.55
    # softbox
    w = rd @ LK
    u = (rd @ _t) / np.maximum(w, 1e-3)
    v = (rd @ _b) / np.maximum(w, 1e-3)
    box = np.clip(1 - (np.maximum(np.abs(u) / 0.62, np.abs(v) / 0.42) - 1) * 9, 0, 1) * (w > 0.2)
    col = col + box[:, None] * np.array([7.0, 6.6, 6.0], F)
    # strip light
    w2 = rd @ LR
    t2 = nrm(np.cross(LR, np.array([0, 1, 0], F))[None])[0]
    u2 = (rd @ t2) / np.maximum(w2, 1e-3)
    v2 = (rd @ np.cross(LR, t2)) / np.maximum(w2, 1e-3)
    strip = np.clip(1 - (np.maximum(np.abs(u2) / 0.10, np.abs(v2) / 0.7) - 1) * 9, 0, 1) * (w2 > 0.2)
    col = col + strip[:, None] * np.array([2.2, 2.4, 3.2], F)
    return col.astype(F)


def tone(x):
    x = x * 0.9
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    y = np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)
    return y ** (1 / 2.2)


def material(ids, p):
    alb = np.zeros((p.shape[0], 3), F); F0 = np.zeros(p.shape[0], F)
    rough = np.zeros(p.shape[0], F); metal = np.zeros(p.shape[0], F)
    for i, m in MAT.items():
        s = ids == i
        alb[s] = m["alb"]; F0[s] = m["F0"]; rough[s] = m["rough"]; metal[s] = m["metal"]
    # knob indicator line + keycap legend dot
    s = ids == 3
    if s.any():
        k = p[s] - KNOB_C
        topface = k[:, 1] > KNOB_H - 0.06
        ang = np.arctan2(k[:, 2], k[:, 0])
        r = np.hypot(k[:, 0], k[:, 2])
        # indicator: thin amber bar from r=0.12..0.50 along IND_ANG
        dx = k[:, 0] * np.sin(IND_ANG) - k[:, 2] * np.cos(IND_ANG)   # lateral
        along = k[:, 0] * np.cos(IND_ANG) + k[:, 2] * np.sin(IND_ANG)
        bar = topface & (np.abs(dx) < 0.045) & (along > 0.18) & (along < 0.56)
        a2 = alb[s]; a2[bar] = AMBER; alb[s] = a2
        # lighter dish ring on the knob top
        ring = topface & (r < 0.62) & (r > 0.58)
        a2 = alb[s]; a2[ring] = a2[ring] * 0.5 + CREAM * 0.25; alb[s] = a2
    return alb, F0, rough, metal


def shade(ro, rd, depth=0):
    N = ro.shape[0]
    col = env(rd)
    # horizon haze for the backdrop
    t, hit, ids = march(ro, rd, steps=110 if depth == 0 else 70)
    if not hit.any():
        return col, hit, ids, t
    idx = np.where(hit)[0]
    p = ro[idx] + rd[idx] * t[idx, None]
    n = normal(p)
    v = -rd[idx]
    alb, F0, rough, metal = material(ids[idx], p)
    ndv = np.clip(np.sum(n * v, -1), 0, 1)
    fres = F0 + (1 - F0) * (1 - ndv) ** 5
    if depth == 0:
        sh = soft_shadow(p + n * 0.01, np.broadcast_to(LK, p.shape))
        ao = ambient_occ(p, n)
    else:
        sh = np.ones(len(idx), F); ao = np.ones(len(idx), F)
    ndl = np.clip(np.sum(n * LK, -1), 0, 1)
    ndr = np.clip(np.sum(n * LR, -1), 0, 1)
    isfloor = (ids[idx] == 0)
    pool = 0.12 + 0.88 * np.exp(-((p[:, 0] + 0.1) ** 2 + (p[:, 2] - 0.3) ** 2) / (2 * 3.4 ** 2))
    keyI = np.where(isfloor, pool, 1.0) * 3.3
    amb = np.where(isfloor, 0.10, 0.30)
    sky = env(n) * amb[:, None]
    diff = alb * (np.array([1.0, 0.94, 0.86], F) * (keyI * ndl * sh)[:, None]
                  + np.array([0.7, 0.8, 1.2], F) * (ndr * np.where(isfloor, 0.35, 1.0))[:, None]
                  + sky * ao[:, None])
    # specular lobes from softbox
    hv = nrm(LK[None] + v)
    ndh = np.clip(np.sum(n * hv, -1), 0, 1)
    shin = 2.0 / np.maximum(rough ** 2, 1e-3) - 2.0
    spec = ndh ** np.minimum(shin, 4000) * (shin + 8) / 25.0 * sh
    # reflection
    R = nrm(rd[idx] - 2 * np.sum(rd[idx] * n, -1, keepdims=True) * n)
    refl_w = fres * (1.0 - 0.5 * rough)
    refl_w = np.where(ids[idx] == 0, 0.30 * (1 - ndv * 0.0), refl_w)
    do_refl = (refl_w > 0.02) & (depth == 0)
    refl = env(R)
    if do_refl.any():
        ri = np.where(do_refl)[0]
        rcol, rhit, rids, rt = shade(p[ri] + n[ri] * 0.01, R[ri], depth=1)
        refl[ri] = rcol
        # fade floor reflections with distance so the sweep stays clean
        fade = np.where(ids[idx][ri] == 0, np.exp(-np.where(rhit, rt, 40.0) * 0.55), 1.0)[:, None]
        base_env = env(R[ri])
        refl[ri] = rcol * fade + base_env * (1 - fade)
    out = diff * (1 - metal[:, None]) * (1 - fres[:, None] * 0.6)
    out = out + (spec * ao)[:, None] * np.array([1.0, 0.97, 0.92], F) * (0.3 + 0.7 * metal)[:, None] * 0.55
    tint = np.where(metal[:, None] > 0.5, alb * 1.05, np.ones_like(alb))
    out = out + refl * refl_w[:, None] * tint
    # fog the far floor into the horizon glow
    fog = 1 - np.exp(-t[idx] * 0.032)
    out = np.where((ids[idx] == 0)[:, None], out * (1 - fog[:, None]) + env(rd[idx]) * fog[:, None], out)
    col[idx] = out
    return col, hit, ids, t


def render(W, H, chunk=120000):
    cam = np.array([0.55, 3.0, 12.4], F)
    tgt = np.array([-1.25, -0.72, 0.0], F)
    fwd = nrm((tgt - cam)[None])[0]
    right = nrm(np.cross(fwd, np.array([0, 1, 0], F))[None])[0]
    up = np.cross(right, fwd)
    fov = np.deg2rad(26.0)
    asp = W / H
    xs = (np.arange(W, dtype=F) + 0.5) / W * 2 - 1
    ys = 1 - (np.arange(H, dtype=F) + 0.5) / H * 2
    X, Y = np.meshgrid(xs, ys)
    d = (fwd[None] + right[None] * (X.reshape(-1, 1) * np.tan(fov / 2) * asp) + up[None] * (Y.reshape(-1, 1) * np.tan(fov / 2)))
    d = nrm(d.astype(F))
    ro_all = np.broadcast_to(cam, d.shape)
    out = np.zeros_like(d); mask = np.zeros(d.shape[0], bool)
    for s in range(0, d.shape[0], chunk):
        c, hit, ids, t = shade(np.ascontiguousarray(ro_all[s:s + chunk]), d[s:s + chunk])
        out[s:s + chunk] = c
        mask[s:s + chunk] = hit & (ids > 0)
    img = (tone(out) * 255 + 0.5).clip(0, 255).astype(np.uint8).reshape(H, W, 3)
    m = (mask.reshape(H, W) * 255).astype(np.uint8)
    return img, m


if __name__ == "__main__":
    W = int(sys.argv[1]); H = int(sys.argv[2]); name = sys.argv[3]
    t0 = time.time()
    img, m = render(W, H)
    Image.fromarray(img).save(name + ".png")
    Image.fromarray(m).save(name + "_mask.png")
    print("rendered", W, H, "in", round(time.time() - t0, 1), "s")
