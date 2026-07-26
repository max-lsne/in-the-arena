/* Quoin — a bench for one corner.
 *
 * The model is deliberately small. A corner is a list of courses laid bottom to
 * top. Each course returns either its LONG face or its SHORT face on the near
 * wall. A proper quoin alternates long/short every course, so the joint at the
 * back of the cornerstone lands somewhere new each time. Lay two courses the
 * same way running and those back-joints line up: a straight joint, drawn here
 * in red, the seam the corner will one day open along.
 *
 * No build step, no dependencies. Everything is a few numbers and an SVG. */

(function () {
  "use strict";

  // Geometry, in SVG user units. The corner is the left edge (x = 0).
  var VIEW_W = 320;
  var VIEW_H = 300;
  var CH = 30;            // course height
  var GAP = 3;            // mortar bed between courses
  var BASE_Y = VIEW_H - 8;
  var LONG = 168;         // width of a long-face return
  var SHORT = 92;         // width of a short-face return
  var MAX_COURSES = Math.floor((BASE_Y - 6) / (CH + GAP)); // fits the frame

  // A partly-built corner carrying exactly one straight joint, for reading.
  // bottom -> top. The two 'long' in the middle are the fault.
  var FLAWED = ["long", "short", "long", "long", "short", "long", "short"];

  var svg = document.getElementById("corner");
  var reading = document.getElementById("reading");
  var stateEl = document.getElementById("reading-state");
  var noteEl = document.getElementById("reading-note");
  var gCourses = document.getElementById("gauge-courses");
  var gFlaws = document.getElementById("gauge-flaws");
  var gBond = document.getElementById("gauge-bond");

  var SVGNS = "http://www.w3.org/2000/svg";

  // The corner, bottom course first.
  var courses = [];

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function widthOf(face) { return face === "long" ? LONG : SHORT; }

  // Which courses sit on a straight joint: any course whose back-joint x matches
  // the course directly below it (same face running twice).
  function flawFlags() {
    var flags = new Array(courses.length).fill(false);
    for (var i = 1; i < courses.length; i++) {
      if (courses[i] === courses[i - 1]) {
        flags[i] = true;
        flags[i - 1] = true;
      }
    }
    return flags;
  }

  function countFlaws() {
    var n = 0;
    for (var i = 1; i < courses.length; i++) {
      if (courses[i] === courses[i - 1]) n++;
    }
    return n;
  }

  function el(name, attrs) {
    var node = document.createElementNS(SVGNS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function render() {
    clear(svg);
    var flags = flawFlags();

    // Ground line.
    svg.appendChild(el("line", {
      x1: 0, y1: BASE_Y + 4, x2: VIEW_W, y2: BASE_Y + 4,
      stroke: css("--line"), "stroke-width": 2
    }));

    // Field wall behind each course (the run the quoin ties into).
    for (var i = 0; i < courses.length; i++) {
      var y = BASE_Y - (i + 1) * CH - i * GAP;
      var w = widthOf(courses[i]);

      // Field stones beyond the quoin — quiet rubble, just for context.
      svg.appendChild(el("rect", {
        x: w + 2, y: y, width: VIEW_W - w - 4, height: CH,
        fill: css("--stone"), stroke: css("--stone-edge"), "stroke-width": 1,
        rx: 2
      }));
      // a broken joint or two in the field, offset per course so it reads as bond
      var fieldJoint = w + 2 + ((i % 2 === 0) ? 70 : 40);
      if (fieldJoint < VIEW_W - 12) {
        svg.appendChild(el("line", {
          x1: fieldJoint, y1: y + 2, x2: fieldJoint, y2: y + CH - 2,
          stroke: css("--stone-edge"), "stroke-width": 1
        }));
      }

      // The cornerstone itself — dressed, gold.
      var stone = el("rect", {
        x: 0, y: y, width: w, height: CH,
        fill: css("--quoin"), stroke: css("--quoin-edge"), "stroke-width": 1.4,
        rx: 2
      });
      stone.setAttribute("class", "quoin-stone");
      svg.appendChild(stone);

      // Face label on the stone.
      var label = el("text", {
        x: w / 2, y: y + CH / 2 + 4,
        "text-anchor": "middle",
        "font-family": "JetBrains Mono, monospace",
        "font-size": 10,
        fill: css("--quoin-edge")
      });
      label.textContent = courses[i] === "long" ? "long" : "short";
      svg.appendChild(label);
    }

    // Back-joints, drawn last so the straight ones read on top.
    for (var j = 0; j < courses.length; j++) {
      var yy = BASE_Y - (j + 1) * CH - j * GAP;
      var wj = widthOf(courses[j]);
      if (flags[j]) {
        // A straight joint: the fault line, bold red, run over the mortar bed too.
        svg.appendChild(el("line", {
          x1: wj, y1: yy - GAP, x2: wj, y2: yy + CH,
          stroke: css("--flaw"), "stroke-width": 3, "stroke-linecap": "round"
        }));
      } else {
        // A broken joint: the ordinary, healthy back-joint.
        svg.appendChild(el("line", {
          x1: wj, y1: yy + 2, x2: wj, y2: yy + CH - 2,
          stroke: css("--quoin-edge"), "stroke-width": 1.2
        }));
      }
    }

    // The true corner of the building, always dead vertical at x = 0.
    svg.appendChild(el("line", {
      x1: 1, y1: Math.max(6, BASE_Y - MAX_COURSES * (CH + GAP)), x2: 1, y2: BASE_Y + 4,
      stroke: css("--accent"), "stroke-width": 2, "stroke-dasharray": "1 5",
      "stroke-linecap": "round", opacity: 0.55
    }));

    updateReading();
  }

  function updateReading() {
    var n = courses.length;
    var flaws = countFlaws();
    var pairs = Math.max(0, n - 1);
    var held = pairs === 0 ? null : Math.round(((pairs - flaws) / pairs) * 100);

    gCourses.textContent = n;
    gFlaws.textContent = flaws;
    gFlaws.className = "gauge-num" + (flaws > 0 ? " flaw-lit" : "");
    gBond.textContent = held === null ? "—" : held + "%";
    gBond.className = "gauge-num" + (held === 100 ? " good-lit" : held !== null && held < 100 ? " flaw-lit" : "");

    reading.classList.remove("is-good", "is-flaw", "is-build");

    if (n === 0) {
      stateEl.textContent = "An empty corner.";
      noteEl.textContent = "Lay a first course to begin. A long face and a short face, turning every course, is the whole of it.";
      return;
    }
    if (flaws > 0) {
      reading.classList.add("is-flaw");
      stateEl.textContent = flaws === 1
        ? "A straight joint has opened."
        : flaws + " straight joints have opened.";
      noteEl.textContent = "Two courses face the same way and their back-joints agree. That red line is the seam the corner will crack along — from the top down, once the weather finds it. Undo and turn the next course the other way.";
      return;
    }
    if (n < 4) {
      reading.classList.add("is-build");
      stateEl.textContent = "Bonding, so far.";
      noteEl.textContent = "Every joint broken by the course above. Keep turning the face each course — a corner is not a corner until it is a few courses tall.";
      return;
    }
    if (n >= MAX_COURSES) {
      reading.classList.add("is-good");
      stateEl.textContent = "Bonded, top to bottom.";
      noteEl.textContent = "Long and short turning every course, both walls tied into one. There is no straight joint anywhere in this corner. This is the one you can build the rest of the house on.";
      return;
    }
    reading.classList.add("is-good");
    stateEl.textContent = "Tied and true.";
    noteEl.textContent = "No two courses run the same way; not one joint lines up. Carry it on up, or bond it to the top.";
  }

  function lay(face) {
    if (courses.length >= MAX_COURSES) return;
    courses.push(face);
    persist();
    render();
  }

  function undo() {
    if (!courses.length) return;
    courses.pop();
    persist();
    render();
  }

  function reset() {
    courses = [];
    persist();
    render();
  }

  function loadFlawed() {
    courses = FLAWED.slice(0, MAX_COURSES);
    persist();
    render();
  }

  // Lay perfect alternating courses up to the top, continuing the current bond.
  function bondToTop() {
    var next = courses.length
      ? (courses[courses.length - 1] === "long" ? "short" : "long")
      : "long";
    while (courses.length < MAX_COURSES) {
      courses.push(next);
      next = next === "long" ? "short" : "long";
    }
    persist();
    render();
  }

  /* ---- persistence ----
   * The corner is kept in the browser and nowhere else, so a half-laid corner is
   * still standing on the next visit. Reads and writes fall back quietly when
   * storage is unavailable (private mode, quota, corrupt value) rather than
   * throwing — a bench that cannot save is still a bench. */
  var STORE_KEY = "quoin.corner.v1";

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(courses));
    } catch (e) { /* storage full or blocked — carry on unsaved */ }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!Array.isArray(saved)) return false;
      var clean = saved
        .filter(function (f) { return f === "long" || f === "short"; })
        .slice(0, MAX_COURSES);
      courses = clean;
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---- wiring ---- */
  document.querySelectorAll("[data-lay]").forEach(function (btn) {
    btn.addEventListener("click", function () { lay(btn.getAttribute("data-lay")); });
  });
  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.getElementById("btn-auto").addEventListener("click", bondToTop);
  document.getElementById("btn-flawed").addEventListener("click", loadFlawed);

  // First light: pick up the corner left last time, or lay the flawed one to
  // read so the bench is never empty on arrival.
  if (restore()) {
    render();
  } else {
    loadFlawed();
  }
})();
