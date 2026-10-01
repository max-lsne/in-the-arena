/* Hero: a studio photograph developed from real measurements.
   Six frames of the same photo, each reconstructed by this project's own
   simulator at a different shot count, are stacked in a texture array. A
   shader picks a frame for every pixel from an exposure value: low at rest,
   high under the lens (your cursor), higher while you hold. The wordmark is
   drawn from a canvas, sits behind the objects via a matte, and its edges
   erode with the same exposure. */
(() => {
  "use strict";

  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("hero-gl");
  if (!hero || !canvas) return;
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) { root.classList.add("no-gl"); return; }

  const LEVELS = [10, 50, 200, 1000, 4000, 16000];
  const LABELS = [10, 50, 200, 1000, 4000, 16000];
  const shotsEl = document.getElementById("lens-shots");

  const VERT = `#version 300 es
  void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  precision highp sampler2DArray;
  uniform vec2 uRes;
  uniform float uDpr, uTime, uDev, uRest;
  uniform vec2 uLens, uPar;
  uniform float uLensR, uLensAmt, uZoom, uAnchorX, uAnchorY;
  uniform sampler2DArray uFrames;
  uniform sampler2D uClean, uMask, uType;
  out vec4 o;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 coverUV(vec2 s) {
    float sa = uRes.x / uRes.y;
    float ia = 4.0 / 3.0;
    vec2 vis = vec2(1.0, ia / sa) / uZoom;
    float ay = vis.y > 1.0 ? 1.0 : uAnchorY;
    vec2 off = vec2((1.0 - vis.x) * uAnchorX, (1.0 - vis.y) * ay);
    return off + s * vis;
  }

  void main() {
    vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
    vec2 s = px / uRes;
    vec2 iuv = coverUV(s + uPar * vec2(-0.007, -0.005));

    // exposure: rest level, plus the lens
    float d = length(px - uLens) / uLensR;
    float lens = exp(-d * d * 1.7) * uLensAmt;
    float base = uRest * smoothstep(0.0, 1.0, uDev);
    float e = clamp(base + lens * (1.0 - base), 0.0, 1.0);

    // pick a frame per pixel; the dither is what makes the edge of the lens grainy
    float f = e * 6.0;
    float h = hash(floor(px) + floor(uTime * 2.0) * 7.31);
    float idx = clamp(floor(f + h), 0.0, 6.0);
    vec3 clean = texture(uClean, iuv).rgb;
    vec3 img = idx >= 6.0 ? clean : texture(uFrames, vec3(iuv, idx)).rgb;
    float inside = smoothstep(0.0, 0.05, iuv.y) * smoothstep(0.0, 0.05, 1.0 - iuv.y)
                 * smoothstep(0.0, 0.05, iuv.x) * smoothstep(0.0, 0.05, 1.0 - iuv.x);
    img = mix(clean, img, inside);
    float m = texture(uMask, iuv).r;

    // wordmark: behind the objects, eroding at low exposure
    vec2 tuv = s + uPar * vec2(0.005, 0.004);
    float soft = texture(uType, tuv).a;
    float amp = mix(0.1, 0.02, smoothstep(0.15, 0.95, e));
    float tn = hash(px * 0.93 + 17.0);
    float tm = smoothstep(0.44, 0.56, soft + (tn - 0.5) * amp);
    vec3 tc = vec3(0.937, 0.910, 0.847);
    vec3 col = mix(img, tc, tm * (1.0 - m));

    // the lens: a thin ring and two ticks
    float R = uLensR * 0.78;
    float rr = abs(length(px - uLens) - R);
    float ring = (1.0 - smoothstep(0.0, 2.8 * uDpr, rr)) * uLensAmt;
    vec2 q = px - uLens;
    float tick = step(abs(q.x), 1.4 * uDpr) * step(R - 11.0 * uDpr, abs(q.y)) * step(abs(q.y), R + 11.0 * uDpr)
               + step(abs(q.y), 1.4 * uDpr) * step(R - 11.0 * uDpr, abs(q.x)) * step(abs(q.x), R + 11.0 * uDpr);
    col = mix(col, vec3(0.94, 0.91, 0.84), clamp(ring + tick * uLensAmt * 0.9, 0.0, 1.0));

    // quiet vignette, then dither against banding in the blue
    float v = smoothstep(1.35, 0.3, length((s - 0.5) * vec2(uRes.x / uRes.y, 1.0)));
    col *= mix(0.74, 1.0, v);
    col += (hash(px + 3.7) - 0.5) / 255.0;
    o = vec4(col, 1.0);
  }`;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.warn("hero shader failed:", err);
    root.classList.add("no-gl");
    return;
  }
  gl.useProgram(prog);
  const U = {};
  ["uRes", "uDpr", "uTime", "uDev", "uRest", "uLens", "uPar", "uLensR", "uLensAmt", "uZoom", "uAnchorX", "uAnchorY",
    "uFrames", "uClean", "uMask", "uType"].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const loadImg = (src) => new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });

  function tex2D(unit, img) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    return t;
  }

  // wordmark -> 2d canvas -> texture
  const typeCanvas = document.createElement("canvas");
  const tctx = typeCanvas.getContext("2d");
  let typeTex = null;

  function drawType(w, h, dpr) {
    typeCanvas.width = w; typeCanvas.height = h;
    tctx.clearRect(0, 0, w, h);
    const cssW = w / dpr;
    const mx = Math.min(52, Math.max(18, cssW * 0.036)) * dpr;
    const mb = Math.max(18, cssW * 0.02) * dpr;
    const lines = ["Quantum", "Grain"];
    tctx.textBaseline = "alphabetic";
    if ("fontStretch" in tctx) tctx.fontStretch = "extra-expanded";
    tctx.font = '900 100px "Anybody", "Arial Black", sans-serif';
    const w100 = tctx.measureText(lines[0]).width || 1;
    const portraitView = (4 / 3) / (w / h) > 1;
    let fs = 100 * (w - mx * 2) / w100 * (portraitView ? 0.97 : 1.0);
    const lh = 0.86;
    const maxBlock = h * 0.46;
    if (fs * (0.72 + lh) > maxBlock) fs = maxBlock / (0.72 + lh);
    tctx.font = `900 ${fs}px "Anybody", "Arial Black", sans-serif`;
    tctx.fillStyle = "#fff";
    tctx.shadowColor = "#fff";
    tctx.shadowBlur = 2.6 * dpr;
    tctx.shadowOffsetX = w * 2;
    const y2 = h - mb;
    const y1 = y2 - fs * lh;
    tctx.fillText(lines[0], mx - w * 2, y1);
    tctx.fillText(lines[1], mx - w * 2, y2);
    const top = (y1 - fs * 0.74) / dpr;
    if (portraitView) hero.style.removeProperty("--copy-top");
    else hero.style.setProperty("--copy-top", Math.max(60, top - 258).toFixed(0) + "px");
    tctx.shadowColor = "transparent";
    gl.activeTexture(gl.TEXTURE3);
    if (!typeTex) typeTex = tex2D(3, null);
    gl.bindTexture(gl.TEXTURE_2D, typeTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, typeCanvas);
  }

  // state
  let dpr = 1, W = 0, H = 0;
  let dev = reduce.matches ? 1 : 0;
  const pointer = { x: 0, y: 0, inside: false, interacted: false, lastMove: 0 };
  const lens = { x: 0, y: 0, amt: 0, r: 0, hold: 0 };
  const par = { x: 0, y: 0 };
  let holding = false;
  let visible = true;
  let ready = false;
  let t0 = performance.now();

  function resize() {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(r.width * dpr));
    const h = Math.max(2, Math.round(r.height * dpr));
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    if (ready) drawType(W, H, dpr);
  }

  function shotsAt(e) {
    const f = Math.min(5.999, Math.max(0, e * 6));
    const i = Math.floor(f), k = f - i;
    if (e >= 0.995) return null;
    return Math.round(Math.exp(Math.log(LABELS[i]) * (1 - k) + Math.log(LABELS[Math.min(5, i + 1)]) * k));
  }
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  let lastLabel = "";
  function updateLabel(e) {
    if (!shotsEl) return;
    const n = shotsAt(e);
    const txt = n === null ? "16\u202f000+" : fmt(n);
    if (txt !== lastLabel) { shotsEl.textContent = txt; lastLabel = txt; }
  }

  let lastFrame = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!ready || !visible || document.hidden) return;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;

    if (!reduce.matches) dev = Math.min(1, dev + dt / 2.6);
    const idle = !pointer.interacted || (now - pointer.lastMove > 4500 && !pointer.inside);

    let tx, ty, tAmt;
    if (pointer.inside || (pointer.interacted && !idle)) {
      tx = pointer.x * dpr; ty = pointer.y * dpr; tAmt = pointer.inside ? 1 : 0;
    } else if (!reduce.matches) {
      const portrait = (4 / 3) / (W / H) > 1, imgH = W * 0.75 * 1.32;
      const cy = portrait ? H - imgH * 0.62 : H * 0.4, ry = portrait ? imgH * 0.2 : H * 0.18;
      tx = W * (portrait ? 0.4 + 0.1 * Math.sin(t * 0.33) : 0.64 + 0.22 * Math.sin(t * 0.33)); ty = cy + ry * Math.sin(t * 0.51 + 1.0); tAmt = dev > 0.6 ? 0.85 : 0;
    } else {
      tx = W * 0.5; ty = H * 0.4; tAmt = 0;
    }
    const k = reduce.matches ? 1 : 1 - Math.pow(0.0009, dt);
    lens.x += (tx - lens.x) * k; lens.y += (ty - lens.y) * k;
    lens.amt += (tAmt - lens.amt) * (1 - Math.pow(0.002, dt));
    lens.hold += ((holding ? 1 : 0) - lens.hold) * (1 - Math.pow(0.0004, dt));
    const baseR = Math.min(W, H) * 0.17;
    lens.r = baseR * (1 + lens.hold * 0.9);
    const amt = Math.min(1, lens.amt * (0.8 + lens.hold * 0.4) + lens.hold * 0.5 * lens.amt);

    const px = pointer.inside ? (pointer.x / (W / dpr) - 0.5) * 2 : Math.sin(t * 0.2) * 0.4;
    const py = pointer.inside ? (pointer.y / (H / dpr) - 0.5) * 2 : Math.cos(t * 0.17) * 0.3;
    par.x += (px - par.x) * (1 - Math.pow(0.01, dt)); par.y += (py - par.y) * (1 - Math.pow(0.01, dt));

    gl.useProgram(prog);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uDev, dev);
    gl.uniform1f(U.uRest, 0.5);
    gl.uniform2f(U.uLens, lens.x, lens.y);
    gl.uniform1f(U.uLensR, lens.r);
    gl.uniform1f(U.uLensAmt, amt);
    gl.uniform2f(U.uPar, par.x, par.y);
    const portrait = (4 / 3) / (W / H) > 1;
    gl.uniform1f(U.uZoom, portrait ? 1.32 : 0.92);
    gl.uniform1f(U.uAnchorX, portrait ? 0.86 : 1.0);
    gl.uniform1f(U.uAnchorY, portrait ? 0.3 : 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // exposure at the lens centre, for the label
    const d0 = 0;
    const base = 0.5 * (dev * dev * (3 - 2 * dev));
    updateLabel(Math.min(1, base + amt * (1 - base) * 1) + d0);
  }

  // input
  function local(e) {
    const r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  hero.addEventListener("pointermove", (e) => {
    const p = local(e);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = true; pointer.interacted = true; pointer.lastMove = performance.now();
  });
  hero.addEventListener("pointerleave", () => { pointer.inside = false; holding = false; });
  hero.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button, input")) return;
    const p = local(e);
    pointer.x = p.x; pointer.y = p.y; pointer.inside = true; pointer.interacted = true; pointer.lastMove = performance.now();
    holding = true;
    if (window.QGSound) window.QGSound.shutterDown();
  });
  const release = () => {
    if (holding && window.QGSound) window.QGSound.shutterUp();
    holding = false;
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(hero);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
  window.addEventListener("resize", resize);

  // load everything, then go
  const frameSrc = LEVELS.map((s) => `assets/frame-${String(s).padStart(5, "0")}.webp`);
  Promise.all([
    Promise.all(frameSrc.map(loadImg)),
    loadImg("assets/scene.webp"),
    loadImg("assets/scene-mask.png"),
    (document.fonts && document.fonts.load ? document.fonts.load('900 120px "Anybody"') : Promise.resolve()).catch(() => {}),
  ]).then(([frames, clean, mask]) => {
    const fw = frames[0].naturalWidth, fh = frames[0].naturalHeight;
    gl.activeTexture(gl.TEXTURE0);
    const arr = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, arr);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, fw, fh, frames.length);
    frames.forEach((im, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, fw, fh, 1, gl.RGBA, gl.UNSIGNED_BYTE, im));
    tex2D(1, clean);
    tex2D(2, mask);
    gl.uniform1i(U.uFrames, 0);
    gl.uniform1i(U.uClean, 1);
    gl.uniform1i(U.uMask, 2);
    gl.uniform1i(U.uType, 3);
    ready = true;
    resize();
    drawType(W, H, dpr);
    t0 = performance.now();
    root.classList.add("gl-ready");
    requestAnimationFrame(frame);
  }).catch((err) => {
    console.warn("hero assets failed:", err);
    root.classList.add("no-gl");
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { if (ready) drawType(W, H, dpr); });
  }

  window.QGHero = { get ready() { return ready; }, setDev(v) { dev = v; } };
})();
