/* ==========================================================================
   Sponge — the proving shelf.

   Twelve spoonfuls set from twelve starters. Some cultures are alive and some
   are spent, and set side by side you cannot tell which by looking. You can
   PROVE a jar — spend a spoonful, learn the truth, and catch a flat one cheap —
   or COMMIT it blind and stake a sack on a guess. The shelf is that one choice,
   a dozen times, with the tally kept honestly.
   ========================================================================== */

(function () {
  "use strict";

  var COUNT = 12;

  // A shelf of starters. Each carries a hidden truth: is the culture alive?
  var STARTERS = [
    "rye mother", "white levain", "spelt barm", "poolish", "biga",
    "sourdough", "beer barm", "hop yeast", "wild ferment", "sponge no. 9",
    "old dough", "desem"
  ];

  // Each jar: { name, alive, state } where state is one of
  // "set" | "domed" | "flat" | "committed".
  var jars = [];
  var cursor = 0;   // the jar the keyboard is resting on

  var el = {};
  ["board-grid", "gauge-proved", "gauge-caught", "gauge-blind", "gauge-fill",
    "board-verdict", "prove-all", "commit-all", "reset-board"]
    .forEach(function (id) { el[id] = document.getElementById(id); });

  // --- Persistence -------------------------------------------------------
  // The shelf as you have worked it — which jars proved, which you committed
  // blind — is kept in the browser and nowhere else, so it is still there when
  // you come back. A fresh batch clears it.
  var STORAGE_KEY = "proof:sponge:shelf:v1";

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cursor: cursor, jars: jars }));
    } catch (e) { /* private mode or full quota — the shelf still works */ }
  }

  function restore() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return false; }
    if (!saved || !Array.isArray(saved.jars) || saved.jars.length !== COUNT) return false;
    var ok = saved.jars.every(function (j) {
      return j && typeof j.name === "string" && typeof j.alive === "boolean" &&
        ["set", "domed", "flat", "committed"].indexOf(j.state) !== -1;
    });
    if (!ok) return false;
    jars = saved.jars;
    cursor = (typeof saved.cursor === "number" && saved.cursor >= 0 &&
      saved.cursor < COUNT) ? saved.cursor : 0;
    return true;
  }

  // --- Seeding -----------------------------------------------------------
  // A fresh batch: shuffle the starters, and let a handful come up flat. The
  // number of dead cultures wanders a little so no two batches read the same.
  function seed() {
    var order = STARTERS.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    var dead = 3 + Math.floor(Math.random() * 3); // 3–5 flat cultures
    var aliveFlags = [];
    for (var k = 0; k < COUNT; k++) aliveFlags.push(k >= dead);
    for (var m = aliveFlags.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var s = aliveFlags[m]; aliveFlags[m] = aliveFlags[n]; aliveFlags[n] = s;
    }
    jars = [];
    for (var q = 0; q < COUNT; q++) {
      jars.push({ name: order[q % order.length], alive: aliveFlags[q], state: "set" });
    }
  }

  // --- Building the shelf -------------------------------------------------
  function build() {
    el["board-grid"].textContent = "";
    jars.forEach(function (jar, i) {
      var card = document.createElement("button");
      card.className = "jar";
      card.type = "button";
      card.setAttribute("role", "listitem");
      card.dataset.i = String(i);

      var top = document.createElement("div");
      top.className = "jar-top";
      var name = document.createElement("span");
      name.className = "jar-name";
      name.textContent = jar.name;
      var pip = document.createElement("span");
      pip.className = "jar-pip";
      top.appendChild(name);
      top.appendChild(pip);

      var glass = document.createElement("div");
      glass.className = "jar-glass";
      var dome = document.createElement("div");
      dome.className = "jar-dome";
      glass.appendChild(dome);

      var st = document.createElement("span");
      st.className = "jar-state";

      card.appendChild(top);
      card.appendChild(glass);
      card.appendChild(st);
      el["board-grid"].appendChild(card);
    });
    paint();
  }

  var STATE_LABEL = {
    set: "Set — unproved",
    domed: "Domed — alive",
    flat: "Flat — spent",
    committed: "Committed blind"
  };

  function paint() {
    var cards = el["board-grid"].children;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i], jar = jars[i];
      card.classList.remove("is-domed", "is-flat", "is-committed", "is-cursor");
      if (jar.state === "domed") card.classList.add("is-domed");
      else if (jar.state === "flat") card.classList.add("is-flat");
      else if (jar.state === "committed") card.classList.add("is-committed");
      card.querySelector(".jar-state").textContent = STATE_LABEL[jar.state];
      if (i === cursor) card.classList.add("is-cursor");
    }
    renderGauge();
    save();
  }

  // --- The tally ----------------------------------------------------------
  function counts() {
    var proved = 0, caught = 0, blind = 0, blindBad = 0, set = 0;
    jars.forEach(function (j) {
      if (j.state === "domed" || j.state === "flat") proved++;
      if (j.state === "flat") caught++;
      if (j.state === "committed") { blind++; if (!j.alive) blindBad++; }
      if (j.state === "set") set++;
    });
    return { proved: proved, caught: caught, blind: blind, blindBad: blindBad, set: set };
  }

  function renderGauge() {
    var c = counts();
    el["gauge-proved"].textContent = String(c.proved);
    el["gauge-caught"].textContent = String(c.caught);
    el["gauge-blind"].textContent = String(c.blind);
    el["gauge-fill"].style.width = (100 * c.proved / COUNT).toFixed(1) + "%";
    renderVerdict(c);
  }

  function renderVerdict(c) {
    var v = el["board-verdict"], state = "idle", text;
    if (c.set === COUNT) {
      state = "idle";
      text = "Twelve spoonfuls, set and waiting. Prove them before you stake a " +
        "sack on any of them.";
    } else if (c.blindBad > 0) {
      state = "blind";
      text = "You committed " + c.blind + " " + (c.blind === 1 ? "sack" : "sacks") +
        " blind — and " + c.blindBad + " of those " +
        (c.blindBad === 1 ? "culture was" : "cultures were") + " already dead. " +
        "That is a morning's flour gone to answer a question a spoonful would have.";
    } else if (c.set === 0 && c.blind === 0) {
      state = "good";
      text = "The whole shelf proved. You caught " + c.caught + " flat " +
        (c.caught === 1 ? "culture" : "cultures") + " on a spoonful each and " +
        "know exactly which sacks are worth mixing. Nothing staked blind.";
    } else if (c.blind > 0) {
      state = "blind";
      text = "You proved " + c.proved + " and committed " + c.blind +
        " blind. The blind ones happened to hold — this time. A sponge you skip " +
        "is a bet you did not know you were placing.";
    } else {
      state = "good";
      text = "Proved " + c.proved + " of 12, " + c.caught + " flat caught. Keep " +
        "proving — every spoonful spent here is a sack you will not lose later.";
    }
    v.setAttribute("data-state", state);
    v.textContent = text;
  }

  // --- Actions ------------------------------------------------------------
  function prove(i) {
    var jar = jars[i];
    if (jar.state !== "set") return;
    jar.state = jar.alive ? "domed" : "flat";
    paint();
  }

  function commit(i) {
    var jar = jars[i];
    if (jar.state !== "set") return;
    jar.state = "committed";
    paint();
  }

  function proveAll() {
    jars.forEach(function (j) {
      if (j.state === "set") j.state = j.alive ? "domed" : "flat";
    });
    paint();
  }

  function commitRest() {
    jars.forEach(function (j) { if (j.state === "set") j.state = "committed"; });
    paint();
  }

  function reset() {
    seed();
    build();
  }

  // --- Events -------------------------------------------------------------
  el["board-grid"].addEventListener("click", function (e) {
    var card = e.target.closest(".jar");
    if (!card) return;
    cursor = parseInt(card.dataset.i, 10);
    prove(cursor);
  });

  el["prove-all"].addEventListener("click", proveAll);
  el["commit-all"].addEventListener("click", commitRest);
  el["reset-board"].addEventListener("click", reset);

  // --- Keyboard ----------------------------------------------------------
  // The whole shelf is workable from the keys: J/K walk the jars, P proves the
  // one you are on, C commits it blind, A proves the lot, R sets a fresh batch.
  function moveCursor(delta) {
    cursor = (cursor + delta + jars.length) % jars.length;
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
      case "p": case "P": case "Enter": prove(cursor); break;
      case "c": case "C": commit(cursor); break;
      case "a": case "A": proveAll(); break;
      case "r": case "R": reset(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // --- Go -----------------------------------------------------------------
  if (!restore()) seed();
  build();
})();
