(function () {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Seeded sparks: one working novelist, mid-second-draft.
  // 14 sparks across a single week. Verdicts reflect a Sunday already sifted.
  const SEED = [
    { day: 0, flavor: "line",   text: "She drives past the house twice before she lets herself stop.",                                 verdict: "kindling" },
    { day: 0, flavor: "hunch",  text: "Chapter 7 doesn't end on the porch — it ends on the porch *light*.",                            verdict: "kindling" },
    { day: 1, flavor: "image",  text: "A red kettle on a windowsill. Steam against winter glass. No one in the kitchen.",              verdict: "spark" },
    { day: 1, flavor: "line",   text: "He keeps the receipts in alphabetical order, by the name of the person he ate with.",          verdict: "ash" },
    { day: 2, flavor: "hunch",  text: "The mother's name has been wrong since chapter 2. It's been Margaret all along.",               verdict: "ember" },
    { day: 2, flavor: "line",   text: "There is a kind of waiting that becomes the room itself.",                                      verdict: "kindling" },
    { day: 3, flavor: "image",  text: "Wet asphalt under sodium streetlight — orange where it should be black.",                       verdict: "ash" },
    { day: 3, flavor: "line",   text: "A funeral with too much parking.",                                                              verdict: "spark" },
    { day: 4, flavor: "hunch",  text: "Cut the sister entirely from the middle third. She's louder by being missed.",                  verdict: "kindling" },
    { day: 4, flavor: "image",  text: "Three folding chairs in a row, two of them facing the wrong wall.",                             verdict: "ash" },
    { day: 5, flavor: "line",   text: "I told him the truth. It went exactly as well as the truth ever goes.",                         verdict: "spark" },
    { day: 5, flavor: "hunch",  text: "Maybe the brother is the one who narrates. Try one chapter and see if the voice holds.",        verdict: "kindling" },
    { day: 6, flavor: "line",   text: "Forgiveness, she decided, was a verb she'd misconjugated her whole life.",                      verdict: "spark" },
    { day: 6, flavor: "image",  text: "An empty pool in winter, full of leaves up to where the water used to stop.",                   verdict: "ash" },
  ];

  // Default placeholder text used when a fresh spark is captured.
  const NEW_SPARK_PROMPTS = [
    "A note you'd write to yourself if no one was reading.",
    "The line you almost said out loud at dinner.",
    "Something you saw on the way here.",
    "A question you don't want answered yet.",
    "The smallest true sentence you can manage.",
  ];

  // State.
  let sparks = clone(SEED);
  let selectedIdx = 0;

  // DOM.
  const dayAxisEl   = document.getElementById("day-axis");
  const stageEl     = document.getElementById("spark-stage");
  const totalsEl    = document.getElementById("log-totals");
  const selectedTextEl = document.getElementById("selected-text");
  const selectedNumEl  = document.getElementById("selected-num");
  const selectedDayEl  = document.getElementById("selected-day");
  const flavorPicker   = document.getElementById("flavor-picker");
  const verdictPicker  = document.getElementById("verdict-picker");
  const addBtn         = document.getElementById("add-spark");
  const resetBtn       = document.getElementById("reset-log");
  const joinForm       = document.getElementById("join-form");
  const joinFoot       = document.getElementById("join-foot");

  // Initial paint.
  renderAxis();
  render();

  // Picker events.
  flavorPicker.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-flavor]");
    if (!btn) return;
    sparks[selectedIdx].flavor = btn.dataset.flavor;
    render();
  });

  verdictPicker.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-verdict]");
    if (!btn) return;
    sparks[selectedIdx].verdict = btn.dataset.verdict;
    render();
  });

  // Add a new spark — pick the lightest-loaded day, prepend a prompt.
  addBtn.addEventListener("click", () => {
    const dayCounts = Array(7).fill(0);
    for (const s of sparks) dayCounts[s.day]++;
    const day = dayCounts.indexOf(Math.min(...dayCounts));
    const prompt = NEW_SPARK_PROMPTS[sparks.length % NEW_SPARK_PROMPTS.length];
    sparks.push({ day, flavor: "line", text: prompt, verdict: "spark" });
    selectedIdx = sparks.length - 1;
    render();
  });

  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sparks = clone(SEED);
    selectedIdx = 0;
    render();
  });

  // Keyboard shortcuts. Only fire while the spark log is roughly in view
  // and the user isn't typing into a field.
  const FLAVOR_KEYS  = { "1": "line", "2": "image", "3": "hunch" };
  const VERDICT_KEYS = { "s": "spark", "k": "kindling", "e": "ember", "a": "ash" };
  const logSectionEl = document.getElementById("log");

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (!isLogInView()) return;

    const k = e.key.toLowerCase();
    if (k === "h" || k === "arrowleft") {
      selectedIdx = (selectedIdx - 1 + sparks.length) % sparks.length;
      render();
      e.preventDefault();
    } else if (k === "l" || k === "arrowright") {
      selectedIdx = (selectedIdx + 1) % sparks.length;
      render();
      e.preventDefault();
    } else if (k === "n") {
      addBtn.click();
      e.preventDefault();
    } else if (k === "r") {
      sparks = clone(SEED);
      selectedIdx = 0;
      render();
      e.preventDefault();
    } else if (FLAVOR_KEYS[k]) {
      sparks[selectedIdx].flavor = FLAVOR_KEYS[k];
      render();
      e.preventDefault();
    } else if (VERDICT_KEYS[k]) {
      sparks[selectedIdx].verdict = VERDICT_KEYS[k];
      render();
      e.preventDefault();
    }
  });

  function isLogInView() {
    if (!logSectionEl) return false;
    const r = logSectionEl.getBoundingClientRect();
    return r.bottom > 80 && r.top < window.innerHeight - 80;
  }

  // Email capture — purely client-side acknowledgement.
  joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = (joinForm.querySelector("#email") || {}).value || "";
    if (!email.includes("@")) return;
    joinForm.style.display = "none";
    joinFoot.textContent = `Held. We'll write to ${email} when the first beta opens.`;
    joinFoot.style.color = "var(--kindling)";
  });

  // ---------- render ----------

  function renderAxis() {
    dayAxisEl.innerHTML = "";
    for (const d of DAYS) {
      const el = document.createElement("div");
      el.className = "day-label";
      el.textContent = d;
      dayAxisEl.appendChild(el);
    }
  }

  function render() {
    // Stage: one column per day, sparks stacked top→bottom in capture order.
    stageEl.innerHTML = "";
    const cols = DAYS.map(() => {
      const c = document.createElement("div");
      c.className = "day-col";
      return c;
    });
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `spark-dot verdict-${s.verdict} size-${sizeFor(s.verdict)}`;
      dot.dataset.flavor = s.flavor[0].toUpperCase();
      dot.dataset.idx = String(i);
      dot.setAttribute("aria-label", `Spark ${i + 1} on ${DAYS[s.day]} — ${s.flavor}, ${s.verdict}`);
      if (i === selectedIdx) dot.classList.add("selected");
      dot.addEventListener("click", () => {
        selectedIdx = i;
        render();
      });
      cols[s.day].appendChild(dot);
    }
    for (const c of cols) stageEl.appendChild(c);

    // Totals.
    const counts = { spark: 0, kindling: 0, ember: 0, ash: 0 };
    for (const s of sparks) counts[s.verdict]++;
    totalsEl.innerHTML = "";
    for (const [k, v] of Object.entries(counts)) {
      const pill = document.createElement("span");
      pill.className = "total-pill";
      const sw = document.createElement("span");
      sw.className = `swatch swatch-${k}`;
      sw.style.cssText = swatchStyle(k);
      const label = document.createElement("span");
      label.textContent = `${v} ${k}`;
      pill.appendChild(sw);
      pill.appendChild(label);
      totalsEl.appendChild(pill);
    }

    // Detail.
    const s = sparks[selectedIdx];
    selectedTextEl.textContent = `"${s.text}"`;
    selectedNumEl.textContent  = String(selectedIdx + 1);
    selectedDayEl.textContent  = DAYS[s.day];

    for (const b of flavorPicker.querySelectorAll("button")) {
      b.classList.toggle("active", b.dataset.flavor === s.flavor);
    }
    for (const b of verdictPicker.querySelectorAll("button")) {
      b.classList.toggle("active", b.dataset.verdict === s.verdict);
    }
  }

  function sizeFor(verdict) {
    if (verdict === "ember") return "l";
    if (verdict === "ash")   return "s";
    return "m";
  }

  function swatchStyle(verdict) {
    if (verdict === "ash") {
      return "background:transparent;border:2px dashed var(--ash);";
    }
    const map = {
      spark: "var(--spark)",
      kindling: "var(--kindling)",
      ember: "var(--ember)",
    };
    return `background:${map[verdict]};box-shadow:0 0 8px ${map[verdict]}33;`;
  }

  function clone(arr) {
    return arr.map((x) => ({ ...x }));
  }
})();
