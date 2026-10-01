/* The bench: knob, keys, slide switch, two screens, and the real API. */
(() => {
  "use strict";

  const SHOTS = [50, 100, 200, 500, 1000, 2000, 4000, 8000, 16000];
  const SHOT_LABEL = ["50", "100", "200", "500", "1k", "2k", "4k", "8k", "16k"];
  const STORE = "quantum-grain-v2";
  const ANGLE_MIN = -135, ANGLE_MAX = 135;
  const STEP = (ANGLE_MAX - ANGLE_MIN) / (SHOTS.length - 1);

  const $ = (s) => document.querySelector(s);
  const sound = window.QGSound;
  const before = $("#before"), after = $("#after");
  const bctx = before.getContext("2d"), actx = after.getContext("2d");
  const drop = $("#drop"), fileInput = $("#file-input");
  const runBtn = $("#run"), resetBtn = $("#reset"), sampleBtn = $("#use-sample"), loadBtn = $("#load");
  const knob = $("#knob"), knobBody = knob.querySelector(".knob-body"), scaleSvg = $("#knob-scale");
  const labShots = $("#lab-shots"), labBlock = $("#lab-block");
  const engineSwitch = $("#engine-switch");
  const reading = $("#reading"), sayEl = $("#say");
  const verdict = $("#verdict"), vWord = $("#verdict-word"), vSmall = $("#verdict-small");
  const afterLabel = $("#after-label"), ledBusy = $("#led-busy"), scan = $("#scan"), afterHint = $("#after-hint");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let state = { block: 8, shotsIndex: 4, engine: "simulator" };
  let currentImage = null;
  let busy = false;
  let sayTimer = null;

  try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || "{}")); } catch (_) {}
  if (!(state.shotsIndex >= 0 && state.shotsIndex < SHOTS.length)) state.shotsIndex = 4;
  if (![4, 8, 16].includes(state.block)) state.block = 8;
  if (!["simulator", "atlas"].includes(state.engine)) state.engine = "simulator";
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {} };

  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const qubits = (b) => Math.log2(b * b);
  const say = (t) => { clearTimeout(sayTimer); sayTimer = setTimeout(() => { sayEl.textContent = t; }, 120); };
  const press = (el) => (window.QG && window.QG.press ? window.QG.press(el) : null);

  // ------------------------------------------------ knob scale
  const NS = "http://www.w3.org/2000/svg";
  function polar(r, deg) { const a = (deg - 90) * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; }
  function buildScale() {
    SHOTS.forEach((_, i) => {
      const deg = ANGLE_MIN + i * STEP;
      const [x1, y1] = polar(76, deg), [x2, y2] = polar(88, deg), [tx, ty] = polar(103, deg);
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
      l.setAttribute("class", "tick"); l.dataset.i = i;
      scaleSvg.appendChild(l);
      if (i % 2 === 0) {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("x", tx); t.setAttribute("y", ty); t.textContent = SHOT_LABEL[i]; t.dataset.i = i;
        scaleSvg.appendChild(t);
      }
    });
  }
  buildScale();

  const angleOf = (i) => ANGLE_MIN + i * STEP;
  function paintKnob(deg) { knobBody.style.transform = `rotate(${deg}deg)`; }

  // ------------------------------------------------ rendering state
  function row(k, v, cls, title) {
    v = typeof v === "string" ? v.replace(/(\d)\.(\d)/g, '$1<i class="dp"></i>$2') : v;
    return `<div class="cell"><span class="k">${k}</span><span class="v${cls ? " " + cls : ""}"${title ? ` title="${title}"` : ""}>${v}</span></div>`;
  }

  function classify(db) {
    if (db >= 26) return ["Clean", "keep"];
    if (db >= 16) return ["Grainy", "keep"];
    if (db >= 8) return ["Noisy", "drift"];
    return ["Collapsed", "dead"];
  }

  function setVerdict(word, small, cls) {
    vWord.textContent = word;
    vSmall.textContent = small;
    verdict.className = "lcd v-" + cls;
  }

  function renderIdle() {
    if (state.engine === "atlas") {
      reading.innerHTML = row("Engine", "atlas") + row("Runs on", "tessa-image-v1", "", "tessa-image-v1, real QPU") + row("Shots", fmt(SHOTS[state.shotsIndex]));
    } else {
      reading.innerHTML = row("Block", `${state.block}×${state.block}<span class="unit">px</span>`) + row("Qubits / block", qubits(state.block)) + row("Shots", fmt(SHOTS[state.shotsIndex])) + row("Engine", "simulator");
    }
  }

  function renderResult(s) {
    const [, cls] = classify(s.psnrDb);
    let h = row("Engine", s.engine);
    if (s.engine === "atlas") {
      h += row("Machine", s.machine, "", s.machine) + row("Job", s.jobId, "", s.jobId) + row("Shots", fmt(s.shots)) + row("PSNR", `${s.psnrDb.toFixed(1)}<span class="unit">dB</span>`, cls);
    } else {
      h += row("Qubits / block", s.qubitsPerBlock) + row("Shots / block", fmt(s.shots)) +
        row("Blocks", `${fmt(s.blocksProcessed)}`, "", `${fmt(s.blocksProcessed)} of ${fmt(s.blocksTotal)} blocks`) +
        row("PSNR, mean", `${s.psnrDb.toFixed(1)}<span class="unit">dB</span>`, cls) +
        row("PSNR, worst", `${s.worstPsnrDb.toFixed(1)}<span class="unit">dB</span>`, classify(s.worstPsnrDb)[1]) +
        row("Wall time", `${s.wallTimeS.toFixed(2)}<span class="unit">s</span>`);
    }
    reading.innerHTML = h;
  }

  function sync() {
    document.querySelectorAll("[data-block]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.block) === state.block)));
    engineSwitch.setAttribute("aria-checked", String(state.engine === "atlas"));
    const s = SHOTS[state.shotsIndex];
    labShots.textContent = fmt(s);
    labBlock.textContent = `${state.block}×${state.block} · ${qubits(state.block)} qubits`;
    knob.setAttribute("aria-valuenow", String(state.shotsIndex));
    knob.setAttribute("aria-valuetext", `${fmt(s)} shots`);
    if (!dragging) paintKnob(angleOf(state.shotsIndex));
    scaleSvg.querySelectorAll("[data-i]").forEach((el) => el.classList.toggle("on", Number(el.dataset.i) === state.shotsIndex));
    afterLabel.textContent = "Reconstructed";
    if (!busy) renderIdle();
  }

  // ------------------------------------------------ images
  function drawTo(dataUrl, canvas, ctx) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => { canvas.width = im.width; canvas.height = im.height; ctx.drawImage(im, 0, 0); resolve(im); };
      im.src = dataUrl;
    });
  }
  const readFile = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

  // before a result exists, the reconstructed screen holds a faint ghost of the original
  function placeholder() {
    after.width = before.width; after.height = before.height;
    actx.globalAlpha = 1;
    actx.fillStyle = "#0e0a38";
    actx.fillRect(0, 0, after.width, after.height);
    actx.globalAlpha = 0.13;
    actx.drawImage(before, 0, 0);
    actx.globalAlpha = 1;
    afterHint.classList.remove("is-gone");
  }

  async function setImage(url, announce) {
    currentImage = url;
    await drawTo(url, before, bctx);
    placeholder();
    setVerdict("Ready", "press run", "keep");
    if (announce) say(announce);
  }
  async function fetchSample() {
    setVerdict("Loading", "fetching the sample", "run");
    const res = await fetch("/api/sample");
    const body = await res.json();
    await setImage(body.image, "sample photo loaded");
  }

  // a printer-head reveal of the reconstruction
  function reveal(dataUrl) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        after.width = im.width; after.height = im.height;
        afterHint.classList.add("is-gone");
        if (reduce.matches) { actx.drawImage(im, 0, 0); resolve(); return; }
        const h = im.height, dur = 820, t0 = performance.now();
        scan.style.opacity = "1";
        const glass = after.parentElement;
        (function step(now) {
          const k = Math.min(1, (now - t0) / dur);
          const e = 1 - Math.pow(1 - k, 2.2);
          const y = Math.max(1, Math.round(h * e));
          actx.drawImage(im, 0, 0, im.width, y, 0, 0, im.width, y);
          const box = after.getBoundingClientRect(), gb = glass.getBoundingClientRect();
          scan.style.top = `${box.top - gb.top + box.height * e - 1}px`;
          if (k < 1) requestAnimationFrame(step);
          else { scan.style.opacity = "0"; resolve(); }
        })(t0);
      };
      im.src = dataUrl;
    });
  }

  // ------------------------------------------------ geiger ticks while running
  let tickTimer = null;
  function startTicks(rate) {
    stopTicks();
    const next = () => {
      sound.count(0.9);
      tickTimer = setTimeout(next, Math.max(8, -Math.log(1 - Math.random()) / rate * 1000));
    };
    next();
  }
  function stopTicks() { clearTimeout(tickTimer); tickTimer = null; }

  // ------------------------------------------------ run
  async function run(opts = {}) {
    const quiet = !!opts.auto;
    if (busy) return;
    if (!currentImage) { say("load a photo first"); return; }
    busy = true;
    runBtn.disabled = true; runBtn.classList.add("is-busy"); ledBusy.classList.add("is-on");
    const shots = SHOTS[state.shotsIndex];
    if (state.engine === "atlas") {
      setVerdict("Running", `${fmt(shots)} shots on a real QPU`, "run");
      say(`running the whole photo through tessa-image-v1 on Atlas, ${fmt(shots)} shots, on real quantum hardware. this can take a while`);
      if (!quiet) startTicks(5);
    } else {
      setVerdict("Running", `${qubits(state.block)} qubits × ${fmt(shots)} shots`, "run");
      say(`running ${state.block} by ${state.block} blocks, ${qubits(state.block)} qubits each, ${fmt(shots)} shots, on the simulator`);
      if (!quiet) startTicks(46);
    }
    try {
      const res = await fetch("/api/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: currentImage, block: state.block, shots, engine: state.engine }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "request failed");
      await reveal(body.image);
      stopTicks();
      const [word, cls] = classify(body.stats.psnrDb);
      renderResult(body.stats);
      setVerdict(word, `${body.stats.psnrDb.toFixed(1)} dB`, cls);
      if (!quiet) sound.result(word);
      say(`done: ${word.toLowerCase()}, ${body.stats.psnrDb.toFixed(1)} decibels against the original`);
    } catch (err) {
      stopTicks();
      setVerdict("Error", "see the status line", "dead");
      sound.error();
      say(`error: ${err.message}`);
    } finally {
      busy = false;
      runBtn.disabled = false; runBtn.classList.remove("is-busy"); ledBusy.classList.remove("is-on");
    }
  }

  // ------------------------------------------------ controls
  function setShots(i, { quiet } = {}) {
    i = Math.max(0, Math.min(SHOTS.length - 1, i));
    if (i === state.shotsIndex) return false;
    state.shotsIndex = i;
    sync(); save();
    if (!quiet) sound.detent(i, SHOTS.length);
    return true;
  }
  function setBlock(b) { state.block = b; sync(); save(); say(`block set to ${b} by ${b}, ${qubits(b)} qubits`); }
  function setEngine(e, { announce = true } = {}) {
    if (state.engine === e) return;
    state.engine = e; sync(); save();
    sound.toggle(e === "atlas");
    if (announce) say(`engine set to ${e}`);
  }

  document.querySelectorAll("[data-block]").forEach((b) => b.addEventListener("click", () => setBlock(Number(b.dataset.block))));
  engineSwitch.addEventListener("click", () => setEngine(state.engine === "atlas" ? "simulator" : "atlas"));
  runBtn.addEventListener("click", () => run());
  sampleBtn.addEventListener("click", () => fetchSample().catch(() => say("couldn't reach the server")));
  loadBtn.addEventListener("click", () => fileInput.click());
  resetBtn.addEventListener("click", () => {
    state = { block: 8, shotsIndex: 4, engine: "simulator" };
    save(); sync(); placeholder();
    setVerdict("Ready", "press run", "keep"); say("reset to defaults");
  });

  // knob: drag to turn, snaps to detents
  let dragging = false;
  function pointerDeg(e) {
    const r = knob.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
  }
  knob.addEventListener("pointerdown", (e) => {
    knob.setPointerCapture(e.pointerId);
    dragging = true; knob.classList.add("dragging"); knob.focus({ preventScroll: true });
    onDrag(e);
  });
  function onDrag(e) {
    const deg = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, pointerDeg(e)));
    paintKnob(deg);
    setShots(Math.round((deg - ANGLE_MIN) / STEP));
  }
  knob.addEventListener("pointermove", (e) => { if (dragging) onDrag(e); });
  const endDrag = () => { if (!dragging) return; dragging = false; knob.classList.remove("dragging"); paintKnob(angleOf(state.shotsIndex)); say(`shots set to ${fmt(SHOTS[state.shotsIndex])}`); };
  knob.addEventListener("pointerup", endDrag);
  knob.addEventListener("pointercancel", endDrag);
  knob.addEventListener("keydown", (e) => {
    const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 2, PageDown: -2 }[e.key];
    if (k) { e.preventDefault(); setShots(state.shotsIndex + k); say(`shots set to ${fmt(SHOTS[state.shotsIndex])}`); }
    else if (e.key === "Home") { e.preventDefault(); setShots(0); }
    else if (e.key === "End") { e.preventDefault(); setShots(SHOTS.length - 1); }
  });
  let wheelAcc = 0;
  knob.addEventListener("wheel", (e) => {
    if (document.activeElement !== knob) return;
    e.preventDefault();
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40) { setShots(state.shotsIndex + (wheelAcc < 0 ? 1 : -1)); wheelAcc = 0; }
  }, { passive: false });

  // drop / choose
  fileInput.addEventListener("change", async () => { if (fileInput.files[0]) await setImage(await readFile(fileInput.files[0]), "photo loaded"); });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", async (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) await setImage(await readFile(f), "photo dropped in"); });

  // keyboard shortcuts press the matching key
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    switch (e.key) {
      case "r": case "R": press(runBtn); run(); break;
      case "1": press(document.querySelector('[data-block="4"]')); setBlock(4); break;
      case "2": press(document.querySelector('[data-block="8"]')); setBlock(8); break;
      case "3": press(document.querySelector('[data-block="16"]')); setBlock(16); break;
      case "[": setShots(state.shotsIndex - 1); break;
      case "]": setShots(state.shotsIndex + 1); break;
      case "s": case "S": setEngine("simulator"); break;
      case "a": case "A": setEngine("atlas"); break;
      case "u": case "U": press(sampleBtn); fetchSample().catch(() => say("couldn't reach the server")); break;
      default: return;
    }
  });

  let autoRan = false;
  const chassis = document.querySelector(".chassis");
  if (chassis && "IntersectionObserver" in window) {
    new IntersectionObserver((en, io) => {
      if (en[0].isIntersecting && !autoRan && currentImage && !busy && state.engine === "simulator") {
        autoRan = true; io.disconnect();
        run({ auto: true });
      }
    }, { threshold: 0.3 }).observe(chassis);
  }

  sync();
  setVerdict("Ready", "load a photo to begin", "keep");
  fetchSample().catch(() => { setVerdict("Offline", "start the server: python server.py", "dead"); });
})();
