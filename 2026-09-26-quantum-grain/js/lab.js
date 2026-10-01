/* The mechanism, small enough to watch.
   One 8x8 block of the sample photo goes through the same arithmetic as
   quantum_pipeline.py: amplitudes are the pixel values normalised to unit
   length, a shot lands on pixel i with probability amplitude_i squared, and
   decoding is norm * sqrt(count / shots). */
(() => {
  "use strict";

  const orig = document.getElementById("lab-orig");
  const dec = document.getElementById("lab-dec");
  const svg = document.getElementById("lab-bars");
  if (!orig || !dec || !svg) return;

  const sound = window.QGSound;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sEl = document.getElementById("lab-s"), dbEl = document.getElementById("lab-db");
  const NS = "http://www.w3.org/2000/svg";
  const N = 64;
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  let x = new Float64Array(N);       // pixel values, 0..1
  let p = new Float64Array(N);       // probability of each outcome
  let cum = new Float64Array(N);
  let norm = 1;
  const counts = new Uint32Array(N);
  let shots = 0;
  let outline = [], fill = [];
  let ready = false, busy = false;

  const W = 400, H = 190, padL = 6, padR = 6, padT = 8, padB = 24;
  const bw = (W - padL - padR) / N;

  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    svg.appendChild(n);
    return n;
  }

  function buildBars() {
    svg.innerHTML = "";
    el("line", { class: "lab-base", x1: padL, x2: W - padR, y1: H - padB, y2: H - padB });
    const maxP = Math.max(...p);
    outline = []; fill = [];
    for (let i = 0; i < N; i++) {
      const bx = padL + i * bw;
      const h = (p[i] / maxP) * (H - padT - padB) * 0.92;
      outline.push(el("rect", { class: "lab-out", x: bx + 0.8, y: H - padB - h, width: bw - 1.6, height: h }));
      fill.push(el("rect", { class: "lab-fill", x: bx + 0.8, y: H - padB, width: bw - 1.6, height: 0 }));
    }
    const t = el("text", { class: "lab-axis", x: padL, y: H - 6 });
    t.textContent = "pixel 1";
    const t2 = el("text", { class: "lab-axis", x: W - padR, y: H - 6, "text-anchor": "end" });
    t2.textContent = "pixel 64";
    svg.dataset.max = String(maxP);
  }

  function paint(canvas, vals) {
    const g = canvas.getContext("2d");
    const img = g.createImageData(8, 8);
    for (let i = 0; i < N; i++) {
      const v = vals ? Math.max(0, Math.min(1, vals[i])) : 0.04;
      // bone-tinted greys on the dark panel
      img.data[i * 4] = 18 + v * 221; img.data[i * 4 + 1] = 14 + v * 218; img.data[i * 4 + 2] = 34 + v * 190; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  function update() {
    const maxP = Number(svg.dataset.max) || 1;
    const hMax = (H - padT - padB) * 0.92;
    const decoded = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const f = shots ? counts[i] / shots : 0;
      const h = Math.min(hMax * 1.25, (f / maxP) * hMax);
      fill[i].setAttribute("y", H - padB - h);
      fill[i].setAttribute("height", h);
      decoded[i] = shots ? Math.min(1, norm * Math.sqrt(f)) : 0;
    }
    paint(dec, shots ? decoded : null);
    sEl.textContent = fmt(shots);
    if (shots) {
      let mse = 0;
      for (let i = 0; i < N; i++) mse += (x[i] - decoded[i]) ** 2;
      mse /= N;
      dbEl.innerHTML = mse > 1e-9 ? (10 * Math.log10(1 / mse)).toFixed(1).replace(".", '<i class="dp"></i>') : "99+";
    } else dbEl.textContent = "–";
  }

  function draw() {
    const r = Math.random();
    let lo = 0, hi = N - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] >= r) hi = m; else lo = m + 1; }
    counts[lo]++; shots++;
  }

  function add(n, { quiet } = {}) {
    if (!ready) return;
    if (reduce.matches || quiet) {
      for (let k = 0; k < n; k++) draw();
      update();
      return;
    }
    if (busy) return;
    busy = true;
    let left = n;
    const per = Math.max(1, Math.ceil(n / 10));
    (function step() {
      const k = Math.min(per, left);
      for (let j = 0; j < k; j++) draw();
      left -= k;
      update();
      if (sound) sound.count(0.9);
      if (left > 0) setTimeout(step, 38); else busy = false;
    })();
  }

  function reset() {
    counts.fill(0); shots = 0; busy = false;
    update();
  }

  document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => add(Number(b.dataset.add))));
  const rb = document.getElementById("lab-reset");
  if (rb) rb.addEventListener("click", reset);

  // take the most contrasty 8x8 block of the sample
  const im = new Image();
  im.onload = () => {
    const c = document.createElement("canvas");
    c.width = im.width; c.height = im.height;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const lum = (px, py) => { const o = (py * c.width + px) * 4; return (0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2]) / 255; };
    let best = -1, bx = 0, by = 0;
    for (let y0 = 0; y0 + 8 <= c.height; y0 += 8) {
      for (let x0 = 0; x0 + 8 <= c.width; x0 += 8) {
        let mean = 0, v = 0;
        for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) mean += lum(x0 + i, y0 + j);
        mean /= 64;
        for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) v += (lum(x0 + i, y0 + j) - mean) ** 2;
        if (mean > 0.18 && v > best) { best = v; bx = x0; by = y0; }
      }
    }
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) x[j * 8 + i] = lum(bx + i, by + j);
    let s2 = 0;
    for (let i = 0; i < N; i++) s2 += x[i] * x[i];
    norm = Math.sqrt(s2) || 1;
    let run = 0;
    for (let i = 0; i < N; i++) { p[i] = (x[i] * x[i]) / (norm * norm); run += p[i]; cum[i] = run; }
    cum[N - 1] = 1;
    paint(orig, x);
    buildBars();
    ready = true;
    add(30, { quiet: true });
  };
  im.src = "sample.png";
  paint(dec, null);
})();
