(() => {
  "use strict";

  const SHOT_PRESETS = [50, 100, 200, 500, 1000, 2000, 4000, 8000, 16000];
  const STORE_KEY = "quantum-grain-v1";

  const $ = (sel) => document.querySelector(sel);
  const before = $("#before"), after = $("#after");
  const beforeCtx = before.getContext("2d"), afterCtx = after.getContext("2d");
  const fileInput = $("#file-input"), drop = $("#drop");
  const runBtn = $("#run"), resetBtn = $("#reset"), sampleBtn = $("#use-sample");
  const shotsInput = $("#in-shots"), labShots = $("#lab-shots"), labBlock = $("#lab-block");
  const readingEl = $("#reading"), sayEl = $("#say");
  const verdictEl = $("#verdict"), verdictWord = $("#verdict-word"), verdictSmall = $("#verdict-small");
  const afterLabel = $("#after-label");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let state = { block: 8, shotsIndex: 4, engine: "simulator" };
  let currentImage = null; // data URL of the "before" image
  let saySoonTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (_) {}
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function fmt(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function say(text) {
    clearTimeout(saySoonTimer);
    saySoonTimer = setTimeout(() => { sayEl.textContent = text; }, 120);
  }

  function qubitsForBlock(block) {
    return Math.log2(block * block);
  }

  function drawDataUrlToCanvas(dataUrl, canvas, ctx, box) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        if (box) {
          ctx.save();
          ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--iron").trim() || "#6b5b9c";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 5]);
          ctx.strokeRect(box[0] + 1, box[1] + 1, box[2] - 2, box[3] - 2);
          ctx.restore();
        }
        resolve();
      };
      img.src = dataUrl;
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function setImage(dataUrl, announce) {
    currentImage = dataUrl;
    await drawDataUrlToCanvas(dataUrl, before, beforeCtx);
    afterCtx.clearRect(0, 0, after.width, after.height);
    after.width = before.width; after.height = before.height;
    setVerdict("Ready", "run it", "keep");
    if (announce) say(announce);
  }

  function setVerdict(word, small, cls) {
    verdictWord.textContent = word;
    verdictSmall.textContent = small;
    verdictEl.className = "verdict v-" + cls;
  }

  function classify(psnrDb) {
    if (psnrDb >= 26) return ["Clean", "keep"];
    if (psnrDb >= 16) return ["Grainy", "keep"];
    if (psnrDb >= 8) return ["Noisy", "drift"];
    return ["Collapsed", "dead"];
  }

  function row(k, v, cls) {
    return `<div class="row"><span class="k">${k}</span><span class="v${cls ? " " + cls : ""}">${v}</span></div>`;
  }

  function renderIdleReading() {
    const qubits = qubitsForBlock(state.block);
    readingEl.innerHTML =
      row("Block", `${state.block}×${state.block} <span class="unit">px</span>`) +
      row("Qubits / block", qubits) +
      row("Shots", fmt(SHOT_PRESETS[state.shotsIndex])) +
      row("Engine", state.engine);
  }

  function renderResultReading(stats) {
    const [, cls] = classify(stats.psnrDb);
    const worstCls = classify(stats.worstPsnrDb)[1];
    let rows =
      row("Engine", stats.engine) +
      row("Qubits / block", stats.qubitsPerBlock) +
      row("Shots / block", fmt(stats.shots)) +
      row("Blocks processed", `${fmt(stats.blocksProcessed)} / ${fmt(stats.blocksTotal)}`) +
      row("PSNR, mean", `${stats.psnrDb.toFixed(1)} <span class="unit">dB</span>`, cls) +
      row("PSNR, worst block", `${stats.worstPsnrDb.toFixed(1)} <span class="unit">dB</span>`, worstCls) +
      row("Wall time", `${stats.wallTimeS.toFixed(2)} <span class="unit">s</span>`);
    readingEl.innerHTML = rows;
  }

  function updateBlockLabel() {
    labBlock.textContent = `${state.block}×${state.block} · ${qubitsForBlock(state.block)} qubits`;
  }
  function updateShotsLabel() {
    labShots.textContent = fmt(SHOT_PRESETS[state.shotsIndex]);
  }

  function syncControls() {
    document.querySelectorAll("[data-block]").forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.block) === state.block));
    });
    document.querySelectorAll("[data-engine]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.engine === state.engine));
    });
    shotsInput.value = String(state.shotsIndex);
    updateBlockLabel();
    updateShotsLabel();
    afterLabel.textContent = state.engine === "atlas" ? "Reconstructed · atlas patch dashed" : "Reconstructed";
    renderIdleReading();
  }

  async function fetchSample() {
    setVerdict("Loading", "fetching sample…", "keep");
    const res = await fetch("/api/sample");
    const body = await res.json();
    await setImage(body.image, "sample image loaded");
  }

  async function run() {
    if (!currentImage) { say("load a photo first"); return; }
    runBtn.disabled = true;
    runBtn.classList.add("busy");
    setVerdict("Running", `${qubitsForBlock(state.block)}q × ${fmt(SHOT_PRESETS[state.shotsIndex])} shots on ${state.engine}…`, "keep");
    say(`running ${state.block} by ${state.block} blocks, ${qubitsForBlock(state.block)} qubits each, ${fmt(SHOT_PRESETS[state.shotsIndex])} shots, on the ${state.engine} engine`);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: currentImage,
          block: state.block,
          shots: SHOT_PRESETS[state.shotsIndex],
          engine: state.engine,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "request failed");

      const box = body.stats.patchBox;
      await drawDataUrlToCanvas(body.image, after, afterCtx, box);
      renderResultReading(body.stats);
      const [word, cls] = classify(body.stats.psnrDb);
      setVerdict(word, `${body.stats.psnrDb.toFixed(1)} dB`, cls);
      say(`done: ${word.toLowerCase()}, ${body.stats.psnrDb.toFixed(1)} decibels, ${body.stats.blocksProcessed} of ${body.stats.blocksTotal} blocks processed on ${state.engine}`);
    } catch (err) {
      setVerdict("Error", "see status line", "dead");
      say(`error: ${err.message}`);
    } finally {
      runBtn.disabled = false;
      runBtn.classList.remove("busy");
    }
  }

  // -- wiring --

  document.querySelectorAll("[data-block]").forEach((b) => {
    b.addEventListener("click", () => {
      state.block = Number(b.dataset.block);
      syncControls(); save();
      say(`block set to ${state.block} by ${state.block}, ${qubitsForBlock(state.block)} qubits`);
    });
  });

  document.querySelectorAll("[data-engine]").forEach((b) => {
    b.addEventListener("click", () => {
      state.engine = b.dataset.engine;
      syncControls(); save();
      say(`engine set to ${state.engine}`);
    });
  });

  shotsInput.addEventListener("input", () => {
    state.shotsIndex = Number(shotsInput.value);
    updateShotsLabel(); renderIdleReading(); save();
  });
  shotsInput.addEventListener("change", () => say(`shots set to ${fmt(SHOT_PRESETS[state.shotsIndex])}`));

  runBtn.addEventListener("click", run);
  sampleBtn.addEventListener("click", () => fetchSample());
  resetBtn.addEventListener("click", () => {
    state = { block: 8, shotsIndex: 4, engine: "simulator" };
    save(); syncControls();
    afterCtx.clearRect(0, 0, after.width, after.height);
    setVerdict("Ready", "run it", "keep");
    say("reset to defaults");
  });

  drop.addEventListener("click", (e) => { e.preventDefault(); fileInput.click(); });
  fileInput.addEventListener("change", async () => {
    if (fileInput.files[0]) await setImage(await readFileAsDataUrl(fileInput.files[0]), "photo loaded");
  });
  ["dragover", "dragenter"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("drag"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("drag"); })
  );
  drop.addEventListener("drop", async (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) await setImage(await readFileAsDataUrl(file), "photo dropped in");
  });

  document.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    switch (e.key) {
      case "r": case "R": run(); break;
      case "1": state.block = 4; syncControls(); save(); say("block set to 4 by 4"); break;
      case "2": state.block = 8; syncControls(); save(); say("block set to 8 by 8"); break;
      case "3": state.block = 16; syncControls(); save(); say("block set to 16 by 16"); break;
      case "[": state.shotsIndex = Math.max(0, state.shotsIndex - 1); syncControls(); save(); say(`shots set to ${fmt(SHOT_PRESETS[state.shotsIndex])}`); break;
      case "]": state.shotsIndex = Math.min(SHOT_PRESETS.length - 1, state.shotsIndex + 1); syncControls(); save(); say(`shots set to ${fmt(SHOT_PRESETS[state.shotsIndex])}`); break;
      case "s": case "S": state.engine = "simulator"; syncControls(); save(); say("engine set to simulator"); break;
      case "a": case "A": state.engine = "atlas"; syncControls(); save(); say("engine set to atlas"); break;
      case "u": case "U": fetchSample(); break;
      default: return;
    }
  });

  load();
  syncControls();
  fetchSample().catch(() => say("couldn't reach the server — run: python server.py"));
})();
