(function () {
  "use strict";

  const FOCUSES = [
    {
      id: "paying",
      label: "Get to 50 paying teams",
      color: "#b07c2c",
      stated: 35,
    },
    {
      id: "onboarding",
      label: "Cut onboarding under 10 minutes",
      color: "#3f6c54",
      stated: 25,
    },
    {
      id: "analytics",
      label: "Ship the analytics layer",
      color: "#7a4f8a",
      stated: 25,
    },
    {
      id: "support",
      label: "Stop the support fires",
      color: "#a23a28",
      stated: 15,
    },
  ];

  const LEDGER = [
    { id: "l1", title: "Pricing page rewrite + 3 case studies", days: 6, tag: "paying" },
    { id: "l2", title: "Outbound to 80 ICP teams (warm intros)", days: 5, tag: "paying" },
    { id: "l3", title: "First-run wizard, end-to-end", days: 4, tag: "onboarding" },
    { id: "l4", title: "Sample workspace seeded for new accounts", days: 2, tag: "onboarding" },
    { id: "l5", title: "Events pipeline + warehouse sync", days: 8, tag: "analytics" },
    { id: "l6", title: "Cohort report v1 (internal)", days: 3, tag: "analytics" },
    { id: "l7", title: "Incident: SSO provider outage (rewrite)", days: 4, tag: "support" },
    { id: "l8", title: "Three-day on-call backlog cleanup", days: 3, tag: "support" },
    { id: "l9", title: "AI summaries for activity feed", days: 5, tag: "unfit" },
    { id: "l10", title: "Mobile beta — Android prep", days: 4, tag: "unfit" },
    { id: "l11", title: "Migrate billing to Stripe Connect", days: 6, tag: "unfit" },
    { id: "l12", title: "Q3 roadmap doc + offsite prep", days: 2, tag: "unfit" },
  ];

  const ALL_TAGS = FOCUSES.map((f) => f.id).concat(["unfit"]);
  const TAG_LABEL = Object.fromEntries(FOCUSES.map((f) => [f.id, f.label]));
  TAG_LABEL.unfit = "Landed nowhere";
  const TAG_COLOR = Object.fromEntries(FOCUSES.map((f) => [f.id, f.color]));
  TAG_COLOR.unfit = "#7a6a55";

  const state = {
    weights: Object.fromEntries(FOCUSES.map((f) => [f.id, f.stated])),
    ledger: LEDGER.map((it) => ({ ...it })),
  };

  function totalStated() {
    return Object.values(state.weights).reduce((a, b) => a + b, 0);
  }

  function actualWeights() {
    const totals = Object.fromEntries(FOCUSES.map((f) => [f.id, 0]));
    let unfit = 0;
    let counted = 0;
    state.ledger.forEach((it) => {
      if (it.tag === "unfit") {
        unfit += it.days;
      } else if (totals[it.tag] !== undefined) {
        totals[it.tag] += it.days;
        counted += it.days;
      }
    });
    const out = {};
    FOCUSES.forEach((f) => {
      out[f.id] = counted > 0 ? (totals[f.id] / counted) * 100 : 0;
    });
    return { out, unfit };
  }

  function driftAngle() {
    const total = totalStated() || 1;
    const stated = FOCUSES.map((f) => state.weights[f.id] / total);
    const { out } = actualWeights();
    const actual = FOCUSES.map((f) => out[f.id] / 100);
    let sumSq = 0;
    for (let i = 0; i < stated.length; i += 1) {
      const d = stated[i] - actual[i];
      sumSq += d * d;
    }
    const rmse = Math.sqrt(sumSq / stated.length);
    return Math.min(28, rmse * 90);
  }

  function renderFocuses() {
    const list = document.getElementById("focuses-list");
    list.innerHTML = "";
    FOCUSES.forEach((f) => {
      const li = document.createElement("li");
      li.className = "focus-row";
      const sw = document.createElement("span");
      sw.className = "focus-swatch";
      sw.style.background = f.color;

      const labelWrap = document.createElement("div");
      const label = document.createElement("span");
      label.className = "focus-label";
      label.textContent = f.label;
      labelWrap.appendChild(label);

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "60";
      slider.step = "1";
      slider.value = String(state.weights[f.id]);
      slider.className = "focus-slider";
      slider.setAttribute("aria-label", `Stated weight for ${f.label}`);
      slider.addEventListener("input", () => {
        state.weights[f.id] = Number(slider.value);
        percent.textContent = `${state.weights[f.id]}%`;
        renderTotal();
        renderGauge();
        renderActuals();
      });

      labelWrap.appendChild(slider);

      const percent = document.createElement("span");
      percent.className = "focus-percent";
      percent.textContent = `${state.weights[f.id]}%`;

      li.appendChild(sw);
      li.appendChild(labelWrap);
      li.appendChild(percent);
      list.appendChild(li);
    });
  }

  function renderTotal() {
    const total = totalStated();
    const el = document.getElementById("focuses-total");
    el.textContent =
      total === 100
        ? "Weights sum to 100%."
        : `Weights sum to ${total}% — proportions still hold.`;
    el.classList.toggle("off", total !== 100);
  }

  function renderLedger() {
    const list = document.getElementById("ledger-list");
    list.innerHTML = "";
    state.ledger.forEach((item) => {
      const li = document.createElement("li");
      li.className = "ledger-item";

      const left = document.createElement("div");
      const title = document.createElement("div");
      title.className = "ledger-title";
      title.textContent = item.title;
      const meta = document.createElement("div");
      meta.className = "ledger-meta";
      meta.textContent = `${item.days} eng-days`;
      left.appendChild(title);
      left.appendChild(meta);

      const tag = document.createElement("button");
      tag.type = "button";
      tag.className = "ledger-tag";
      tag.setAttribute("aria-label", `Retag ${item.title}`);
      renderTagButton(tag, item.tag);
      tag.addEventListener("click", () => {
        const cur = ALL_TAGS.indexOf(item.tag);
        const next = ALL_TAGS[(cur + 1) % ALL_TAGS.length];
        item.tag = next;
        renderTagButton(tag, next);
        renderActuals();
        renderGauge();
      });

      li.appendChild(left);
      li.appendChild(tag);
      list.appendChild(li);
    });
  }

  function renderTagButton(btn, tagId) {
    btn.innerHTML = "";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = TAG_COLOR[tagId];
    btn.appendChild(swatch);
    btn.appendChild(document.createTextNode(tagShortLabel(tagId)));
  }

  function tagShortLabel(tagId) {
    const map = {
      paying: "Paying teams",
      onboarding: "Onboarding",
      analytics: "Analytics",
      support: "Support",
      unfit: "Landed nowhere",
    };
    return map[tagId] || tagId;
  }

  function renderActuals() {
    const { out, unfit } = actualWeights();
    const list = document.getElementById("actuals-list");
    list.innerHTML = "";
    FOCUSES.forEach((f) => {
      const row = document.createElement("li");
      row.className = "actual-row";

      const sw = document.createElement("span");
      sw.className = "focus-swatch";
      sw.style.background = f.color;

      const wrap = document.createElement("div");
      const label = document.createElement("span");
      label.className = "actual-label";
      label.textContent = tagShortLabel(f.id);
      const bar = document.createElement("div");
      bar.className = "actual-bar";
      const fill = document.createElement("span");
      fill.className = "actual-bar-fill";
      fill.style.width = `${out[f.id]}%`;
      fill.style.background = f.color;
      bar.appendChild(fill);
      wrap.appendChild(label);
      wrap.appendChild(bar);

      const pct = document.createElement("span");
      pct.className = "actual-percent";
      pct.textContent = `${Math.round(out[f.id])}%`;

      row.appendChild(sw);
      row.appendChild(wrap);
      row.appendChild(pct);
      list.appendChild(row);
    });

    const unfitItems = state.ledger.filter((it) => it.tag === "unfit").length;
    const unfitCount = document.getElementById("unfit-count");
    unfitCount.textContent =
      unfitItems === 1 ? "1 item" : `${unfitItems} items`;
    unfitCount.classList.toggle("warn", unfitItems >= 4);
  }

  function renderGauge() {
    const angle = driftAngle();
    const cord = document.getElementById("gauge-cord");
    cord.style.transform = `translateX(-50%) rotate(${angle.toFixed(2)}deg)`;
    const angleEl = document.getElementById("gauge-angle");
    angleEl.textContent = `${angle.toFixed(1)}°`;

    const foot = document.getElementById("gauge-foot");
    if (angle < 4) {
      foot.innerHTML = "Aligned. Keep building.";
    } else if (angle < 10) {
      foot.innerHTML = "Some lean. Worth a check-in this week.";
    } else if (angle < 18) {
      foot.innerHTML = "<strong>Real drift.</strong> Re-aim — or restate.";
    } else {
      foot.innerHTML = "<strong>Off true.</strong> The cycle has become a different cycle.";
    }
  }

  function handleAccess() {
    const form = document.getElementById("access-form");
    const foot = document.getElementById("access-foot");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("email");
      const email = (input.value || "").trim();
      if (!email) return;
      foot.textContent = "Held. We'll email you when the cohort opens.";
      input.value = "";
      input.blur();
    });
  }

  function init() {
    renderFocuses();
    renderTotal();
    renderLedger();
    renderActuals();
    renderGauge();
    handleAccess();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
