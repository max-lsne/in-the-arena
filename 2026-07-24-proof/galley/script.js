/* ==========================================================================
   Galley — the proof sheet.

   Twelve lines pulled from set type. Some carry a compositor's error — a turned
   word, a dropped letter, a doubled sort — and at a glance they all look like
   type. You can READ a line to catch what it hides, or SEND it unread and trust
   it to the press. The sheet is that one choice, a line at a time, with the
   tally kept in the head.
   ========================================================================== */

(function () {
  "use strict";

  // Each line: a clean setting, the flawed setting (typo visible), and the
  // flawed setting marked up for the correction. A line only carries its flaw
  // if this pull seeds it flawed.
  var LINES = [
    { clean: "the compositor sets what he reads",       bad: "the compositor sets waht he reads",       mark: "the compositor sets <mark>waht</mark> he reads" },
    { clean: "a proof pulled is a run saved",           bad: "a proof pulled is a run svaed",           mark: "a proof pulled is a run <mark>svaed</mark>" },
    { clean: "measure the leading twice",               bad: "measure the leadnig twice",               mark: "measure the <mark>leadnig</mark> twice" },
    { clean: "lock the forme before the run",           bad: "lock the the forme before the run",       mark: "lock <mark>the the</mark> forme before the run" },
    { clean: "ink is cheap and errata dear",            bad: "ink is chaep and errata dear",            mark: "ink is <mark>chaep</mark> and errata dear" },
    { clean: "read it cold, not as you set it",         bad: "read it cold, nto as you set it",          mark: "read it cold, <mark>nto</mark> as you set it" },
    { clean: "mind the widows and the orphans",         bad: "mind the widows and the orhpans",          mark: "mind the widows and the <mark>orhpans</mark>" },
    { clean: "every edition begins one sheet",          bad: "every editon begins one sheet",            mark: "every <mark>editon</mark> begins one sheet" },
    { clean: "the press keeps no proofs",               bad: "the press keeps no porofs",                mark: "the press keeps no <mark>porofs</mark>" },
    { clean: "set slow to print it fast",               bad: "set slow to prnit it fast",                mark: "set slow to <mark>prnit</mark> it fast" },
    { clean: "a turned letter hides in plain sight",    bad: "a turned letter hides in plian sight",     mark: "a turned letter hides in <mark>plian</mark> sight" },
    { clean: "the eye repairs what the hand dropped",   bad: "the eye repairs waht the hand dropped",    mark: "the eye repairs <mark>waht</mark> the hand dropped" }
  ];

  var COUNT = LINES.length;

  // Each entry: { data, flawed, state } where state is "unread" | "read" | "sent".
  var lines = [];
  var cursor = 0;   // the line the keyboard is resting on

  var el = {};
  ["board-grid", "gauge-read", "gauge-caught", "gauge-blind", "gauge-fill",
    "board-verdict", "read-all", "send-all", "reset-board"]
    .forEach(function (id) { el[id] = document.getElementById(id); });

  // --- Seeding -----------------------------------------------------------
  // A fresh pull: shuffle the lines and seed a handful of errors into the
  // forme. How many wanders a little, so no two proofs read the same.
  function seed() {
    var order = LINES.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    var flaws = 4 + Math.floor(Math.random() * 3); // 4–6 errors in the forme
    var flags = [];
    for (var k = 0; k < COUNT; k++) flags.push(k < flaws);
    for (var m = flags.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var s = flags[m]; flags[m] = flags[n]; flags[n] = s;
    }
    lines = [];
    for (var q = 0; q < COUNT; q++) {
      lines.push({ data: order[q], flawed: flags[q], state: "unread" });
    }
  }

  // --- Building the sheet -------------------------------------------------
  function build() {
    el["board-grid"].textContent = "";
    lines.forEach(function (ln, i) {
      var row = document.createElement("button");
      row.className = "line";
      row.type = "button";
      row.setAttribute("role", "listitem");
      row.dataset.i = String(i);

      var no = document.createElement("span");
      no.className = "line-no";
      no.textContent = (i + 1) + ".";

      var type = document.createElement("span");
      type.className = "line-type";

      var mark = document.createElement("span");
      mark.className = "line-mark";

      row.appendChild(no);
      row.appendChild(type);
      row.appendChild(mark);
      el["board-grid"].appendChild(row);
    });
    paint();
  }

  function paint() {
    var rows = el["board-grid"].children;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i], ln = lines[i];
      var type = row.querySelector(".line-type");
      var mark = row.querySelector(".line-mark");
      row.classList.remove("is-read", "is-sent", "is-clean", "is-flawed", "is-cursor");
      if (i === cursor) row.classList.add("is-cursor");

      if (ln.state === "read") {
        row.classList.add("is-read", ln.flawed ? "is-flawed" : "is-clean");
        if (ln.flawed) { type.innerHTML = ln.data.mark; mark.textContent = "error"; }
        else { type.textContent = ln.data.clean; mark.textContent = "clean"; }
      } else if (ln.state === "sent") {
        row.classList.add("is-sent");
        type.textContent = ln.flawed ? ln.data.bad : ln.data.clean;
        mark.textContent = "sent";
      } else {
        // Unread: the type is set, typo and all, but nothing is marked yet.
        type.textContent = ln.flawed ? ln.data.bad : ln.data.clean;
        mark.textContent = "";
      }
    }
    renderGauge();
  }

  // --- The tally ----------------------------------------------------------
  function counts() {
    var read = 0, caught = 0, blind = 0, blindBad = 0, unread = 0;
    lines.forEach(function (l) {
      if (l.state === "read") { read++; if (l.flawed) caught++; }
      else if (l.state === "sent") { blind++; if (l.flawed) blindBad++; }
      else unread++;
    });
    return { read: read, caught: caught, blind: blind, blindBad: blindBad, unread: unread };
  }

  function renderGauge() {
    var c = counts();
    el["gauge-read"].textContent = String(c.read);
    el["gauge-caught"].textContent = String(c.caught);
    el["gauge-blind"].textContent = String(c.blind);
    el["gauge-fill"].style.width = (100 * c.read / COUNT).toFixed(1) + "%";
    renderVerdict(c);
  }

  function renderVerdict(c) {
    var v = el["board-verdict"], state = "idle", text;
    if (c.read === 0 && c.blind === 0) {
      state = "idle";
      text = "A dozen lines, freshly pulled. Read them before you send the " +
        "forme, or the press will set your mistakes in ink.";
    } else if (c.blindBad > 0) {
      state = "blind";
      text = "You sent " + c.blind + " " + (c.blind === 1 ? "line" : "lines") +
        " unread — and " + c.blindBad + " of those carried an error. The press " +
        "will copy it onto every sheet. That is a reprint you bought to save five minutes.";
    } else if (c.unread === 0 && c.blind === 0) {
      state = "good";
      text = "The whole proof read. You caught " + c.caught + " " +
        (c.caught === 1 ? "error" : "errors") + " on one throwaway sheet — every " +
        "one of them a reprint you will not be paying for. Send the forme clean.";
    } else if (c.blind > 0) {
      state = "blind";
      text = "You read " + c.read + " and sent " + c.blind + " unread. Those " +
        "happened to be clean — this pull. A line you send unread is a line you " +
        "are trusting to a press that keeps no proofs.";
    } else {
      state = "good";
      text = "Read " + c.read + " of 12, " + c.caught + " " +
        (c.caught === 1 ? "error" : "errors") + " caught. Keep reading cold — the " +
        "turned letter hides where your eye wants to smooth it over.";
    }
    v.setAttribute("data-state", state);
    v.textContent = text;
  }

  // --- Actions ------------------------------------------------------------
  function read(i) {
    var ln = lines[i];
    if (ln.state !== "unread") return;
    ln.state = "read";
    paint();
  }

  function send(i) {
    var ln = lines[i];
    if (ln.state !== "unread") return;
    ln.state = "sent";
    paint();
  }

  function readAll() {
    lines.forEach(function (l) { if (l.state === "unread") l.state = "read"; });
    paint();
  }

  function sendRest() {
    lines.forEach(function (l) { if (l.state === "unread") l.state = "sent"; });
    paint();
  }

  function reset() {
    seed();
    build();
  }

  // --- Events -------------------------------------------------------------
  el["board-grid"].addEventListener("click", function (e) {
    var row = e.target.closest(".line");
    if (!row) return;
    cursor = parseInt(row.dataset.i, 10);
    read(cursor);
  });

  el["read-all"].addEventListener("click", readAll);
  el["send-all"].addEventListener("click", sendRest);
  el["reset-board"].addEventListener("click", reset);

  // --- Keyboard ----------------------------------------------------------
  // The whole proof is workable from the keys: J/K walk the lines, P reads the
  // one you are on, C sends it to the run unread, A reads the lot, R pulls a
  // fresh proof.
  function moveCursor(delta) {
    cursor = (cursor + delta + lines.length) % lines.length;
    paint();
    var row = el["board-grid"].children[cursor];
    if (row && row.focus) row.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var handled = true;
    switch (e.key) {
      case "j": case "J": case "ArrowDown": moveCursor(1); break;
      case "k": case "K": case "ArrowUp": moveCursor(-1); break;
      case "p": case "P": case "Enter": read(cursor); break;
      case "c": case "C": send(cursor); break;
      case "a": case "A": readAll(); break;
      case "r": case "R": reset(); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // --- Go -----------------------------------------------------------------
  seed();
  build();
})();
