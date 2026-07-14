/* Heckle — a bench for drawing a few stricks of flax to line.
   Single file, no build step, no dependencies. */

(function () {
  "use strict";

  const BENCH_LIMIT = 7;
  const STORAGE_KEY = "heckle.bench.v1";

  // Draw — how fine the strick has been combed (index 0..3).
  const GRADES = ["Ruffled", "Coarse", "Fine", "Line"];

  // Condition — how it is faring under the pins, right now.
  const CONDITIONS = [
    { key: "tangled", label: "Tangled" },
    { key: "drawing", label: "Drawing" },
    { key: "combed", label: "Combed" },
    { key: "lustrous", label: "Lustrous" },
  ];

  // A small heap of names to seed and to draw from when setting on.
  const HEAP = [
    "Long line, north field",
    "Second pulling",
    "Dew-retted, the low acre",
    "Water-retted bundle",
    "Tow from the coarse comb",
    "Blue-flower strick",
    "Late sowing, hedge side",
    "The short handful",
    "Winter-kept flax",
    "River meadow line",
    "Boon-heavy strick",
    "Fine seed, dry year",
  ];

  const SEED = [
    { name: "Long line, north field", grade: 3, cond: "lustrous" },
    { name: "Water-retted bundle", grade: 2, cond: "drawing" },
    { name: "Second pulling", grade: 1, cond: "combed" },
    { name: "Tow from the coarse comb", grade: 0, cond: "tangled" },
  ];

  let stricks = [];
  let seq = 1;
  let benchName = "The heckle-bench";
  let heapCursor = 0;
  let focusedId = null;
  let lastFocusIndex = 0;

  function makeStrick(spec) {
    return {
      id: "s" + seq++,
      name: spec.name,
      grade: spec.grade | 0,
      cond: spec.cond || "tangled",
    };
  }

  function seedBench() {
    stricks = SEED.map(makeStrick);
  }

  // ---- persistence: everything stays in this browser, nowhere else ----
  function storageOk() {
    try {
      const k = "__heckle_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  const canStore = storageOk();

  function save() {
    if (!canStore) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          benchName: benchName,
          seq: seq,
          heapCursor: heapCursor,
          stricks: stricks,
        })
      );
    } catch (e) {
      /* quota or serialisation trouble — the bench just won't persist */
    }
  }

  function load() {
    if (!canStore) return false;
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return false;
    }
    if (!raw) return false;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return false;
    }
    if (!data || !Array.isArray(data.stricks)) return false;

    const condKeys = CONDITIONS.map((c) => c.key);
    const clean = [];
    data.stricks.forEach((s) => {
      if (!s || typeof s.name !== "string") return;
      const grade = Math.max(0, Math.min(GRADES.length - 1, s.grade | 0));
      const cond = condKeys.indexOf(s.cond) >= 0 ? s.cond : "tangled";
      clean.push({
        id: typeof s.id === "string" ? s.id : "s" + seq++,
        name: s.name.slice(0, 48) || "Unnamed strick",
        grade: grade,
        cond: cond,
      });
    });

    stricks = clean;
    if (typeof data.benchName === "string" && data.benchName.trim()) {
      benchName = data.benchName.trim().slice(0, 40);
    }
    if (Number.isFinite(data.seq)) seq = Math.max(seq, data.seq | 0);
    if (Number.isFinite(data.heapCursor)) heapCursor = data.heapCursor | 0;
    return true;
  }

  // ---- DOM refs ----
  const listEl = document.getElementById("strick-list");
  const countEl = document.getElementById("bench-count");
  const emptyEl = document.getElementById("bench-empty");
  const fullEl = document.getElementById("bench-full");
  const addBtn = document.getElementById("add-strick");
  const resetBtn = document.getElementById("reset-bench");
  const nameInput = document.getElementById("bench-name");
  const statusEl = document.getElementById("bench-status");

  // ---- rendering ----
  function render() {
    listEl.innerHTML = "";

    stricks.forEach((s) => {
      listEl.appendChild(renderStrick(s));
    });

    const n = stricks.length;
    countEl.textContent = n + " / " + BENCH_LIMIT + " on the bench";
    countEl.classList.toggle("is-full", n >= BENCH_LIMIT);

    emptyEl.hidden = n !== 0;
    fullEl.hidden = n < BENCH_LIMIT;
    addBtn.disabled = n >= BENCH_LIMIT;

    // keep the keyboard focus pointing at a strick that still exists
    if (focusedId && !stricks.some((s) => s.id === focusedId)) {
      focusedId = n ? stricks[Math.min(lastFocusIndex, n - 1)].id : null;
    }

    save();
    updateSheen();

    if (statusEl) {
      statusEl.textContent =
        n + " of " + BENCH_LIMIT + " on the bench. " + captionFor(sheenScore);
    }
  }

  // toggle the focus ring without rebuilding the list (keeps clicks alive)
  function markFocus() {
    const nodes = listEl.querySelectorAll(".strick");
    nodes.forEach((node) =>
      node.classList.toggle("is-focused", node.dataset.id === focusedId)
    );
  }

  function renderStrick(s) {
    const card = document.createElement("article");
    card.className = "strick" + (s.id === focusedId ? " is-focused" : "");
    card.dataset.id = s.id;
    card.addEventListener("mousedown", () => {
      if (focusedId !== s.id) {
        focusedId = s.id;
        markFocus();
      }
    });

    // head: name + condition tag
    const head = document.createElement("div");
    head.className = "strick-head";

    const name = document.createElement("input");
    name.className = "strick-name";
    name.value = s.name;
    name.setAttribute("aria-label", "Strick name");
    name.maxLength = 48;
    name.addEventListener("change", () => {
      s.name = name.value.trim() || "Unnamed strick";
      name.value = s.name;
      save();
    });
    head.appendChild(name);

    const cond = CONDITIONS.find((c) => c.key === s.cond) || CONDITIONS[0];
    const tag = document.createElement("span");
    tag.className = "tag tag-" + cond.key;
    tag.textContent = cond.label;
    head.appendChild(tag);
    card.appendChild(head);

    // grade rail
    const rail = document.createElement("div");
    rail.className = "grade-rail";
    for (let i = 0; i < GRADES.length; i++) {
      const step = document.createElement("div");
      step.className = "grade-step" + (i <= s.grade ? " filled" : "");
      rail.appendChild(step);
    }
    card.appendChild(rail);

    const labels = document.createElement("div");
    labels.className = "grade-labels";
    GRADES.forEach((g, i) => {
      const sp = document.createElement("span");
      sp.textContent = g;
      if (i === s.grade) sp.className = "here";
      labels.appendChild(sp);
    });
    card.appendChild(labels);

    // condition picker
    const condRow = document.createElement("div");
    condRow.className = "cond-row";
    const condLabel = document.createElement("span");
    condLabel.className = "cond-label";
    condLabel.textContent = "Under the pins";
    condRow.appendChild(condLabel);
    CONDITIONS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      const on = c.key === s.cond;
      b.className = "cond-btn" + (on ? " active" : "");
      b.textContent = c.label;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", c.label + " — " + s.name);
      b.addEventListener("click", () => {
        s.cond = c.key;
        render();
      });
      condRow.appendChild(b);
    });
    card.appendChild(condRow);

    // foot: back / draw finer / take off
    const foot = document.createElement("div");
    foot.className = "strick-foot";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "mini-btn";
    back.textContent = "Back";
    back.disabled = s.grade <= 0;
    back.addEventListener("click", () => {
      if (s.grade > 0) s.grade--;
      render();
    });
    foot.appendChild(back);

    const finer = document.createElement("button");
    finer.type = "button";
    finer.className = "mini-btn mini-btn-primary";
    finer.textContent = s.grade >= GRADES.length - 1 ? "At line" : "Draw finer";
    finer.disabled = s.grade >= GRADES.length - 1;
    finer.addEventListener("click", () => {
      if (s.grade < GRADES.length - 1) s.grade++;
      // drawing finer nudges the condition along, as it does at the bench
      if (s.cond === "tangled") s.cond = "drawing";
      render();
    });
    foot.appendChild(finer);

    const off = document.createElement("button");
    off.type = "button";
    off.className = "mini-btn mini-btn-danger mini-btn-remove";
    off.textContent = "Take off";
    off.setAttribute("aria-label", "Take " + s.name + " off the bench");
    off.addEventListener("click", () => {
      stricks = stricks.filter((x) => x.id !== s.id);
      render();
    });
    foot.appendChild(off);

    card.appendChild(foot);
    return card;
  }

  // ---- actions ----
  function addStrick() {
    if (stricks.length >= BENCH_LIMIT) return;
    const name = HEAP[heapCursor % HEAP.length];
    heapCursor++;
    stricks.push(makeStrick({ name: name, grade: 0, cond: "tangled" }));
    render();
  }

  function resetBench() {
    if (canStore) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* nothing to do */
      }
    }
    seq = 1;
    heapCursor = 0;
    benchName = "The heckle-bench";
    nameInput.value = benchName;
    seedBench();
    render();
  }

  // ---- the sheen: the whole bench held to the light as one line ----
  // Lies satin and bright when the work is drawing well and few stricks are
  // worked at once; blooms dull and grey, the way tow does, as the bench fills
  // with ruffled, tangled stricks all balking on the pins at once.
  const sheenCanvas = document.getElementById("sheen");
  const sheenCaption = document.getElementById("sheen-caption");
  const sheenCtx = sheenCanvas && sheenCanvas.getContext ? sheenCanvas.getContext("2d") : null;
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let sheenScore = 0.62; // 0 dull/grey .. 1 satin/bright
  let sheenShown = 0.62; // eased value actually drawn
  let sheenRaf = null;

  function computeSheen() {
    const n = stricks.length;
    if (!n) return 0.62;
    let quality = 0;
    let rough = 0;
    stricks.forEach((s) => {
      const ci = CONDITIONS.findIndex((c) => c.key === s.cond);
      quality += (s.grade / (GRADES.length - 1) + ci / (CONDITIONS.length - 1)) / 2;
      if (s.cond === "tangled" || s.grade === 0) rough++;
    });
    quality /= n;
    const load = n / BENCH_LIMIT;
    const roughFrac = rough / n;
    const v = 0.12 + 0.9 * quality - 0.4 * Math.max(0, load - 0.4) - 0.28 * roughFrac;
    return Math.max(0, Math.min(1, v));
  }

  function captionFor(v) {
    if (!stricks.length) return "The bench is clear — the line lies still.";
    if (v >= 0.72) return "The bench is drawing satin — the line lies bright.";
    if (v >= 0.5) return "The bench is drawing well.";
    if (v >= 0.3) return "The sheen is dulling — too much is left ruffled.";
    return "The line has bloomed grey — the bench is choked with tow.";
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  // dull steel-grey (v=0) toward flaxen gold (v=1)
  function sheenStroke(v, alpha) {
    const r = mix(122, 216, v);
    const g = mix(126, 172, v);
    const b = mix(118, 74, v);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function sizeSheen() {
    if (!sheenCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = sheenCanvas.clientWidth || 600;
    const h = sheenCanvas.clientHeight || 66;
    sheenCanvas.width = Math.max(1, Math.round(w * dpr));
    sheenCanvas.height = Math.max(1, Math.round(h * dpr));
    sheenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawSheen(time, v) {
    if (!sheenCtx) return;
    const w = sheenCanvas.clientWidth || 600;
    const h = sheenCanvas.clientHeight || 66;
    const mid = h / 2;
    sheenCtx.clearRect(0, 0, w, h);

    const t = reduceMotion ? 0 : time / 1000;
    const ragged = 1 - v; // dull work rides higher, rougher ripples
    const baseAmp = 3 + ragged * 5;
    const noiseAmp = ragged * 9;

    // main line
    sheenCtx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const p = x / w;
      const base = Math.sin(p * 7 + t * 1.1) * baseAmp;
      const noise =
        (Math.sin(x * 0.13 + t * 2.3) + Math.sin(x * 0.061 - t * 1.7)) * 0.5 * noiseAmp;
      const y = mid + base + noise;
      if (x === 0) sheenCtx.moveTo(x, y);
      else sheenCtx.lineTo(x, y);
    }
    sheenCtx.lineWidth = 2;
    sheenCtx.strokeStyle = sheenStroke(v, 0.95);
    sheenCtx.shadowColor = sheenStroke(v, 0.6);
    sheenCtx.shadowBlur = v > 0.55 && !reduceMotion ? 8 * v : 0;
    sheenCtx.stroke();
    sheenCtx.shadowBlur = 0;

    // a travelling satin highlight, only when the line is drawing bright
    if (v > 0.5) {
      const cx = reduceMotion ? w * 0.5 : ((t * 90) % (w + 200)) - 100;
      const grad = sheenCtx.createLinearGradient(cx - 90, 0, cx + 90, 0);
      grad.addColorStop(0, sheenStroke(v, 0));
      grad.addColorStop(0.5, "rgba(240,210,120," + (0.5 * (v - 0.5) * 2) + ")");
      grad.addColorStop(1, sheenStroke(v, 0));
      sheenCtx.beginPath();
      for (let x = Math.max(0, cx - 90); x <= Math.min(w, cx + 90); x += 2) {
        const p = x / w;
        const base = Math.sin(p * 7 + t * 1.1) * baseAmp;
        const y = mid + base;
        if (x === Math.max(0, cx - 90)) sheenCtx.moveTo(x, y);
        else sheenCtx.lineTo(x, y);
      }
      sheenCtx.lineWidth = 3;
      sheenCtx.strokeStyle = grad;
      sheenCtx.stroke();
    }
  }

  function updateSheen() {
    sheenScore = computeSheen();
    if (sheenCaption) sheenCaption.textContent = captionFor(sheenScore);
    if (reduceMotion) {
      sheenShown = sheenScore;
      drawSheen(0, sheenShown);
    }
  }

  function sheenFrame(time) {
    sheenShown += (sheenScore - sheenShown) * 0.06;
    drawSheen(time, sheenShown);
    sheenRaf = window.requestAnimationFrame(sheenFrame);
  }

  function startSheen() {
    if (!sheenCtx) return;
    sizeSheen();
    updateSheen();
    if (reduceMotion) {
      drawSheen(0, sheenShown);
    } else if (sheenRaf === null) {
      sheenRaf = window.requestAnimationFrame(sheenFrame);
    }
    window.addEventListener("resize", function () {
      sizeSheen();
      if (reduceMotion) drawSheen(0, sheenShown);
    });
  }

  // ---- keyboard: draw the bench without leaving the home row ----
  function focusedStrick() {
    return stricks.find((s) => s.id === focusedId) || null;
  }

  function moveFocus(delta) {
    if (!stricks.length) return;
    let idx = stricks.findIndex((s) => s.id === focusedId);
    if (idx < 0) idx = delta > 0 ? -1 : stricks.length;
    idx = Math.max(0, Math.min(stricks.length - 1, idx + delta));
    focusedId = stricks[idx].id;
    lastFocusIndex = idx;
    markFocus();
    const node = listEl.querySelector('.strick[data-id="' + focusedId + '"]');
    if (node) node.scrollIntoView({ block: "nearest" });
  }

  function drawFiner(s) {
    if (!s) return;
    if (s.grade < GRADES.length - 1) s.grade++;
    if (s.cond === "tangled") s.cond = "drawing";
    render();
  }

  function drawBack(s) {
    if (!s) return;
    if (s.grade > 0) s.grade--;
    render();
  }

  function takeOff(s) {
    if (!s) return;
    lastFocusIndex = stricks.findIndex((x) => x.id === s.id);
    stricks = stricks.filter((x) => x.id !== s.id);
    render();
  }

  function isTyping(el) {
    if (!el) return false;
    const t = el.tagName;
    return t === "INPUT" || t === "TEXTAREA" || el.isContentEditable;
  }

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTyping(e.target)) return;

    const key = e.key;
    const s = focusedStrick();

    switch (key) {
      case "j":
      case "J":
      case "ArrowDown":
        moveFocus(1);
        break;
      case "k":
      case "K":
      case "ArrowUp":
        moveFocus(-1);
        break;
      case "Enter":
      case "]":
        if (s) drawFiner(s);
        break;
      case "[":
        if (s) drawBack(s);
        break;
      case "0":
      case "1":
      case "2":
      case "3":
        if (s) {
          s.cond = CONDITIONS[+key].key;
          render();
        }
        break;
      case "Delete":
      case "Backspace":
        if (s) takeOff(s);
        break;
      case "n":
      case "N":
        addStrick();
        break;
      case "r":
      case "R":
        resetBench();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  // ---- wiring ----
  addBtn.addEventListener("click", addStrick);
  resetBtn.addEventListener("click", resetBench);
  nameInput.addEventListener("change", () => {
    benchName = nameInput.value.trim() || "The heckle-bench";
    nameInput.value = benchName;
    save();
  });

  // ---- init ----
  if (!load()) {
    seedBench();
  }
  nameInput.value = benchName;
  render();
  startSheen();
})();
