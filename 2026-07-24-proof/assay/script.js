/* ==========================================================================
   Assay — the assay bench.

   Twelve bars, each wearing a fineness stamp. Some are true to their mark and
   some are debased beneath it, and every one looks the part. You can ASSAY a
   bar — cut a draw, spend a few grains, and learn what it really is — or VALUE
   it blind and pay the price its stamp asks. The bench is that one choice, a
   bar at a time, with the tally kept honestly.
   ========================================================================== */

(function () {
  "use strict";

  // Each bar wears a claimed fineness in parts per thousand. A debased bar
  // assays light of its stamp; a sound one assays true to it.
  var BARS = [
    { name: "sterling",     claim: 925 },
    { name: "coin",         claim: 900 },
    { name: "britannia",    claim: 958 },
    { name: "crown gold",   claim: 916 },
    { name: "fine",         claim: 999 },
    { name: "old plate",    claim: 925 },
    { name: "touch mark",   claim: 916 },
    { name: "bench sweeps", claim: 835 },
    { name: "hallmarked",   claim: 925 },
    { name: "guinea",       claim: 916 },
    { name: "scrap melt",   claim: 800 },
    { name: "assay bar",    claim: 999 }
  ];

  var COUNT = BARS.length;

  // Each entry: { name, claim, debased, trueFine, state }
  // state is "unassayed" | "sound" | "debased" | "valued".
  var bars = [];
  var cursor = 0;   // the bar the keyboard is resting on

  var el = {};
  ["board-grid", "gauge-assayed", "gauge-caught", "gauge-blind", "gauge-fill",
    "board-verdict", "assay-all", "value-all", "reset-board"]
    .forEach(function (id) { el[id] = document.getElementById(id); });

  function fine(n) { return "·" + n; }

  // --- Persistence -------------------------------------------------------
  // The lot as you have worked it — bars assayed, bars valued on the stamp — is
  // kept in the browser and nowhere else, so it is still there when you come
  // back. A fresh lot clears it.
  var STORAGE_KEY = "proof:assay:lot:v1";

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cursor: cursor, bars: bars }));
    } catch (e) { /* private mode or full quota — the bench still works */ }
  }

  function restore() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return false; }
    if (!saved || !Array.isArray(saved.bars) || saved.bars.length !== COUNT) return false;
    var ok = saved.bars.every(function (b) {
      return b && typeof b.name === "string" && typeof b.claim === "number" &&
        typeof b.debased === "boolean" && typeof b.trueFine === "number" &&
        ["unassayed", "sound", "debased", "valued"].indexOf(b.state) !== -1;
    });
    if (!ok) return false;
    bars = saved.bars;
    cursor = (typeof saved.cursor === "number" && saved.cursor >= 0 &&
      saved.cursor < COUNT) ? saved.cursor : 0;
    return true;
  }

  // --- Seeding -----------------------------------------------------------
  // A fresh lot: shuffle the bars, debase a handful of them, and light each
  // debased bar by a wandering amount so no two lots read the same.
  function seed() {
    var order = BARS.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    var bad = 3 + Math.floor(Math.random() * 3); // 3–5 debased bars
    var flags = [];
    for (var k = 0; k < COUNT; k++) flags.push(k < bad);
    for (var m = flags.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var s = flags[m]; flags[m] = flags[n]; flags[n] = s;
    }
    bars = [];
    for (var q = 0; q < COUNT; q++) {
      var b = order[q];
      var debased = flags[q];
      var drop = 40 + Math.floor(Math.random() * 80); // light by 40–119
      bars.push({
        name: b.name,
        claim: b.claim,
        debased: debased,
        trueFine: debased ? Math.max(500, b.claim - drop) : b.claim,
        state: "unassayed"
      });
    }
  }

  // --- Building the bench -------------------------------------------------
  function build() {
    el["board-grid"].textContent = "";
    bars.forEach(function (bar, i) {
      var card = document.createElement("button");
      card.className = "bar";
      card.type = "button";
      card.setAttribute("role", "listitem");
      card.dataset.i = String(i);

      var name = document.createElement("div");
      name.className = "bar-name";
      name.textContent = bar.name;

      var ingot = document.createElement("div");
      ingot.className = "bar-ingot";
      var stamp = document.createElement("span");
      stamp.className = "bar-stamp";
      stamp.textContent = fine(bar.claim);
      var claim = document.createElement("span");
      claim.className = "bar-claim";
      claim.textContent = "claimed";
      ingot.appendChild(stamp);
      ingot.appendChild(claim);

      var read = document.createElement("div");
      read.className = "bar-read";

      card.appendChild(name);
      card.appendChild(ingot);
      card.appendChild(read);
      el["board-grid"].appendChild(card);
    });
    paint();
  }

  function paint() {
    var cards = el["board-grid"].children;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i], bar = bars[i];
      var read = card.querySelector(".bar-read");
      card.classList.remove("is-sound", "is-debased", "is-valued", "is-cursor");
      if (i === cursor) card.classList.add("is-cursor");

      if (bar.state === "sound") {
        card.classList.add("is-sound");
        read.textContent = "assays " + fine(bar.trueFine) + " — true";
      } else if (bar.state === "debased") {
        card.classList.add("is-debased");
        read.textContent = "assays " + fine(bar.trueFine) + " — light " +
          (bar.claim - bar.trueFine);
      } else if (bar.state === "valued") {
        card.classList.add("is-valued");
        read.textContent = "valued on the stamp";
      } else {
        read.textContent = "";
      }
    }
    renderGauge();
    save();
  }

  // --- The tally ----------------------------------------------------------
  function counts() {
    var assayed = 0, caught = 0, blind = 0, blindBad = 0, unassayed = 0;
    bars.forEach(function (b) {
      if (b.state === "sound" || b.state === "debased") {
        assayed++; if (b.state === "debased") caught++;
      } else if (b.state === "valued") {
        blind++; if (b.debased) blindBad++;
      } else unassayed++;
    });
    return { assayed: assayed, caught: caught, blind: blind, blindBad: blindBad, unassayed: unassayed };
  }

  function renderGauge() {
    var c = counts();
    el["gauge-assayed"].textContent = String(c.assayed);
    el["gauge-caught"].textContent = String(c.caught);
    el["gauge-blind"].textContent = String(c.blind);
    el["gauge-fill"].style.width = (100 * c.assayed / COUNT).toFixed(1) + "%";
    renderVerdict(c);
  }

  function renderVerdict(c) {
    var v = el["board-verdict"], state = "idle", text;
    if (c.assayed === 0 && c.blind === 0) {
      state = "idle";
      text = "A dozen bars, each with a stamp and a story. Assay the draws " +
        "before you put a price on any of them.";
    } else if (c.blindBad > 0) {
      state = "blind";
      text = "You valued " + c.blind + " " + (c.blind === 1 ? "bar" : "bars") +
        " on the stamp alone — and " + c.blindBad + " of those " +
        (c.blindBad === 1 ? "bar was" : "bars were") + " debased. You paid fine " +
        "for base metal. A few grains would have told you before the money moved.";
    } else if (c.unassayed === 0 && c.blind === 0) {
      state = "good";
      text = "The whole lot assayed. You caught " + c.caught + " debased " +
        (c.caught === 1 ? "bar" : "bars") + " on a draw each and know exactly " +
        "what every bar is worth. Nothing priced on trust.";
    } else if (c.blind > 0) {
      state = "blind";
      text = "You assayed " + c.assayed + " and valued " + c.blind +
        " on the stamp. Those happened to be sound — this lot. A bar you value " +
        "unassayed is a bar you priced on someone else's word.";
    } else {
      state = "good";
      text = "Assayed " + c.assayed + " of 12, " + c.caught + " debased caught. " +
        "Keep cutting draws — the stamp is a promise, and only the assay can " +
        "keep it or break it.";
    }
    v.setAttribute("data-state", state);
    v.textContent = text;
  }

  // --- Actions ------------------------------------------------------------
  function assay(i) {
    var bar = bars[i];
    if (bar.state !== "unassayed") return;
    bar.state = bar.debased ? "debased" : "sound";
    paint();
  }

  function value(i) {
    var bar = bars[i];
    if (bar.state !== "unassayed") return;
    bar.state = "valued";
    paint();
  }

  function assayAll() {
    bars.forEach(function (b) {
      if (b.state === "unassayed") b.state = b.debased ? "debased" : "sound";
    });
    paint();
  }

  function valueRest() {
    bars.forEach(function (b) { if (b.state === "unassayed") b.state = "valued"; });
    paint();
  }

  function reset() {
    seed();
    build();
  }

  // --- Events -------------------------------------------------------------
  el["board-grid"].addEventListener("click", function (e) {
    var card = e.target.closest(".bar");
    if (!card) return;
    cursor = parseInt(card.dataset.i, 10);
    assay(cursor);
  });

  el["assay-all"].addEventListener("click", assayAll);
  el["value-all"].addEventListener("click", valueRest);
  el["reset-board"].addEventListener("click", reset);

  // --- Keyboard ----------------------------------------------------------
  // The whole bench is workable from the keys: J/K walk the bars, P assays the
  // one you are on, C values it blind on the stamp, A assays the lot, R lays
  // out a fresh lot.
  function moveCursor(delta) {
    cursor = (cursor + delta + bars.length) % bars.length;
    paint();
    var card = el["board-grid"].children[cursor];
    if (card && card.focus) card.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var handled = true;
    switch (e.key) {
      case "j": case "J": case "ArrowRight": moveCursor(1); break;
      case "k": case "K": case "ArrowLeft": moveCursor(-1); break;
      case "p": case "P": case "Enter": assay(cursor); break;
      case "c": case "C": value(cursor); break;
      case "a": case "A": assayAll(); break;
      case "r": case "R": reset(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // --- Go -----------------------------------------------------------------
  if (!restore()) seed();
  build();
})();
