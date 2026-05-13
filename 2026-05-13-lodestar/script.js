(function () {
  "use strict";

  const PRINCIPLES = [
    { id: "p1", text: "Sleep on it once. Then send it.", tag: "decision-speed" },
    { id: "p2", text: "If you're the smartest person in the room, find a better room.", tag: "rooms" },
    { id: "p3", text: "The expensive option is rarely the answer. The cheap one almost never is.", tag: "spending" },
    { id: "p4", text: "What looks like a hard problem is usually two easy problems with a vague boundary.", tag: "scoping" },
    { id: "p5", text: "Choose the version of yourself that would respect the choice in five years.", tag: "horizon" },
    { id: "p6", text: "When everyone agrees, the meeting hasn't started.", tag: "dissent" },
    { id: "p7", text: "Hire for the question, not the answer.", tag: "hiring" }
  ];

  const els = {
    list: document.getElementById("principles-list"),
    anchorText: document.getElementById("anchor-text"),
    anchorMeta: document.getElementById("anchor-meta"),
    drawBtn: document.getElementById("draw-btn"),
    keepBtn: document.getElementById("keep-btn"),
    select: document.getElementById("principle-select"),
    form: document.getElementById("log-form"),
    decisionInput: document.getElementById("decision-input"),
    logList: document.getElementById("log-list"),
    accessForm: document.getElementById("access-form"),
    accessFoot: document.getElementById("access-foot"),
    emailInput: document.getElementById("email")
  };

  const STORAGE_KEY = "lodestar:v1";

  let currentIndex = -1;
  let kept = null;
  let log = [];

  function safeStorage() {
    try {
      const t = "__lodestar_test__";
      window.localStorage.setItem(t, t);
      window.localStorage.removeItem(t);
      return window.localStorage;
    } catch (_) {
      return null;
    }
  }
  const storage = safeStorage();

  function persist() {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({
        log: log,
        kept: kept ? kept.id : null,
        keptDate: kept ? new Date().toISOString().slice(0, 10) : null
      }));
    } catch (_) { /* quota / private mode */ }
  }

  function restore() {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function renderPrincipleList() {
    els.list.innerHTML = "";
    PRINCIPLES.forEach((p, i) => {
      const li = document.createElement("li");
      li.textContent = p.text;
      li.dataset.index = String(i);
      li.addEventListener("click", () => setAnchor(i));
      els.list.appendChild(li);
    });
  }

  function renderPrincipleSelect() {
    els.select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pick a principle…";
    placeholder.disabled = true;
    placeholder.selected = true;
    els.select.appendChild(placeholder);
    PRINCIPLES.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.text;
      els.select.appendChild(opt);
    });
  }

  function setAnchor(i) {
    if (i < 0 || i >= PRINCIPLES.length) return;
    currentIndex = i;
    const p = PRINCIPLES[i];
    els.anchorText.textContent = "“" + p.text + "”";
    els.anchorMeta.textContent = "tag · " + p.tag + "  ·  principle " + (i + 1) + " of " + PRINCIPLES.length;
    els.keepBtn.disabled = false;
    Array.from(els.list.children).forEach((node, idx) => {
      node.classList.toggle("is-active", idx === i);
    });
  }

  function drawRandom() {
    if (PRINCIPLES.length === 0) return;
    if (PRINCIPLES.length === 1) { setAnchor(0); return; }
    let next;
    do { next = Math.floor(Math.random() * PRINCIPLES.length); }
    while (next === currentIndex);
    setAnchor(next);
  }

  function stepAnchor(delta) {
    if (currentIndex === -1) { setAnchor(0); return; }
    const next = (currentIndex + delta + PRINCIPLES.length) % PRINCIPLES.length;
    setAnchor(next);
  }

  function keepForDay() {
    if (currentIndex === -1) return;
    kept = PRINCIPLES[currentIndex];
    els.anchorMeta.textContent = "kept for today · " + new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
    els.keepBtn.disabled = true;
    els.keepBtn.textContent = "Anchored ✓";
    persist();
  }

  function renderLog() {
    els.logList.innerHTML = "";
    if (log.length === 0) {
      const li = document.createElement("li");
      li.className = "log-empty";
      li.textContent = "No decisions logged yet. The next hard one is the first one.";
      els.logList.appendChild(li);
      return;
    }
    log.slice().reverse().forEach((entry) => {
      const li = document.createElement("li");
      const stamp = document.createElement("span");
      stamp.className = "log-stamp";
      stamp.textContent = entry.stamp;
      const body = document.createElement("div");
      const dec = document.createElement("p");
      dec.className = "log-decision";
      dec.textContent = entry.decision;
      const prn = document.createElement("p");
      prn.className = "log-principle";
      prn.style.margin = "0";
      prn.textContent = "anchored to · " + entry.principleText;
      body.appendChild(dec);
      body.appendChild(prn);
      li.appendChild(stamp);
      li.appendChild(body);
      els.logList.appendChild(li);
    });
  }

  function handleLog(evt) {
    evt.preventDefault();
    const decision = els.decisionInput.value.trim();
    const principleId = els.select.value;
    if (!decision || !principleId) return;
    const p = PRINCIPLES.find((x) => x.id === principleId);
    if (!p) return;
    const stamp = new Date().toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
    log.push({ decision: decision, principleId: p.id, principleText: p.text, stamp: stamp });
    els.decisionInput.value = "";
    els.select.selectedIndex = 0;
    renderLog();
    persist();
  }

  function handleAccess(evt) {
    evt.preventDefault();
    const email = els.emailInput.value.trim();
    if (!email) return;
    els.accessForm.style.display = "none";
    els.accessFoot.textContent = "Held. We'll write you once, the day it opens.";
    els.accessFoot.style.color = "rgba(244,236,216,0.85)";
  }

  function handleKeys(e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT")) return;
    if (e.key === "j" || e.key === "J") { stepAnchor(1); e.preventDefault(); }
    else if (e.key === "k" || e.key === "K") { stepAnchor(-1); e.preventDefault(); }
    else if (e.code === "Space") { drawRandom(); e.preventDefault(); }
  }

  function seedLog() {
    log.push({
      decision: "Took the smaller offer with the better team",
      principleId: "p2",
      principleText: PRINCIPLES[1].text,
      stamp: "Apr 14, 09:42"
    });
  }

  function hydrateFromStorage() {
    const saved = restore();
    if (!saved) { seedLog(); return; }
    if (Array.isArray(saved.log) && saved.log.length > 0) {
      log = saved.log.filter((e) => e && e.decision && e.principleText && e.stamp);
    } else {
      seedLog();
    }
    if (saved.kept && saved.keptDate === new Date().toISOString().slice(0, 10)) {
      const k = PRINCIPLES.find((p) => p.id === saved.kept);
      if (k) {
        kept = k;
        const idx = PRINCIPLES.indexOf(k);
        setAnchor(idx);
        els.anchorMeta.textContent = "kept for today · " + new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
        els.keepBtn.disabled = true;
        els.keepBtn.textContent = "Anchored ✓";
      }
    }
  }

  function boot() {
    renderPrincipleList();
    renderPrincipleSelect();
    hydrateFromStorage();
    renderLog();

    els.drawBtn.addEventListener("click", drawRandom);
    els.keepBtn.addEventListener("click", keepForDay);
    els.form.addEventListener("submit", handleLog);
    els.accessForm.addEventListener("submit", handleAccess);
    document.addEventListener("keydown", handleKeys);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
