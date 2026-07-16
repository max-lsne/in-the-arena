/* Windrow — a field for drying a few rows of cut work before they are baled.
   Single file, no build step, no dependencies. In-memory only. */

(function () {
  "use strict";

  const FIELD_LIMIT = 7;

  // Grade — how far the row has been made (index 0..3).
  const GRADES = ["Swath", "Windrow", "Turned", "Baled"];

  // Condition — how it is faring in the weather, right now.
  const CONDITIONS = [
    { key: "green", label: "Green" },
    { key: "drying", label: "Drying" },
    { key: "dry", label: "Dry" },
    { key: "fit", label: "Fit" },
  ];

  // The standing crop: names to seed the field and to cut from when you mow.
  const STANDING = [
    "The launch post, written last night",
    "The reply I want to send now",
    "The feature that finally works",
    "The hiring decision",
    "The apology, first draft",
    "The pricing change",
    "The resignation letter",
    "The all-hands talk",
    "The API, green from the branch",
    "The essay's hot ending",
    "The verdict on the vendor",
    "The strongly-worded memo",
  ];

  const SEED = [
    { name: "The reply I want to send now", grade: 0, cond: "green" },
    { name: "The launch post, written last night", grade: 1, cond: "drying" },
    { name: "The feature that finally works", grade: 2, cond: "dry" },
    { name: "The essay's hot ending", grade: 3, cond: "fit" },
  ];

  let rows = [];
  let seq = 1;
  let fieldName = "The home meadow";
  let cropCursor = 0;
  let focusedId = null;
  let lastFocusIndex = 0;

  function makeRow(spec) {
    return {
      id: "r" + seq++,
      name: spec.name,
      grade: spec.grade | 0,
      cond: spec.cond || "green",
    };
  }

  function seedField() {
    rows = SEED.map(makeRow);
  }

  // ---- persistence: the field is kept in the browser, nowhere else ----
  const STORAGE_KEY = "windrow.field.v1";

  const storageOk = (function () {
    try {
      const k = "__windrow_probe__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false; // private mode, disabled storage, etc. — stay in memory
    }
  })();

  function save() {
    if (!storageOk) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rows: rows,
          seq: seq,
          fieldName: fieldName,
          cropCursor: cropCursor,
        })
      );
    } catch (e) {
      /* quota or serialization trouble — leave the field standing in memory */
    }
  }

  function load() {
    if (!storageOk) return false;
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
    if (!data || !Array.isArray(data.rows)) return false;

    const condKeys = CONDITIONS.map((c) => c.key);
    rows = data.rows
      .filter((r) => r && typeof r.name === "string")
      .map((r) => ({
        id: typeof r.id === "string" ? r.id : "r" + seq++,
        name: r.name.slice(0, 48) || "Unnamed row",
        grade: Math.max(0, Math.min(GRADES.length - 1, r.grade | 0)),
        cond: condKeys.indexOf(r.cond) >= 0 ? r.cond : "green",
      }))
      .slice(0, FIELD_LIMIT);

    if (typeof data.seq === "number" && data.seq > 0) seq = data.seq;
    // never let seq collide with a restored id
    rows.forEach((r) => {
      const num = parseInt(String(r.id).replace(/^r/, ""), 10);
      if (!isNaN(num) && num >= seq) seq = num + 1;
    });
    if (typeof data.cropCursor === "number" && data.cropCursor >= 0) {
      cropCursor = data.cropCursor;
    }
    if (typeof data.fieldName === "string" && data.fieldName.trim()) {
      fieldName = data.fieldName;
    }
    return true;
  }

  // ---- DOM refs ----
  const listEl = document.getElementById("row-list");
  const countEl = document.getElementById("field-count");
  const emptyEl = document.getElementById("field-empty");
  const fullEl = document.getElementById("field-full");
  const addBtn = document.getElementById("cut-row");
  const resetBtn = document.getElementById("reset-field");
  const nameInput = document.getElementById("field-name");
  const statusEl = document.getElementById("field-status");

  // ---- rendering ----
  function render() {
    listEl.innerHTML = "";

    rows.forEach((r) => {
      listEl.appendChild(renderRow(r));
    });

    const n = rows.length;
    countEl.textContent = n + " / " + FIELD_LIMIT + " in the field";
    countEl.classList.toggle("is-full", n >= FIELD_LIMIT);

    emptyEl.hidden = n !== 0;
    fullEl.hidden = n < FIELD_LIMIT;
    addBtn.disabled = n >= FIELD_LIMIT;

    // keep the keyboard focus pointing at a row that still exists
    if (focusedId && !rows.some((r) => r.id === focusedId)) {
      focusedId = n ? rows[Math.min(lastFocusIndex, n - 1)].id : null;
    }

    updateHaze();

    if (statusEl) {
      statusEl.textContent =
        n + " of " + FIELD_LIMIT + " in the field. " + captionFor(hazeScore);
    }

    save();
  }

  // toggle the focus ring without rebuilding the list (keeps clicks alive)
  function markFocus() {
    const nodes = listEl.querySelectorAll(".row");
    nodes.forEach((node) =>
      node.classList.toggle("is-focused", node.dataset.id === focusedId)
    );
  }

  function renderRow(r) {
    const card = document.createElement("article");
    card.className = "row" + (r.id === focusedId ? " is-focused" : "");
    card.dataset.id = r.id;
    card.addEventListener("mousedown", () => {
      if (focusedId !== r.id) {
        focusedId = r.id;
        markFocus();
      }
    });

    // head: name + condition tag
    const head = document.createElement("div");
    head.className = "row-head";

    const name = document.createElement("input");
    name.className = "row-name";
    name.value = r.name;
    name.setAttribute("aria-label", "Row name");
    name.maxLength = 48;
    name.addEventListener("change", () => {
      r.name = name.value.trim() || "Unnamed row";
      name.value = r.name;
    });
    head.appendChild(name);

    const cond = CONDITIONS.find((c) => c.key === r.cond) || CONDITIONS[0];
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
      step.className = "grade-step" + (i <= r.grade ? " filled" : "");
      rail.appendChild(step);
    }
    card.appendChild(rail);

    const labels = document.createElement("div");
    labels.className = "grade-labels";
    GRADES.forEach((g, i) => {
      const sp = document.createElement("span");
      sp.textContent = g;
      if (i === r.grade) sp.className = "here";
      labels.appendChild(sp);
    });
    card.appendChild(labels);

    // condition picker
    const condRow = document.createElement("div");
    condRow.className = "cond-row";
    const condLabel = document.createElement("span");
    condLabel.className = "cond-label";
    condLabel.textContent = "In the weather";
    condRow.appendChild(condLabel);
    CONDITIONS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      const on = c.key === r.cond;
      b.className = "cond-btn" + (on ? " active" : "");
      b.textContent = c.label;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", c.label + " — " + r.name);
      b.addEventListener("click", () => {
        r.cond = c.key;
        render();
      });
      condRow.appendChild(b);
    });
    card.appendChild(condRow);

    // foot: back / turn / bale off
    const foot = document.createElement("div");
    foot.className = "row-foot";

    const back = document.createElement("button");
    back.type = "button";
    back.className = "mini-btn";
    back.textContent = "Back";
    back.disabled = r.grade <= 0;
    back.addEventListener("click", () => {
      if (r.grade > 0) r.grade--;
      render();
    });
    foot.appendChild(back);

    const turn = document.createElement("button");
    turn.type = "button";
    turn.className = "mini-btn mini-btn-primary";
    turn.textContent = r.grade >= GRADES.length - 1 ? "Baled" : "Turn";
    turn.disabled = r.grade >= GRADES.length - 1;
    turn.addEventListener("click", () => {
      if (r.grade < GRADES.length - 1) r.grade++;
      // turning a row helps it give up its moisture to the air
      if (r.cond === "green") r.cond = "drying";
      render();
    });
    foot.appendChild(turn);

    const off = document.createElement("button");
    off.type = "button";
    off.className = "mini-btn mini-btn-danger mini-btn-remove";
    off.textContent = "Bale";
    off.setAttribute("aria-label", "Bale " + r.name + " off the field");
    off.addEventListener("click", () => {
      rows = rows.filter((x) => x.id !== r.id);
      render();
    });
    foot.appendChild(off);

    card.appendChild(foot);
    return card;
  }

  // ---- actions ----
  function cutRow() {
    if (rows.length >= FIELD_LIMIT) return;
    const name = STANDING[cropCursor % STANDING.length];
    cropCursor++;
    rows.push(makeRow({ name: name, grade: 0, cond: "green" }));
    render();
  }

  function resetField() {
    seq = 1;
    cropCursor = 0;
    fieldName = "The home meadow";
    nameInput.value = fieldName;
    seedField();
    render();
  }

  // ---- the haze: the whole field seen through the heat-shimmer as one ----
  // Lies clear and bright when the field is drying well and few rows are worked
  // at once; hangs heavy and grey, the way haze does over wet ground, as the
  // field fills with green swaths all lying uncured at once.
  const hazeCanvas = document.getElementById("haze");
  const hazeCaption = document.getElementById("haze-caption");
  const hazeCtx = hazeCanvas && hazeCanvas.getContext ? hazeCanvas.getContext("2d") : null;
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let hazeScore = 0.62; // 0 heavy/grey .. 1 clear/bright
  let hazeShown = 0.62; // eased value actually drawn
  let hazeRaf = null;

  function computeHaze() {
    const n = rows.length;
    if (!n) return 0.62;
    let quality = 0;
    let green = 0;
    rows.forEach((r) => {
      const ci = CONDITIONS.findIndex((c) => c.key === r.cond);
      quality += (r.grade / (GRADES.length - 1) + ci / (CONDITIONS.length - 1)) / 2;
      if (r.cond === "green" || r.grade === 0) green++;
    });
    quality /= n;
    const load = n / FIELD_LIMIT;
    const greenFrac = green / n;
    const v = 0.12 + 0.9 * quality - 0.4 * Math.max(0, load - 0.4) - 0.28 * greenFrac;
    return Math.max(0, Math.min(1, v));
  }

  function captionFor(v) {
    if (!rows.length) return "The field is bare — the air lies clear.";
    if (v >= 0.72) return "The field is drying sweet — the air lies clear.";
    if (v >= 0.5) return "The field is drying well.";
    if (v >= 0.3) return "The haze is thickening — too much lies green.";
    return "The air hangs grey and heavy — the field is choked with green.";
  }

  function mix(a, b, t) {
    return Math.round(a + (b - a) * t);
  }

  // heavy grey haze (v=0) toward clear warm gold (v=1)
  function hazeStroke(v, alpha) {
    const r = mix(140, 216, v);
    const g = mix(142, 172, v);
    const b = mix(132, 74, v);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function sizeHaze() {
    if (!hazeCtx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = hazeCanvas.clientWidth || 600;
    const h = hazeCanvas.clientHeight || 66;
    hazeCanvas.width = Math.max(1, Math.round(w * dpr));
    hazeCanvas.height = Math.max(1, Math.round(h * dpr));
    hazeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawHaze(time, v) {
    if (!hazeCtx) return;
    const w = hazeCanvas.clientWidth || 600;
    const h = hazeCanvas.clientHeight || 66;
    const mid = h / 2;
    hazeCtx.clearRect(0, 0, w, h);

    const t = reduceMotion ? 0 : time / 1000;
    const heavy = 1 - v; // green, uncured work hangs higher and rougher
    const baseAmp = 3 + heavy * 5;
    const noiseAmp = heavy * 9;

    // the shimmer line lying over the field
    hazeCtx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const p = x / w;
      const base = Math.sin(p * 7 + t * 1.1) * baseAmp;
      const noise =
        (Math.sin(x * 0.13 + t * 2.3) + Math.sin(x * 0.061 - t * 1.7)) * 0.5 * noiseAmp;
      const y = mid + base + noise;
      if (x === 0) hazeCtx.moveTo(x, y);
      else hazeCtx.lineTo(x, y);
    }
    hazeCtx.lineWidth = 2;
    hazeCtx.strokeStyle = hazeStroke(v, 0.95);
    hazeCtx.shadowColor = hazeStroke(v, 0.6);
    hazeCtx.shadowBlur = v > 0.55 && !reduceMotion ? 8 * v : 0;
    hazeCtx.stroke();
    hazeCtx.shadowBlur = 0;

    // a travelling clear-air highlight, only when the field is drying well
    if (v > 0.5) {
      const cx = reduceMotion ? w * 0.5 : ((t * 90) % (w + 200)) - 100;
      const grad = hazeCtx.createLinearGradient(cx - 90, 0, cx + 90, 0);
      grad.addColorStop(0, hazeStroke(v, 0));
      grad.addColorStop(0.5, "rgba(238,205,120," + (0.5 * (v - 0.5) * 2) + ")");
      grad.addColorStop(1, hazeStroke(v, 0));
      hazeCtx.beginPath();
      for (let x = Math.max(0, cx - 90); x <= Math.min(w, cx + 90); x += 2) {
        const p = x / w;
        const base = Math.sin(p * 7 + t * 1.1) * baseAmp;
        const y = mid + base;
        if (x === Math.max(0, cx - 90)) hazeCtx.moveTo(x, y);
        else hazeCtx.lineTo(x, y);
      }
      hazeCtx.lineWidth = 3;
      hazeCtx.strokeStyle = grad;
      hazeCtx.stroke();
    }
  }

  function updateHaze() {
    hazeScore = computeHaze();
    if (hazeCaption) hazeCaption.textContent = captionFor(hazeScore);
    if (reduceMotion) {
      hazeShown = hazeScore;
      drawHaze(0, hazeShown);
    }
  }

  function hazeFrame(time) {
    hazeShown += (hazeScore - hazeShown) * 0.06;
    drawHaze(time, hazeShown);
    hazeRaf = window.requestAnimationFrame(hazeFrame);
  }

  function startHaze() {
    if (!hazeCtx) return;
    sizeHaze();
    updateHaze();
    if (reduceMotion) {
      drawHaze(0, hazeShown);
    } else if (hazeRaf === null) {
      hazeRaf = window.requestAnimationFrame(hazeFrame);
    }
    window.addEventListener("resize", function () {
      sizeHaze();
      if (reduceMotion) drawHaze(0, hazeShown);
    });
  }

  // ---- keyboard: work the field without leaving the home row ----
  function focusedRow() {
    return rows.find((r) => r.id === focusedId) || null;
  }

  function moveFocus(delta) {
    if (!rows.length) return;
    let idx = rows.findIndex((r) => r.id === focusedId);
    if (idx < 0) idx = delta > 0 ? -1 : rows.length;
    idx = Math.max(0, Math.min(rows.length - 1, idx + delta));
    focusedId = rows[idx].id;
    lastFocusIndex = idx;
    markFocus();
    const node = listEl.querySelector('.row[data-id="' + focusedId + '"]');
    if (node) node.scrollIntoView({ block: "nearest" });
  }

  function turnRow(r) {
    if (!r) return;
    if (r.grade < GRADES.length - 1) r.grade++;
    if (r.cond === "green") r.cond = "drying";
    render();
  }

  function turnBack(r) {
    if (!r) return;
    if (r.grade > 0) r.grade--;
    render();
  }

  function baleOff(r) {
    if (!r) return;
    lastFocusIndex = rows.findIndex((x) => x.id === r.id);
    rows = rows.filter((x) => x.id !== r.id);
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
    const r = focusedRow();

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
        if (r) turnRow(r);
        break;
      case "[":
        if (r) turnBack(r);
        break;
      case "0":
      case "1":
      case "2":
      case "3":
        if (r) {
          r.cond = CONDITIONS[+key].key;
          render();
        }
        break;
      case "Delete":
      case "Backspace":
        if (r) baleOff(r);
        break;
      case "n":
      case "N":
        cutRow();
        break;
      case "r":
      case "R":
        resetField();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  // ---- wiring ----
  addBtn.addEventListener("click", cutRow);
  resetBtn.addEventListener("click", resetField);
  nameInput.addEventListener("change", () => {
    fieldName = nameInput.value.trim() || "The home meadow";
    nameInput.value = fieldName;
    save();
  });

  // ---- init ----
  if (!load()) seedField();
  nameInput.value = fieldName;
  render();
  startHaze();
})();
