/* Page behaviour: key feel, sound switch, mobile links, the scrolling plate. */
(() => {
  "use strict";

  const sound = window.QGSound;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---------------------------------------------------- key feel
  // Pointer down bottoms the key out and clicks; pointer up lets it rise and clicks again.
  const down = new Set();
  function keyDown(el) {
    if (!el || el.disabled || down.has(el)) return;
    down.add(el); el.classList.add("is-down");
    sound.keyDown(el.classList.contains("key--run") ? 1.2 : 1);
  }
  function keyUp(el) {
    if (!down.has(el)) return;
    down.delete(el); el.classList.remove("is-down");
    sound.keyUp();
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const k = e.target.closest && e.target.closest("[data-key]");
    if (k) keyDown(k);
  });
  const releaseAll = () => [...down].forEach(keyUp);
  window.addEventListener("pointerup", releaseAll);
  window.addEventListener("pointercancel", releaseAll);
  window.addEventListener("blur", releaseAll);
  document.addEventListener("keydown", (e) => {
    if (e.repeat || (e.key !== " " && e.key !== "Enter")) return;
    const k = document.activeElement;
    if (k && k.matches && k.matches("[data-key]")) keyDown(k);
  });
  document.addEventListener("keyup", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    const k = document.activeElement;
    if (k && down.has(k)) keyUp(k);
  });

  // a key pressed from the keyboard shortcuts
  window.QG = {
    press(el) {
      if (!el) return;
      keyDown(el);
      setTimeout(() => keyUp(el), 120);
    },
  };

  // ---------------------------------------------------- sound switch
  const sw = document.getElementById("sound-switch");
  if (sw) {
    sw.setAttribute("aria-checked", String(sound.enabled));
    sw.addEventListener("click", () => {
      const on = sw.getAttribute("aria-checked") !== "true";
      if (!on) sound.toggle(false);
      sound.setEnabled(on);
      sw.setAttribute("aria-checked", String(on));
    });
  }

  // ---------------------------------------------------- mobile links
  const topbar = document.querySelector(".topbar");
  const toggle = document.getElementById("links-toggle");
  if (toggle && topbar) {
    const set = (open) => { topbar.classList.toggle("links-open", open); toggle.setAttribute("aria-expanded", String(open)); };
    toggle.addEventListener("click", () => set(!topbar.classList.contains("links-open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    document.addEventListener("pointerdown", (e) => { if (!topbar.contains(e.target)) set(false); });
  }

  // ---------------------------------------------------- the plate follows the states
  const states = [...document.querySelectorAll(".state")];
  const imgs = [...document.querySelectorAll(".plate-img")];
  const flash = document.querySelector(".plate-flash");
  const pShots = document.getElementById("plate-shots");
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  let current = 0;

  // ---------------------------------------------------- shots against quality
  // Real measurements: the same photo, the simulator, 8x8 blocks.
  const DATA = [[10, 7.6], [50, 10.2], [200, 17.2], [1000, 25.3], [4000, 31.3], [16000, 37.2]];
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("chart");
  let dots = [], chartLab = null;
  if (svg) {
    const W = 560, H = 168, L = 40, R = 14, T = 16, B = 30;
    const lo = Math.log10(6), hi = Math.log10(24000);
    const X = (s) => L + (Math.log10(s) - lo) / (hi - lo) * (W - L - R);
    const Y = (d) => T + (1 - (d - 5) / 35) * (H - T - B);
    const el = (name, attrs, text) => {
      const n = document.createElementNS(NS, name);
      Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
      if (text) n.textContent = text;
      svg.appendChild(n);
      return n;
    };
    [10, 20, 30, 40].forEach((d) => {
      el("line", { class: "grid", x1: L, x2: W - R, y1: Y(d), y2: Y(d) });
      el("text", { class: "axis", x: L - 8, y: Y(d) + 4, "text-anchor": "end" }, d === 40 ? "40 dB" : String(d));
    });
    [[10, "10"], [100, "100"], [1000, "1 000"], [10000, "10 000"]].forEach(([s, t]) => {
      el("line", { class: "grid", x1: X(s), x2: X(s), y1: T, y2: H - B });
      el("text", { class: "axis", x: X(s), y: H - 8, "text-anchor": "middle" }, t);
    });
    // ten decibels per tenfold shots: what 1/sqrt(S) predicts
    const refY = (s) => 25.3 + 10 * (Math.log10(s) - 3);
    el("path", { class: "ref", d: `M${X(100)} ${Y(refY(100))} L${X(10000)} ${Y(refY(10000))}` });
    el("text", { class: "ref-lab", x: X(2200), y: Y(refY(2200)) + 30 }, "dashed: +10 dB per ×10 shots");
    el("path", { class: "line", d: "M" + DATA.map(([s, d]) => `${X(s).toFixed(1)} ${Y(d).toFixed(1)}`).join(" L") });
    dots = DATA.map(([s, d]) => {
      const dot = el("circle", { class: "dot", cx: X(s), cy: Y(d), r: 5 });
      dot.dataset.shots = s;
      const hit = el("circle", { class: "hit", cx: X(s), cy: Y(d), r: 15 });
      hit.appendChild(document.createElementNS(NS, "title")).textContent = `${fmt(s)} shots, ${d.toFixed(1)} dB`;
      hit.addEventListener("click", () => { const i = states.findIndex((st) => st.dataset.shots === String(s)); if (i >= 0) activate(i); });
      return dot;
    });
    chartLab = el("text", { class: "lab", x: 0, y: 0 });
  }
  function updateChart(shots, db) {
    if (!svg) return;
    dots.forEach((d) => {
      const on = d.dataset.shots === String(shots);
      d.classList.toggle("on", on);
      d.setAttribute("r", on ? 8 : 5);
      if (on) {
        const cx = Number(d.getAttribute("cx")), cy = Number(d.getAttribute("cy"));
        chartLab.textContent = `${fmt(shots)} shots`;
        const left = cx > 150;
        chartLab.setAttribute("text-anchor", left ? "end" : "start");
        chartLab.setAttribute("x", left ? cx - 14 : cx + 6);
        chartLab.setAttribute("y", cy - (left ? 12 : 22));
        d.parentNode.appendChild(d);
      }
    });
  }

  function activate(i, quiet) {
    const li = states[i];
    if (!li) return;
    states.forEach((s, j) => s.classList.toggle("is-on", j === i));
    imgs.forEach((im) => im.classList.toggle("is-on", im.dataset.shots === li.dataset.shots));
    pShots.textContent = fmt(li.dataset.shots);
    rows.forEach((r, j) => { r.classList.toggle("is-on", j === i); r.setAttribute("aria-pressed", String(j === i)); });
    updateChart(li.dataset.shots, li.dataset.db);
    if (i !== current && !quiet) {
      if (flash && !reduce.matches) { flash.classList.remove("fire"); void flash.offsetWidth; flash.classList.add("fire"); }
      sound.detent(i, states.length);
    }
    current = i;
  }
  const stage = document.getElementById("stage");
  const rows = [...document.querySelectorAll(".index .key")];
  function stageIndex() {
    const r = stage.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const prog = span > 0 ? Math.min(0.999, Math.max(0, -r.top / span)) : 0;
    return Math.min(states.length - 1, Math.floor(prog * states.length));
  }
  if (stage && states.length) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; activate(stageIndex()); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    rows.forEach((row) => row.addEventListener("click", () => {
      const i = Number(row.dataset.i);
      const r = stage.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const top = window.scrollY + r.top + span * ((i + 0.5) / states.length);
      window.scrollTo({ top, behavior: reduce.matches ? "auto" : "smooth" });
      activate(i);
    }));
  }
  activate(0, true);

  // ---------------------------------------------------- copy the run command
  const copy = document.getElementById("copy-cmd");
  const cmd = document.getElementById("run-cmd");
  if (copy && cmd) {
    copy.addEventListener("click", async () => {
      const label = copy.querySelector("span");
      try { await navigator.clipboard.writeText(cmd.dataset.copy || cmd.textContent.trim()); label.textContent = "Copied"; }
      catch (_) { label.textContent = "Select it"; }
      setTimeout(() => { label.textContent = "Copy"; }, 1500);
    });
  }
})();
