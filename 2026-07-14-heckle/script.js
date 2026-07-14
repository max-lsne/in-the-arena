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

    save();
  }

  function renderStrick(s) {
    const card = document.createElement("article");
    card.className = "strick";
    card.dataset.id = s.id;

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
      b.className = "cond-btn" + (c.key === s.cond ? " active" : "");
      b.textContent = c.label;
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
})();
