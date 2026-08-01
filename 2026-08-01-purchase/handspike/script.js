/* Handspike — the bench.
 *
 * A lever of the first class: the load on a short arm, the hands on a long one,
 * both turning about the fulcrum. At balance the turning-efforts match —
 * load × load-arm = effort × effort-arm — so
 *
 *   effort  =  W · a / b            [a = load arm, b = effort arm]
 *
 * and the mechanical advantage is the arms the other way up:
 *
 *   MA = b / a          effort = W / MA          travel ratio = b / a
 *
 * Sliding the fulcrum toward the load shortens a and lengthens b at once, so the
 * advantage climbs fast; lengthening the bar past the fulcrum lengthens only b,
 * a gentler gain. Push the fulcrum past the middle (a > b) and the arms invert:
 * MA < 1, and you are adding to the load.
 *
 * A body can bear down with roughly 70 kgf and hold it, half again for a burst.
 * Below that band the load is prised; above it, straining or immovable. All
 * kilogram-force and metres; the geometry is schematic. */
(function () {
  "use strict";

  var COMFORT = 70;    // kgf a body can bear down with and hold
  var HARD    = 110;   // kgf for a hard burst
  var TRAVEL_HIGH = 12;// above this MA, all force and almost no travel
  var A_MIN = 0.05;    // closest the fulcrum can sit to the load, m

  // Opens on a heavy block, fulcrum set too far off: immovable under a hard
  // heave. Slide the fulcrum toward the load, or lengthen the bar.
  var DEFAULT = { W: 400, B: 1.50, a: 0.60 };

  var KEY = "purchase.handspike.v1";   // where the lever is kept between visits
  var state = load() || Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (typeof o.W !== "number" || typeof o.B !== "number" || typeof o.a !== "number") return null;
      var B = clamp(o.B, 0.80, 3.00);
      return {
        W: clamp(Math.round(o.W / 10) * 10, 100, 800),
        B: B,
        a: clamp(o.a, A_MIN, B - 0.10)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the lever ---------------------------------------------------------
  function compute(s) {
    var a = clamp(s.a, A_MIN, s.B - 0.10);   // load arm
    var b = s.B - a;                          // effort arm
    var ma = b / a;
    var P = s.W / ma;                         // effort, kgf
    var verdict;
    if (P <= COMFORT) verdict = "keep";
    else if (P <= HARD) verdict = "drift";
    else verdict = "dead";
    return {
      a: a, b: b, ma: ma, P: P, travel: ma,
      against: a > b,                          // fulcrum past the middle
      allForce: ma > TRAVEL_HIGH,
      barBow: s.B > 2.4 && P > 90,
      verdict: verdict
    };
  }

  // largest load-arm that still brings the effort within reach (least travel)
  function fulcrumToReach(s) {
    var target = COMFORT * s.B / (s.W + COMFORT);   // solves W·a/(B−a) = COMFORT
    return clamp(target, A_MIN, s.B - 0.10);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-W"), inB = $("in-B"), inA = $("in-A");
  var labW = $("lab-W"), labB = $("lab-B"), labA = $("lab-A");
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");

  function syncLabels() {
    labW.textContent = state.W + " kgf";
    labB.textContent = state.B.toFixed(2) + " m";
    labA.textContent = clamp(state.a, A_MIN, state.B - 0.10).toFixed(2) + " m";
    // keep the fulcrum slider's ceiling under the bar length
    inA.max = (state.B - 0.10).toFixed(2);
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Immovable", note: "advantage too small" },
    drift: { cls: "v-drift", word: "Straining", note: "over a comfortable lean" },
    keep:  { cls: "v-keep",  word: "Prised",    note: "within a body's bear-down" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.against) note = "fulcrum past the middle";
    else if (r.verdict === "keep" && r.allForce) note = "all force, little travel";
    else if (r.barBow) note = "the bar bows";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var pCls = r.verdict === "keep" ? "good" : (r.verdict === "drift" ? "warn" : "bad");
    var maCls = r.against ? "bad" : (r.allForce ? "warn" : "");
    var rows = [
      ["Effort at your hands", Math.round(r.P) + '<span class="unit"> kgf</span>', pCls],
      ["Mechanical advantage", r.ma.toFixed(1) + '<span class="unit"> : 1</span>', maCls],
      ["Load arm", r.a.toFixed(2) + '<span class="unit"> m</span>', ""],
      ["Effort arm", r.b.toFixed(2) + '<span class="unit"> m</span>', ""],
      ["Travel (your end : load)", r.travel.toFixed(1) + '<span class="unit"> : 1</span>', r.allForce ? "warn" : ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas lever) -----------------------------------------
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

  var PIVOT_Y = 210;
  var LEFT = 66;                                   // load end, unrotated
  var GAUGE = { x0: 44, x1: 476, y: 380, max: 200 };
  var simT = 0, lastTs = null;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"),
      field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);

    ctx.clearRect(0, 0, W, H);

    var scale = Math.min(132, 420 / state.B);       // px per metre, bar fits width
    var pivotX = LEFT + cur.a * scale;
    // a small animated prise: effort end dips, load end rises about the pivot
    var swing = reduce ? -0.02 : (-0.02 + 0.03 * Math.sin(simT * 0.8));
    var pt = function (s) {                          // signed metres from pivot → screen
      var px = s * scale;
      return { x: pivotX + px * Math.cos(swing), y: PIVOT_Y - px * Math.sin(swing) };
    };
    var loadEnd = pt(-cur.a), effEnd = pt(cur.b);

    // ground line under the fulcrum
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, PIVOT_Y + 30); ctx.lineTo(486, PIVOT_Y + 30); ctx.stroke();
    for (var gx = 48; gx < 486; gx += 16) {
      ctx.beginPath(); ctx.moveTo(gx, PIVOT_Y + 30); ctx.lineTo(gx - 6, PIVOT_Y + 38); ctx.stroke();
    }

    // the bar: load arm in slate, effort arm in brass
    ctx.lineCap = "round";
    ctx.strokeStyle = col.slate; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(loadEnd.x, loadEnd.y); ctx.lineTo(pt(0).x, pt(0).y); ctx.stroke();
    ctx.strokeStyle = col.brass; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(pt(0).x, pt(0).y); ctx.lineTo(effEnd.x, effEnd.y); ctx.stroke();

    // fulcrum triangle
    ctx.fillStyle = col.slate;
    ctx.beginPath();
    ctx.moveTo(pivotX, PIVOT_Y + 2);
    ctx.lineTo(pivotX - 16, PIVOT_Y + 28);
    ctx.lineTo(pivotX + 16, PIVOT_Y + 28);
    ctx.closePath(); ctx.fill();

    // the load: a boulder on the short arm
    var lr = 26;
    ctx.beginPath(); ctx.arc(loadEnd.x, loadEnd.y - lr + 2, lr, 0, 2 * Math.PI);
    ctx.fillStyle = withAlpha(col.slate, 0.16); ctx.fill();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = col.soft; ctx.font = "600 12px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(state.W + " kgf", loadEnd.x, loadEnd.y - lr + 6);

    // effort arrow at the hands, down, length ∝ effort
    var frac = clamp(cur.P / GAUGE.max, 0.08, 1);
    var arrow = 22 + frac * 84;
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(effEnd.x, effEnd.y); ctx.lineTo(effEnd.x, effEnd.y + arrow); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(effEnd.x, effEnd.y + arrow + 6);
    ctx.lineTo(effEnd.x - 5, effEnd.y + arrow - 4);
    ctx.lineTo(effEnd.x + 5, effEnd.y + arrow - 4);
    ctx.closePath(); ctx.fill();
    ctx.font = "11px ui-monospace, monospace"; ctx.textAlign = "center"; ctx.fillStyle = col.faint;
    ctx.fillText("push " + Math.round(cur.P) + " kgf", effEnd.x, effEnd.y + arrow + 20);

    // arm brackets, along the ground
    dimension(col, LEFT, pivotX, PIVOT_Y + 52, "a = " + cur.a.toFixed(2) + " m");
    dimension(col, pivotX, LEFT + state.B * scale, PIVOT_Y + 52, "b = " + cur.b.toFixed(2) + " m");

    drawGauge(col, accent, cur);
  }

  function dimension(col, x0, x1, y, label) {
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y - 4); ctx.lineTo(x0, y + 4);
    ctx.moveTo(x0, y); ctx.lineTo(x1, y);
    ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4);
    ctx.stroke();
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText(label, (x0 + x1) / 2, y - 6);
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    var bx1 = xFor(COMFORT);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(g.x0, g.y - 9, bx1 - g.x0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1; ctx.strokeRect(g.x0, g.y - 9, bx1 - g.x0, 18);
    var hx1 = xFor(HARD);
    ctx.fillStyle = withAlpha(col.drift, 0.16);
    ctx.fillRect(bx1, g.y - 9, hx1 - bx1, 18);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [0, 70, 110, 150, 200].forEach(function (t) {
      var x = xFor(t);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 10); ctx.lineTo(x, g.y + 14); ctx.stroke();
      ctx.fillText(String(t), x, g.y + 26);
    });
    ctx.textAlign = "left"; ctx.fillText("kgf at your hands", g.x0, g.y - 16);
    var pinned = cur.P > g.max, nx = xFor(cur.P);
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

  // ---- loop --------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) simT += dt;
    draw(current);
    raf = window.requestAnimationFrame(frame);
  }
  var raf = window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
    announce(current);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var pre = state.W + " kilogram load, " + state.B.toFixed(2) + " metre bar, fulcrum "
        + r.a.toFixed(2) + " metres from the load. ";
      var msg;
      if (r.against) {
        msg = pre + "The fulcrum is past the middle — the arms are against you, adding to the load. Slide it toward the load.";
      } else if (r.verdict === "dead") {
        msg = pre + "Immovable — your hands need " + Math.round(r.P)
          + " kilograms, beyond a hard heave. Set the fulcrum nearer the load.";
      } else if (r.verdict === "drift") {
        msg = pre + "Straining — " + Math.round(r.P) + " kilograms at your hands, over a comfortable lean.";
      } else {
        msg = pre + "Prised — " + Math.round(r.P) + " kilograms at your hands, within a bear-down; advantage "
          + r.ma.toFixed(1) + " to one" + (r.allForce ? ", but almost no travel" : "") + ".";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inW.addEventListener("input", function () { state.W = parseInt(inW.value, 10); update(); });
  inB.addEventListener("input", function () {
    state.B = parseFloat(inB.value);
    if (state.a > state.B - 0.10) { state.a = state.B - 0.10; inA.value = state.a.toFixed(2); }
    update();
  });
  inA.addEventListener("input", function () { state.a = parseFloat(inA.value); update(); });

  $("setfulcrum").addEventListener("click", function () {
    state.a = fulcrumToReach(state);
    inA.value = state.a.toFixed(2);
    update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.W; inB.value = state.B.toFixed(2); inA.value = state.a.toFixed(2);
    update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // nudge the fulcrum and the bar (keyboard setting)
  function nudgeA(d) {
    state.a = clamp(+(state.a + d).toFixed(2), A_MIN, state.B - 0.10);
    inA.value = state.a.toFixed(2);
    update();
  }
  function nudgeBar(d) {
    state.B = clamp(+(state.B + d).toFixed(2), 0.80, 3.00);
    if (state.a > state.B - 0.10) state.a = +(state.B - 0.10).toFixed(2);
    inB.value = state.B.toFixed(2); inA.value = state.a.toFixed(2);
    update();
  }

  // keyboard: the bench under the hands, without reaching for the mouse
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a slider keep its arrows
    var k = e.key;
    if (k === "f" || k === "F") { $("setfulcrum").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (k === "[") { nudgeA(-0.05); }     // fulcrum toward the load — stronger
    else if (k === "]") { nudgeA(0.05); }       // fulcrum away — weaker
    else if (k === ",") { nudgeBar(-0.10); }    // shorten the bar
    else if (k === ".") { nudgeBar(0.10); }      // lengthen the bar
    else return;
    e.preventDefault();
  });

  // ---- go ----------------------------------------------------------------
  inW.value = state.W; inB.value = state.B.toFixed(2); inA.value = state.a.toFixed(2);
  update();
})();
