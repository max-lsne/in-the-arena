/* Capstan — the bench.
 *
 * A rope wound round a drum grips it, and the grip compounds with the wrap. At
 * every point of contact the drum's friction bleeds a little tension, and since
 * more rope is in contact the further round you go, the loss is proportional to
 * the tension already there — decay by a fixed fraction. The result is the
 * capstan (belt-friction) equation:
 *
 *   T_hold = T_load · e^(−μθ)          θ = 2π · turns,  μ = grip coefficient
 *
 * so the purchase — how many times the hold is multiplied — is e^(μθ). Each full
 * turn multiplies it by the same factor again; the load's size never enters the
 * ratio, nor does the drum's turning. A hand can hold maybe 20 kgf on a tail
 * steadily, 35 for a burst. Below that the line holds fast; above it, it renders
 * or takes charge. Load in tonnes-force, everything else kilogram-force. */
(function () {
  "use strict";

  var GRIP_EASY = 20;   // kgf a hand keeps on a tail, steady
  var GRIP_HARD = 35;   // kgf for a burst
  var MAXTURNS = 5;
  var NIP = 0.8;        // tail below this (kgf) — the line won't render

  var SURF = {
    greasy: { label: "greasy",       mu: 0.12 },
    hemp:   { label: "hemp on iron", mu: 0.20 },
    rough:  { label: "dry & rough",  mu: 0.33 }
  };

  // Opens on a three-tonne line with a single turn: the tail far too heavy to
  // hold, the load taking charge. Take another turn — the hold falls away fast.
  var DEFAULT = { L: 3, turns: 1, surf: "hemp" };

  var KEY = "purchase.capstan.v1";   // where the wrap is kept between visits
  var state = load() || Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!SURF[o.surf]) return null;
      return {
        L: clamp(Math.round(o.L * 2) / 2, 0.5, 8),
        turns: clamp(Math.round(o.turns * 2) / 2, 0.5, MAXTURNS),
        surf: o.surf
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the drum ----------------------------------------------------------
  function compute(s) {
    var mu = SURF[s.surf].mu;
    var theta = 2 * Math.PI * s.turns;
    var ratio = Math.exp(mu * theta);           // purchase
    var loadKgf = s.L * 1000;
    var hold = loadKgf / ratio;                 // tail tension, kgf
    var oneHand = GRIP_EASY * ratio / 1000;     // tonnes one easy hand could hold
    var verdict;
    if (hold <= GRIP_EASY) verdict = "keep";
    else if (hold <= GRIP_HARD) verdict = "drift";
    else verdict = "dead";
    return {
      mu: mu, theta: theta, ratio: ratio,
      hold: hold, oneHand: oneHand,
      nipped: hold < NIP,
      verdict: verdict
    };
  }

  // fewest turns that bring the tail into an easy hand
  function turnsToHold(s) {
    for (var t = 0.5; t <= MAXTURNS; t += 0.5) {
      if (compute({ L: s.L, turns: t, surf: s.surf }).hold <= GRIP_EASY) return t;
    }
    return MAXTURNS;
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inL = $("in-L"), inT = $("in-T");
  var labL = $("lab-L"), labT = $("lab-T");
  var surfBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-surf]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");

  function fmtForce(kgf) {
    if (kgf >= 1000) return (kgf / 1000).toFixed(1) + '<span class="unit"> t</span>';
    if (kgf >= 100) return Math.round(kgf) + '<span class="unit"> kgf</span>';
    if (kgf >= 10) return kgf.toFixed(0) + '<span class="unit"> kgf</span>';
    return kgf.toFixed(1) + '<span class="unit"> kgf</span>';
  }

  function syncLabels() {
    labL.textContent = state.L.toFixed(1) + " t";
    labT.textContent = state.turns + (state.turns === 1 ? " turn" : " turns");
    surfBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.surf === state.surf));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Takes charge", note: "too few turns — it surges" },
    drift: { cls: "v-drift", word: "Rendering",    note: "creeps under strain" },
    keep:  { cls: "v-keep",  word: "Holding fast", note: "one hand holds it" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict === "keep" && r.nipped) note = "nipped — won't render";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var pCls = r.verdict === "keep" ? "good" : (r.verdict === "drift" ? "warn" : "bad");
    var ratioStr = r.ratio >= 100 ? Math.round(r.ratio) : r.ratio.toFixed(1);
    var rows = [
      ["Hold at the tail", fmtForce(r.hold), pCls],
      ["Purchase", ratioStr + '<span class="unit"> : 1</span>', ""],
      ["One hand could hold", r.oneHand.toFixed(1) + '<span class="unit"> t</span>', "good"],
      ["Wrap", state.turns + '<span class="unit"> turns · </span>' + Math.round(r.theta * 180 / Math.PI) + '<span class="unit"> °</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas drum, from above) ------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 520, H = 420, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function sizeCanvas() {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  var DRUM = { x: 210, y: 176, r: 56 };
  var GAUGE = { x0: 44, x1: 476, y: 372, max: 120 };
  var simT = 0, lastTs = null, creep = 0;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"),
      field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);

    ctx.clearRect(0, 0, W, H);

    var d = DRUM;
    // drum body
    ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI);
    ctx.fillStyle = withAlpha(col.slate, 0.12); ctx.fill();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2; ctx.stroke();
    // whelps (ribs), turning slowly with the creep so the drum reads as gripped
    for (var w = 0; w < 8; w++) {
      var a = creep + (w / 8) * 2 * Math.PI;
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(d.x + (d.r - 12) * Math.cos(a), d.y + (d.r - 12) * Math.sin(a));
      ctx.lineTo(d.x + (d.r - 2) * Math.cos(a), d.y + (d.r - 2) * Math.sin(a));
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, 2 * Math.PI); ctx.fillStyle = col.slate; ctx.fill();

    // the rope wrap: a spiral from the load entry to the tail, tension fading
    var loadCol = col.dead, tailCol = cur.verdict === "keep" ? col.keep : accent;
    var phi0 = Math.PI / 2 - creep;                 // entry at the bottom
    var steps = Math.max(24, Math.round(cur.theta / (Math.PI / 12)));
    var prev = null;
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var a2 = phi0 + f * cur.theta;
      var rr = d.r + 4 + f * cur.turns * 3.2;
      var pt = { x: d.x + rr * Math.cos(a2), y: d.y + rr * Math.sin(a2) };
      if (prev) {
        ctx.strokeStyle = lerp(loadCol, tailCol, f);
        ctx.lineWidth = 5.2 - 3.4 * f;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      }
      prev = pt;
    }
    var entry = { x: d.x + (d.r + 4) * Math.cos(phi0), y: d.y + (d.r + 4) * Math.sin(phi0) };
    var tailR = d.r + 4 + cur.turns * 3.2;
    var tailA = phi0 + cur.theta;
    var exit = { x: d.x + tailR * Math.cos(tailA), y: d.y + tailR * Math.sin(tailA) };

    // load line: comes up from the bottom into the entry, thick, big arrow
    ctx.strokeStyle = loadCol; ctx.lineWidth = 5.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(entry.x, 344); ctx.lineTo(entry.x, entry.y); ctx.stroke();
    arrowHead(entry.x, 344, 0, 1, loadCol, 7);       // pointing down (the load pulls away)
    ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("load " + state.L.toFixed(1) + " t", entry.x, 360);

    // tail: leaves the drum out to a hand, thin, small arrow, length ∝ hold
    var frac = clamp(cur.hold / GAUGE.max, 0.05, 1);
    var dirx = Math.cos(tailA), diry = Math.sin(tailA);
    var tlen = 34 + frac * 70;
    var hx = exit.x + dirx * tlen, hy = exit.y + diry * tlen;
    ctx.strokeStyle = tailCol; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(exit.x, exit.y); ctx.lineTo(hx, hy); ctx.stroke();
    arrowHead(hx, hy, dirx, diry, tailCol, 5);
    // the hand
    ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 2 * Math.PI);
    ctx.fillStyle = col.field; ctx.fill(); ctx.strokeStyle = tailCol; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = col.faint; ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = hx > d.x ? "left" : "right";
    ctx.fillText("hold " + fmtPlain(cur.hold), hx + (hx > d.x ? 12 : -12), hy + 4);

    // purchase, near the hub
    ctx.fillStyle = col.soft; ctx.font = "600 13px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("×" + (cur.ratio >= 100 ? Math.round(cur.ratio) : cur.ratio.toFixed(1)), d.x, d.y - d.r - 12);

    drawGauge(col, accent, cur);
  }

  function fmtPlain(kgf) {
    if (kgf >= 1000) return (kgf / 1000).toFixed(1) + " t";
    if (kgf >= 100) return Math.round(kgf) + " kgf";
    if (kgf >= 10) return kgf.toFixed(0) + " kgf";
    return kgf.toFixed(1) + " kgf";
  }

  function arrowHead(x, y, dx, dy, color, s) {
    var ang = Math.atan2(dy, dx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * s, y + Math.sin(ang) * s);
    ctx.lineTo(x + Math.cos(ang + 2.5) * s, y + Math.sin(ang + 2.5) * s);
    ctx.lineTo(x + Math.cos(ang - 2.5) * s, y + Math.sin(ang - 2.5) * s);
    ctx.closePath(); ctx.fill();
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    var bx1 = xFor(GRIP_EASY);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(g.x0, g.y - 9, bx1 - g.x0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1; ctx.strokeRect(g.x0, g.y - 9, bx1 - g.x0, 18);
    var hx1 = xFor(GRIP_HARD);
    ctx.fillStyle = withAlpha(col.drift, 0.16);
    ctx.fillRect(bx1, g.y - 9, hx1 - bx1, 18);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [0, 20, 35, 75, 120].forEach(function (t) {
      var x = xFor(t);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 10); ctx.lineTo(x, g.y + 14); ctx.stroke();
      ctx.fillText(String(t), x, g.y + 26);
    });
    ctx.textAlign = "left"; ctx.fillText("kgf at the tail", g.x0, g.y - 16);
    var pinned = cur.hold > g.max, nx = xFor(cur.hold);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y - 12); ctx.lineTo(nx, g.y + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, g.y - 12, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) {
      ctx.beginPath();
      ctx.moveTo(nx + 4, g.y - 12); ctx.lineTo(nx + 11, g.y - 15); ctx.lineTo(nx + 11, g.y - 9);
      ctx.closePath(); ctx.fill();
    }
  }

  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }
  function lerp(c1, c2, t) {
    if (c1.charAt(0) !== "#" || c2.charAt(0) !== "#") return c2;
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    var r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t);
    var g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
    var bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  // ---- loop --------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) {
      simT += dt;
      // the rope creeps: fast when it takes charge, a slow render, still when fast held
      var speed = current.verdict === "dead" ? 1.5 : (current.verdict === "drift" ? 0.4 : 0);
      creep += dt * speed;
    }
    draw(current);
    raf = window.requestAnimationFrame(frame);
  }
  var raf = window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
    save();
  }

  inL.addEventListener("input", function () { state.L = parseFloat(inL.value); update(); });
  inT.addEventListener("input", function () { state.turns = parseFloat(inT.value); update(); });
  surfBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.surf = b.dataset.surf; update(); });
  });

  $("turn").addEventListener("click", function () {
    state.turns = turnsToHold(state);
    inT.value = state.turns;
    update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inL.value = state.L; inT.value = state.turns;
    update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // nudge the turns by a half (keyboard wrapping)
  function nudgeTurns(d) {
    state.turns = clamp(+(state.turns + d).toFixed(1), 0.5, MAXTURNS);
    inT.value = state.turns;
    update();
  }

  // keyboard: the bench under the hands, without reaching for the mouse
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a slider keep its arrows
    var k = e.key;
    if (k === "t" || k === "T") { $("turn").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (k === "1") { state.surf = "greasy"; update(); }
    else if (k === "2") { state.surf = "hemp"; update(); }
    else if (k === "3") { state.surf = "rough"; update(); }
    else if (k === "[") { nudgeTurns(-0.5); }   // fewer turns — less hold
    else if (k === "]") { nudgeTurns(0.5); }      // another turn — more hold
    else return;
    e.preventDefault();
  });

  // ---- go ----------------------------------------------------------------
  inL.value = state.L; inT.value = state.turns;
  update();
})();
