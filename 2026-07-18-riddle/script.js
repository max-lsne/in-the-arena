/* Riddle — a graded sieve for sorting a heap by one gauge at a time.
   Single file, no build step, no dependencies. In-memory only. */

(function () {
  "use strict";

  const SCREEN_LIMIT = 10;

  // The size ladder, fine -> coarse (index 0..4). Size stands for whatever one
  // gauge you choose; the riddle only ever reads a piece against a single gap.
  const SIZES = [
    { key: "dust", label: "Dust", sw: "sw-dust" },
    { key: "grit", label: "Grit", sw: "sw-grit" },
    { key: "gravel", label: "Gravel", sw: "sw-gravel" },
    { key: "cobble", label: "Cobble", sw: "sw-cobble" },
    { key: "stone", label: "Stone", sw: "sw-stone" },
  ];

  // Bands are drawn coarsest on top, the pan (dust) at the bottom — the order a
  // graded stack of screens actually sits in.
  const BANDS = [
    { size: 4, name: "Stone", gloss: "over the coarse screen — won't pass", mesh: 7 },
    { size: 3, name: "Cobble", gloss: "caught on the next screen down", mesh: 6 },
    { size: 2, name: "Gravel", gloss: "held in the middle of the stack", mesh: 5 },
    { size: 1, name: "Grit", gloss: "through all but the finest mesh", mesh: 4 },
    { size: 0, name: "The pan", gloss: "fell clean through — the fines", mesh: 0, pan: true },
  ];

  // The tip: named asks to seed the heap and to draw from when you add a piece,
  // each with the size it naturally falls to under a "how big is the job" gauge.
  const STANDING = [
    { name: "Reply to Sam", size: 1 },
    { name: "Ship the data migration", size: 4 },
    { name: "Rewrite the onboarding doc", size: 3 },
    { name: "Merge the open PR", size: 1 },
    { name: "Plan the Q3 roadmap", size: 4 },
    { name: "File the expense receipt", size: 0 },
    { name: "Fix the flaky test", size: 2 },
    { name: "Answer the long RFP", size: 3 },
    { name: "Book the offsite venue", size: 2 },
    { name: "Ack the calendar invite", size: 0 },
    { name: "Refactor the auth module", size: 3 },
    { name: "Water the office plant", size: 0 },
    { name: "Draft the launch email", size: 2 },
    { name: "Interview the candidate", size: 2 },
  ];

  const SEED = [
    { name: "Ship the data migration", size: 4, sorted: true },
    { name: "Rewrite the onboarding doc", size: 3, sorted: true },
    { name: "Fix the flaky test", size: 2, sorted: false },
    { name: "Reply to Sam", size: 1, sorted: false },
    { name: "Ack the calendar invite", size: 0, sorted: true },
  ];

  let pieces = [];
  let seq = 1;
  let riddleName = "Monday's tip";
  let tipCursor = 0;
  let justDropped = new Set(); // ids that just fell into a band — for the drop animation

  function makePiece(spec) {
    return {
      id: "p" + seq++,
      name: spec.name,
      size: clampSize(spec.size),
      sorted: !!spec.sorted,
    };
  }

  function clampSize(s) {
    s = s | 0;
    return Math.max(0, Math.min(SIZES.length - 1, s));
  }

  function seedScreen() {
    pieces = SEED.map(makePiece);
  }

  // ---- DOM refs ----
  const hopperList = document.getElementById("hopper-list");
  const hopperEmpty = document.getElementById("hopper-empty");
  const stackEl = document.getElementById("stack");
  const countEl = document.getElementById("riddle-count");
  const fullEl = document.getElementById("screen-full");
  const addBtn = document.getElementById("add-item");
  const shakeBtn = document.getElementById("shake");
  const tipAllBtn = document.getElementById("tip-all");
  const resetBtn = document.getElementById("reset-riddle");
  const nameInput = document.getElementById("riddle-name");
  const statusEl = document.getElementById("riddle-status");

  // ---- rendering ----
  function render() {
    // hopper: everything tipped in but not yet shaken down
    hopperList.innerHTML = "";
    const inHopper = pieces.filter((p) => !p.sorted);
    inHopper.forEach((p) => hopperList.appendChild(renderPiece(p)));
    hopperEmpty.hidden = inHopper.length !== 0;

    // the graded stack
    stackEl.innerHTML = "";
    BANDS.forEach((band) => stackEl.appendChild(renderBand(band)));

    const n = pieces.length;
    countEl.textContent = n + " / " + SCREEN_LIMIT + " on the screen";
    countEl.classList.toggle("is-full", n >= SCREEN_LIMIT);
    fullEl.hidden = n < SCREEN_LIMIT;
    addBtn.disabled = n >= SCREEN_LIMIT;
    shakeBtn.disabled = inHopper.length === 0;
    tipAllBtn.disabled = pieces.every((p) => !p.sorted);

    updateDust();

    if (statusEl) {
      statusEl.textContent =
        n + " on the screen, " + inHopper.length + " in the hopper. " +
        captionFor(dustScore);
    }

    justDropped = new Set(); // consumed by this render
  }

  function renderBand(band) {
    const el = document.createElement("div");
    el.className = "band" + (band.pan ? " band-pan" : "");
    el.dataset.size = band.size;

    if (!band.pan) {
      const mesh = document.createElement("span");
      mesh.className = "band-mesh";
      mesh.style.height = "4px";
      mesh.style.backgroundImage =
        "repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px " +
        band.mesh + "px)";
      el.appendChild(mesh);
    }

    const head = document.createElement("div");
    head.className = "band-head";
    const name = document.createElement("span");
    name.className = "band-name";
    name.textContent = band.name;
    const gloss = document.createElement("span");
    gloss.className = "band-gloss";
    gloss.textContent = band.gloss;
    head.appendChild(name);
    head.appendChild(gloss);

    const held = pieces.filter((p) => p.sorted && p.size === band.size);
    const tip = document.createElement("button");
    tip.type = "button";
    tip.className = "band-tipback";
    tip.textContent = "Tip back";
    tip.disabled = held.length === 0;
    tip.setAttribute("aria-label", "Tip the " + band.name + " band back into the hopper");
    tip.addEventListener("click", () => {
      held.forEach((p) => (p.sorted = false));
      render();
    });
    head.appendChild(tip);
    el.appendChild(head);

    const items = document.createElement("div");
    items.className = "band-items";
    if (held.length === 0) {
      const note = document.createElement("span");
      note.className = "band-empty-note";
      note.textContent = band.pan ? "no fines yet" : "nothing this coarse";
      items.appendChild(note);
    } else {
      held.forEach((p) => items.appendChild(renderPiece(p)));
    }
    el.appendChild(items);
    return el;
  }

  function renderPiece(p) {
    const size = SIZES[p.size];
    const el = document.createElement("span");
    el.className = "piece" + (justDropped.has(p.id) ? " just-dropped" : "");
    el.dataset.id = p.id;

    const sw = document.createElement("span");
    sw.className = "piece-swatch " + size.sw;
    sw.title = size.label;
    el.appendChild(sw);

    const name = document.createElement("input");
    name.className = "piece-name";
    name.value = p.name;
    name.size = Math.max(6, Math.min(22, p.name.length));
    name.maxLength = 40;
    name.setAttribute("aria-label", "Piece name");
    name.addEventListener("change", () => {
      p.name = name.value.trim() || "Unnamed";
      name.value = p.name;
    });
    el.appendChild(name);

    const sizer = document.createElement("span");
    sizer.className = "piece-size";
    const down = document.createElement("button");
    down.type = "button";
    down.className = "size-btn";
    down.textContent = "−"; // minus
    down.disabled = p.size <= 0;
    down.setAttribute("aria-label", "Grade " + p.name + " finer");
    down.addEventListener("click", () => setSize(p, p.size - 1));
    const up = document.createElement("button");
    up.type = "button";
    up.className = "size-btn";
    up.textContent = "+";
    up.disabled = p.size >= SIZES.length - 1;
    up.setAttribute("aria-label", "Grade " + p.name + " coarser");
    up.addEventListener("click", () => setSize(p, p.size + 1));
    sizer.appendChild(down);
    sizer.appendChild(up);
    el.appendChild(sizer);

    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "piece-remove";
    rm.textContent = "×"; // times
    rm.setAttribute("aria-label", "Take " + p.name + " off the screen");
    rm.addEventListener("click", () => {
      pieces = pieces.filter((x) => x.id !== p.id);
      render();
    });
    el.appendChild(rm);
    return el;
  }

  // ---- actions ----
  function setSize(p, next) {
    p.size = clampSize(next);
    render();
  }

  function addPiece() {
    if (pieces.length >= SCREEN_LIMIT) return;
    const spec = STANDING[tipCursor % STANDING.length];
    tipCursor++;
    pieces.push(makePiece({ name: spec.name, size: spec.size, sorted: false }));
    render();
  }

  function shake() {
    const dropping = pieces.filter((p) => !p.sorted);
    if (!dropping.length) return;
    dropping.forEach((p) => {
      p.sorted = true;
      justDropped.add(p.id);
    });
    render();
  }

  function tipAll() {
    pieces.forEach((p) => (p.sorted = false));
    render();
  }

  function resetScreen() {
    seq = 1;
    tipCursor = 0;
    riddleName = "Monday's tip";
    nameInput.value = riddleName;
    seedScreen();
    render();
  }

  // ---- the dust: raised by shaking, hanging until the heap settles ----
  // Lies clear when the heap is graded and down; hangs thick and grey while
  // pieces sit unshaken in the hopper, or the screen is loaded past its size.
  const dustCanvas = document.getElementById("dust");
  const dustCaption = document.getElementById("dust-caption");
  const dustCtx = dustCanvas && dustCanvas.getContext ? dustCanvas.getContext("2d") : null;
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let dustScore = 0.7; // 0 thick/grey .. 1 clear/settled
  let dustShown = 0.7;
  let dustRaf = null;

  function computeDust() {
    const n = pieces.length;
    if (!n) return 0.72;
    const hopper = pieces.filter((p) => !p.sorted).length;
    const unsettled = hopper / n;
    const load = n / SCREEN_LIMIT;
    const v = 0.86 - 0.72 * unsettled - 0.42 * Math.max(0, load - 0.6);
    return Math.max(0, Math.min(1, v));
  }

  function captionFor(v) {
    const n = pieces.length;
    if (!n) return "Nothing on the screen — the air lies clear.";
    if (v >= 0.72) return "The air lies clear — the heap is graded and settled.";
    if (v >= 0.5) return "The dust is settling — most of the heap is down.";
    if (v >= 0.3) return "Dust hangs over the screen — the heap sits unshaken.";
    return "The air is thick with dust — shake it down, or take some off.";
  }

  // deterministic per-mote scatter (no Math.random — keeps frames reproducible)
  function hash(i, salt) {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  // warm settling dust (v=1) toward a cold grey hanging haze (v=0)
  function dustRGB(v) {
    return [mix(150, 202, v), mix(146, 172, v), mix(134, 116, v)];
  }

  function sizeDust() {
    if (!dustCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = dustCanvas.clientWidth || 600;
    const h = dustCanvas.clientHeight || 66;
    dustCanvas.width = Math.max(1, Math.round(w * dpr));
    dustCanvas.height = Math.max(1, Math.round(h * dpr));
    dustCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const MOTES = 48;

  function drawDust(time, v) {
    if (!dustCtx) return;
    const w = dustCanvas.clientWidth || 600;
    const h = dustCanvas.clientHeight || 66;
    dustCtx.clearRect(0, 0, w, h);

    const t = reduceMotion ? 0 : time / 1000;
    const heavy = 1 - v;
    const count = Math.round(5 + heavy * (MOTES - 6));
    const rgb = dustRGB(v);

    for (let i = 0; i < count; i++) {
      const hx = hash(i, 1);
      const hy = hash(i, 2);
      const hs = hash(i, 3);
      const dir = hash(i, 4) < 0.5 ? 1 : -1;

      const speed = 6 + hs * 16;
      let x = (hx * w + t * speed * dir) % (w + 20);
      if (x < 0) x += w + 20;
      x -= 10;

      // clear air lets motes settle low and still; heavy air keeps them hanging
      const drift = Math.sin(t * (0.5 + hs) + i) * (1.5 + heavy * 5);
      const settle = (1 - v) * (0.16 + hy * 0.62) + v * (0.6 + hy * 0.34);
      const y = h * settle + drift;

      const r = 0.6 + hs * 1.5 + heavy * 0.9;
      const alpha = (0.1 + heavy * 0.5) * (0.45 + 0.55 * hy);

      dustCtx.beginPath();
      dustCtx.arc(x, y, r, 0, Math.PI * 2);
      dustCtx.fillStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + alpha + ")";
      dustCtx.fill();
    }

    // a faint line where the settled dust gathers, brighter as the air clears
    if (v > 0.45) {
      dustCtx.beginPath();
      dustCtx.moveTo(0, h - 4);
      dustCtx.lineTo(w, h - 4);
      dustCtx.lineWidth = 1;
      dustCtx.strokeStyle =
        "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (0.22 * (v - 0.45) * 2) + ")";
      dustCtx.stroke();
    }
  }

  function updateDust() {
    dustScore = computeDust();
    if (dustCaption) dustCaption.textContent = captionFor(dustScore);
    if (reduceMotion) {
      dustShown = dustScore;
      drawDust(0, dustShown);
    }
  }

  function dustFrame(time) {
    dustShown += (dustScore - dustShown) * 0.06;
    drawDust(time, dustShown);
    dustRaf = window.requestAnimationFrame(dustFrame);
  }

  function startDust() {
    if (!dustCtx) return;
    sizeDust();
    updateDust();
    if (reduceMotion) {
      drawDust(0, dustShown);
    } else if (dustRaf === null) {
      dustRaf = window.requestAnimationFrame(dustFrame);
    }
    window.addEventListener("resize", function () {
      sizeDust();
      if (reduceMotion) drawDust(0, dustShown);
    });
  }

  // ---- wiring ----
  addBtn.addEventListener("click", addPiece);
  shakeBtn.addEventListener("click", shake);
  tipAllBtn.addEventListener("click", tipAll);
  resetBtn.addEventListener("click", resetScreen);
  nameInput.addEventListener("change", () => {
    riddleName = nameInput.value.trim() || "Monday's tip";
    nameInput.value = riddleName;
  });

  // ---- init ----
  seedScreen();
  nameInput.value = riddleName;
  render();
  startDust();
})();
