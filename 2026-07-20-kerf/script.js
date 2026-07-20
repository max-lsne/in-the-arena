/* Kerf — a cut list laid against a fixed board, with the blade's own width
   counted into every cut. Single file, no build step, no dependencies. */

(function () {
  "use strict";

  // The board and the blade. Millimetres throughout — a woodworker's units.
  const STOCK_MIN = 300;
  const STOCK_MAX = 4800;
  const STOCK_STEP = 100;
  const KERF_MIN = 0; // the kerf you wish you had
  const KERF_MAX = 8;
  const KERF_STEP = 1;
  const LEN_MIN = 30;
  const LEN_STEP = 30;
  const MAX_PIECES = 16; // the bench only holds so many at once

  // Standing pieces — named lengths to seed the run and to draw from when you
  // add a cut. Ordinary shop stuff, in the sizes it tends to come in.
  const STANDING = [
    { name: "Shelf", len: 600 },
    { name: "Upright", len: 900 },
    { name: "Cleat", len: 180 },
    { name: "Rail", len: 450 },
    { name: "Stile", len: 750 },
    { name: "Back slat", len: 300 },
    { name: "Drawer side", len: 420 },
    { name: "Divider", len: 260 },
    { name: "Plinth", len: 540 },
    { name: "Batten", len: 120 },
    { name: "Top", len: 800 },
    { name: "Apron", len: 480 },
  ];

  const SEED = [
    { name: "Shelf", len: 600 },
    { name: "Shelf", len: 600 },
    { name: "Upright", len: 900 },
    { name: "Cleat", len: 180 },
  ];

  let pieces = [];
  let seq = 1;
  let stock = 2400;
  let kerf = 3;
  let stockName = "Shelf run";
  let drawCursor = 0;
  let justAdded = new Set(); // ids that just came off the saw — for the animation

  function makePiece(spec) {
    return {
      id: "c" + seq++,
      name: spec.name,
      len: clampLen(spec.len),
    };
  }

  function clampLen(v) {
    v = Math.round((v | 0) / 1) | 0;
    return Math.max(LEN_MIN, Math.min(STOCK_MAX, v));
  }

  function seedBench() {
    pieces = SEED.map(makePiece);
  }

  // ---- the honest sum: pieces plus one kerf per cut ----
  function tally() {
    const piecesTotal = pieces.reduce((s, p) => s + p.len, 0);
    const cuts = pieces.length;
    const kerfTotal = cuts * kerf;
    const used = piecesTotal + kerfTotal;
    return {
      piecesTotal: piecesTotal,
      cuts: cuts,
      kerfTotal: kerfTotal,
      used: used,
      offcut: stock - used,
      over: used > stock,
    };
  }

  // ---- DOM refs ----
  const cutListEl = document.getElementById("cut-list");
  const plankEl = document.getElementById("plank");
  const plankEndEl = document.getElementById("plank-end");
  const readingEl = document.getElementById("bench-reading");
  const readingUsed = document.getElementById("reading-used");
  const readingCuts = document.getElementById("reading-cuts");
  const readingOffcut = document.getElementById("reading-offcut");
  const overEl = document.getElementById("bench-over");
  const addBtn = document.getElementById("add-cut");
  const stockDown = document.getElementById("stock-down");
  const stockUp = document.getElementById("stock-up");
  const stockVal = document.getElementById("stock-val");
  const kerfDown = document.getElementById("kerf-down");
  const kerfUp = document.getElementById("kerf-up");
  const kerfVal = document.getElementById("kerf-val");
  const nameInput = document.getElementById("stock-name");

  function mm(n) {
    return n.toLocaleString("en-US") + " mm";
  }

  // ---- rendering ----
  function render() {
    const t = tally();

    // the reading
    readingUsed.textContent = t.used.toLocaleString("en-US");
    readingEl.querySelector(".reading-unit").textContent = "of " + mm(stock) + " spent";
    readingCuts.textContent =
      t.cuts + (t.cuts === 1 ? " cut" : " cuts") +
      (t.cuts ? " eat " + mm(t.kerfTotal) : "");
    if (t.over) {
      readingOffcut.textContent = "over by " + mm(-t.offcut);
    } else {
      readingOffcut.textContent = mm(t.offcut) + " offcut";
    }
    readingEl.classList.toggle("is-over", t.over);
    readingEl.classList.toggle("is-tight", !t.over && t.offcut < stock * 0.05);

    // the plank, drawn to scale
    renderPlank(t);

    // the cut list
    cutListEl.innerHTML = "";
    pieces.forEach((p) => cutListEl.appendChild(renderCut(p)));

    // dials + controls
    stockVal.textContent = mm(stock);
    kerfVal.textContent = mm(kerf);
    stockDown.disabled = stock <= STOCK_MIN;
    stockUp.disabled = stock >= STOCK_MAX;
    kerfDown.disabled = kerf <= KERF_MIN;
    kerfUp.disabled = kerf >= KERF_MAX;
    addBtn.disabled = pieces.length >= MAX_PIECES;

    overEl.hidden = !t.over;

    updateSawdust(t);
    justAdded = new Set();
  }

  function renderPlank(t) {
    plankEl.innerHTML = "";
    const total = Math.max(stock, t.used) || 1;

    pieces.forEach((p) => {
      const seg = document.createElement("div");
      seg.className = "seg seg-piece" + (justAdded.has(p.id) ? " just-added" : "");
      seg.style.flexGrow = String(p.len);
      seg.style.flexBasis = "0";
      seg.title = p.name + " — " + mm(p.len);
      const name = document.createElement("span");
      name.className = "seg-name";
      name.textContent = p.name;
      const len = document.createElement("span");
      len.className = "seg-len";
      len.textContent = p.len;
      seg.appendChild(name);
      seg.appendChild(len);
      plankEl.appendChild(seg);

      if (kerf > 0) {
        const k = document.createElement("div");
        k.className = "seg seg-kerf";
        k.title = "kerf — " + mm(kerf);
        plankEl.appendChild(k);
      }
    });

    if (t.offcut > 0) {
      const off = document.createElement("div");
      off.className = "seg seg-offcut";
      off.style.flexGrow = String(t.offcut);
      off.style.flexBasis = "0";
      off.title = "offcut — " + mm(t.offcut);
      if (t.offcut > stock * 0.08) off.textContent = "offcut";
      plankEl.appendChild(off);
    } else if (t.over) {
      const over = document.createElement("div");
      over.className = "seg seg-over";
      over.style.flexGrow = String(-t.offcut);
      over.style.flexBasis = "0";
      over.title = "over the board — " + mm(-t.offcut);
      if (-t.offcut > stock * 0.06) over.textContent = "over";
      plankEl.appendChild(over);

      // mark where the board actually ends
      const mark = document.createElement("div");
      mark.className = "plank-end-mark";
      mark.style.left = (stock / total) * 100 + "%";
      plankEl.appendChild(mark);
    }

    plankEndEl.textContent = mm(stock);
  }

  function renderCut(p) {
    const el = document.createElement("div");
    el.className = "cut";
    el.dataset.id = p.id;

    const sw = document.createElement("span");
    sw.className = "cut-swatch";
    el.appendChild(sw);

    const name = document.createElement("input");
    name.className = "cut-name";
    name.value = p.name;
    name.maxLength = 40;
    name.setAttribute("aria-label", "Piece name");
    name.addEventListener("change", () => {
      p.name = name.value.trim() || "Piece";
      name.value = p.name;
      render();
    });
    el.appendChild(name);

    const lenSet = document.createElement("span");
    lenSet.className = "cut-len-set";
    const down = document.createElement("button");
    down.type = "button";
    down.className = "len-btn";
    down.textContent = "−";
    down.disabled = p.len <= LEN_MIN;
    down.setAttribute("aria-label", "Shorten " + p.name);
    down.addEventListener("click", () => setLen(p, p.len - LEN_STEP));
    const len = document.createElement("span");
    len.className = "cut-len";
    len.textContent = mm(p.len);
    const up = document.createElement("button");
    up.type = "button";
    up.className = "len-btn";
    up.textContent = "+";
    up.disabled = p.len >= STOCK_MAX;
    up.setAttribute("aria-label", "Lengthen " + p.name);
    up.addEventListener("click", () => setLen(p, p.len + LEN_STEP));
    lenSet.appendChild(down);
    lenSet.appendChild(len);
    lenSet.appendChild(up);
    el.appendChild(lenSet);

    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "cut-remove";
    rm.textContent = "×";
    rm.setAttribute("aria-label", "Take " + p.name + " off the list");
    rm.addEventListener("click", () => {
      pieces = pieces.filter((x) => x.id !== p.id);
      render();
    });
    el.appendChild(rm);
    return el;
  }

  // ---- actions ----
  function setLen(p, next) {
    p.len = clampLen(next);
    render();
  }

  function addCut() {
    if (pieces.length >= MAX_PIECES) return;
    const spec = STANDING[drawCursor % STANDING.length];
    drawCursor++;
    const p = makePiece({ name: spec.name, len: spec.len });
    pieces.push(p);
    justAdded.add(p.id);
    render();
  }

  function setStock(next) {
    stock = Math.max(STOCK_MIN, Math.min(STOCK_MAX, Math.round(next / STOCK_STEP) * STOCK_STEP));
    render();
  }

  function setKerf(next) {
    kerf = Math.max(KERF_MIN, Math.min(KERF_MAX, next));
    render();
  }

  // ---- the sawdust: raised by every cut, warm tan, gone grey-red on an overrun ----
  const canvas = document.getElementById("sawdust");
  const caption = document.getElementById("sawdust-caption");
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let clarity = 0.95; // 1 clear .. 0 thick with dust
  let clarityShown = 0.95;
  let overNow = false;
  let raf = null;

  function computeClarity(t) {
    if (!pieces.length) return 0.95;
    const wasteFrac = t.kerfTotal / stock; // board eaten by kerf alone
    const fillFrac = t.used / stock;
    let c = 1 - Math.min(0.62, wasteFrac * 6);
    c -= Math.max(0, fillFrac - 0.75) * 1.1;
    if (t.over) c = Math.min(c, 0.12);
    return Math.max(0, Math.min(1, c));
  }

  function captionFor(t) {
    if (!pieces.length) return "The bench is clear — no cuts made, no sawdust.";
    if (t.over) return "Over the end of the board — the last piece won't come off.";
    if (clarity >= 0.7) return "A clean run — the kerf is paid for and the offcut holds.";
    if (clarity >= 0.45) return "Sawdust is gathering — the cuts are adding up.";
    return "Sawdust is piling up — little board left under the blade.";
  }

  // deterministic per-mote scatter (no Math.random — keeps frames reproducible)
  function hash(i, salt) {
    const x = Math.sin(i * 129.3 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function mixc(a, b, tt) {
    return Math.round(a + (b - a) * tt);
  }

  // warm sawdust tan (v=1) toward a cold grey haze (v=0); reddened on overrun
  function dustRGB(v, over) {
    const r = mixc(150, 202, v);
    const g = mixc(146, 168, v);
    const b = mixc(138, 118, v);
    if (over) return [Math.min(215, r + 45), Math.max(70, g - 40), Math.max(50, b - 55)];
    return [r, g, b];
  }

  function sizeCanvas() {
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 66;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const MOTES = 50;

  function drawDust(time, v) {
    if (!ctx) return;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 66;
    ctx.clearRect(0, 0, w, h);

    const tt = reduceMotion ? 0 : time / 1000;
    const heavy = 1 - v;
    const count = Math.round(4 + heavy * (MOTES - 5));
    const rgb = dustRGB(v, overNow);

    for (let i = 0; i < count; i++) {
      const hx = hash(i, 1);
      const hy = hash(i, 2);
      const hs = hash(i, 3);

      // sawdust drifts down and gathers low; heavy air keeps more of it aloft
      const fall = 5 + hs * 13;
      let y = (hy * h + tt * fall) % (h + 16);
      const settle = v * (0.62 + hy * 0.32); // clear air -> most dust settled low
      y = y * (1 - v * 0.55) + h * settle;
      if (y > h) y = h - (y - h) * 0.3;

      const sway = Math.sin(tt * (0.5 + hs) + i) * (1.2 + heavy * 3.5);
      const x = (hx * w + sway + w) % w;

      const r = 0.6 + hs * 1.4 + heavy * 0.8;
      const alpha = (0.1 + heavy * 0.5) * (0.45 + 0.55 * hy);

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
      ctx.fill();
    }

    // a settled line of dust along the bench, brighter as the air clears
    if (v > 0.4) {
      ctx.beginPath();
      ctx.moveTo(0, h - 3);
      ctx.lineTo(w, h - 3);
      ctx.lineWidth = 1;
      ctx.strokeStyle =
        "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (0.22 * (v - 0.4) * 1.7) + ")";
      ctx.stroke();
    }
  }

  function updateSawdust(t) {
    clarity = computeClarity(t);
    overNow = t.over;
    if (caption) caption.textContent = captionFor(t);
    if (reduceMotion) {
      clarityShown = clarity;
      drawDust(0, clarityShown);
    }
  }

  function dustFrame(time) {
    clarityShown += (clarity - clarityShown) * 0.06;
    drawDust(time, clarityShown);
    raf = window.requestAnimationFrame(dustFrame);
  }

  function startSawdust() {
    if (!ctx) return;
    sizeCanvas();
    if (reduceMotion) {
      drawDust(0, clarityShown);
    } else if (raf === null) {
      raf = window.requestAnimationFrame(dustFrame);
    }
    window.addEventListener("resize", function () {
      sizeCanvas();
      if (reduceMotion) drawDust(0, clarityShown);
    });
  }

  // ---- wiring ----
  addBtn.addEventListener("click", addCut);
  stockDown.addEventListener("click", () => setStock(stock - STOCK_STEP));
  stockUp.addEventListener("click", () => setStock(stock + STOCK_STEP));
  kerfDown.addEventListener("click", () => setKerf(kerf - KERF_STEP));
  kerfUp.addEventListener("click", () => setKerf(kerf + KERF_STEP));
  nameInput.addEventListener("change", () => {
    stockName = nameInput.value.trim() || "Shelf run";
    nameInput.value = stockName;
  });

  // ---- init ----
  seedBench();
  nameInput.value = stockName;
  render();
  startSawdust();
})();
