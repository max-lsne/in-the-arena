/* Bed — the bench.
 *
 * Sedimentary stone parts along its beds. Set the beds open and parallel to the
 * weather (face-bedded) and water sits in them; a freeze turns that water to ice,
 * ice is larger than water, and it jacks the layer off the face. Turn the beds
 * square to the weather and water crosses and sheds, and the frost finds nothing
 * to lift.
 *
 *   trap    = cos²(β)                         water an open bed holds at the face
 *   purchase = 0.04 + 0.96·trap               the frost's hold, with a floor for surface fret
 *   years   = base / (freezes · wet · drink · purchase)
 *
 * β is the bed to the weather: 0° face-bedded (open, parallel), 90° square-on
 * (sheds). Denser, less thirsty stone (granite) forgives; thirsty sandstone does
 * not. */
(function () {
  "use strict";

  var STONE = {
    granite:   { label: "granite",   drink: 0.15, base: 650 },
    limestone: { label: "limestone", drink: 0.55, base: 280 },
    sandstone: { label: "sandstone", drink: 1.00, base: 140 }
  };
  var FLOOR = 0.04;       // surface fret even when the beds shed
  var SPALL = 10, SOUND = 60;   // years — the walls of the sound band

  // Opens on a thirsty sandstone set nearly face-bedded on a soaked, hard-freezing coping.
  var DEFAULT = { b: 10, f: 45, w: 85, stone: "sandstone" };

  var state = Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- the stone ---------------------------------------------------------
  function compute(st) {
    var m = STONE[st.stone];
    var trap = Math.pow(Math.cos(st.b * Math.PI / 180), 2);
    var purchase = FLOOR + (1 - FLOOR) * trap;
    var drive = st.f * (st.w / 100) * m.drink * purchase;
    var years = drive > 0 ? m.base / drive : Infinity;
    var verdict;
    if (years < SPALL) verdict = "dead";        // spalling
    else if (years < SOUND) verdict = "drift";  // fretting
    else verdict = "keep";                      // weathers true
    return { trap: trap, purchase: purchase, drive: drive, years: years, drink: m.drink, verdict: verdict };
  }

  // the least turn of the bed that carries the stone into the sound band for its place
  function bedToShed(st) {
    var m = STONE[st.stone];
    var denom = st.f * (st.w / 100) * m.drink;
    if (denom <= 0) return 0;
    var purchaseTarget = (m.base / SOUND) / denom;    // purchase that yields exactly SOUND years
    var trapTarget = (purchaseTarget - FLOOR) / (1 - FLOOR);
    if (trapTarget >= 1) return 0;                    // already sound flat on its bed
    if (trapTarget <= 0) return 90;                   // cannot reach sound — turn it fully square
    var beta = Math.acos(Math.sqrt(trapTarget)) * 180 / Math.PI;
    return clamp(Math.ceil(beta / 2) * 2, 0, 90);
  }

  function yearsLabel(y) {
    if (!isFinite(y) || y > 999) return "1000+";
    if (y >= 100) return Math.round(y / 10) * 10 + "";
    return y.toFixed(y < 10 ? 1 : 0);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inB = $("in-B"), inF = $("in-F"), inW = $("in-W");
  var labB = $("lab-B"), labF = $("lab-F"), labW = $("lab-W");
  var stoneBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-stone]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage");

  function syncLabels() {
    labB.textContent = state.b + "°";
    labF.textContent = state.f + "";
    labW.textContent = state.w + "%";
    stoneBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.stone === state.stone));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Spalling",     note: "shedding in sheets" },
    drift: { cls: "v-drift", word: "Fretting",     note: "decays before its time" },
    keep:  { cls: "v-keep",  word: "Weathers true", note: "sheds and stands" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict === "keep" && r.years > 250) note = "sound as the quarry";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var trapCls = r.trap > 0.55 ? "bad" : (r.trap > 0.2 ? "warn" : "good");
    var yCls = r.verdict === "dead" ? "bad" : (r.verdict === "drift" ? "warn" : "good");
    var rows = [
      ["Beds open to the weather", Math.round(r.trap * 100) + '<span class="unit">% holding water</span>', trapCls],
      ["Frost's purchase", Math.round(r.purchase * 100) + '<span class="unit">%</span>', trapCls],
      ["Years to the first spall", yearsLabel(r.years) + '<span class="unit"> yr</span>', yCls],
      ["The stone's thirst", r.drink.toFixed(2) + '<span class="unit">× </span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: one ashlar in section, a season over it) -------
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

  var cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  var FACE = 96, BX1 = 430, BTOP = 74, BBOT = 300;    // the block, in section; FACE is the weathered edge
  var GAUGE = { x0: 74, x1: 452, y: 388, max: 300 };
  var season = 0;    // wet → freeze → shed, cycled

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);
    ctx.clearRect(0, 0, W, H);

    // freeze phase of the season: cos wave, 0 wet → 1 hardest freeze
    var freeze = (1 - Math.cos(season)) / 2;

    // neighbouring courses, faint
    ctx.strokeStyle = withAlpha(col.slate, 0.18); ctx.lineWidth = 1;
    ctx.strokeRect(FACE, BTOP - 26, BX1 - FACE, 22);
    ctx.strokeRect(FACE, BBOT + 4, BX1 - FACE, 22);

    // how far the face has shed (only when spalling, and grows with the freeze)
    var maxShed = cur.verdict === "dead" ? 26 : (cur.verdict === "drift" ? 7 : 0);
    var shed = maxShed * freeze;

    // the ashlar body
    ctx.fillStyle = withAlpha(col.brass, 0.10);
    ctx.fillRect(FACE, BTOP, BX1 - FACE, BBOT - BTOP);
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.strokeRect(FACE, BTOP, BX1 - FACE, BBOT - BTOP);

    // the beds — layers at (90 − β) from horizontal (β=0 vertical, β=90 horizontal)
    var bedAng = (90 - state.b) * Math.PI / 180;
    var dx = Math.cos(bedAng), dy = Math.sin(bedAng);
    ctx.save();
    ctx.beginPath(); ctx.rect(FACE, BTOP, BX1 - FACE, BBOT - BTOP); ctx.clip();
    ctx.strokeStyle = withAlpha(col.slate, 0.34); ctx.lineWidth = 1;
    var span = (BX1 - FACE) + (BBOT - BTOP);
    for (var o = -span; o <= span; o += 15) {
      // a family of parallel lines with direction (dx,dy), offset along the normal
      var px = (FACE + BX1) / 2 - dy * o, py = (BTOP + BBOT) / 2 + dx * o;
      ctx.beginPath();
      ctx.moveTo(px - dx * span, py - dy * span);
      ctx.lineTo(px + dx * span, py + dy * span);
      ctx.stroke();
    }
    ctx.restore();

    // water reaching the face, and sitting in the open bed-ends
    drawWeather(col, freeze, cur);

    // the weathered face — and the sheet lifting off it if it spalls
    if (shed > 0.5) {
      // the spalled sheet, pulled off to the left
      ctx.fillStyle = withAlpha(col.dead, 0.5);
      ctx.fillRect(FACE - shed, BTOP + 4, shed, BBOT - BTOP - 8);
      ctx.strokeStyle = col.dead; ctx.lineWidth = 1.5;
      ctx.strokeRect(FACE - shed, BTOP + 4, 6, BBOT - BTOP - 8);
      // ice in the opened joint
      ctx.strokeStyle = withAlpha(col.swing || col.slate, 0.8); ctx.lineWidth = 1;
      for (var iy = BTOP + 12; iy < BBOT - 8; iy += 16) {
        ctx.beginPath(); ctx.moveTo(FACE - shed + 6, iy); ctx.lineTo(FACE - 1, iy + 5); ctx.stroke();
      }
      ctx.fillStyle = col.dead; ctx.font = "600 12px ui-monospace, monospace"; ctx.textAlign = "left";
      ctx.fillText("spalls off", FACE - shed - 2, BTOP - 6);
    } else {
      ctx.strokeStyle = withAlpha(accent, 0.9); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(FACE, BTOP); ctx.lineTo(FACE, BBOT); ctx.stroke();
      if (cur.verdict === "keep") {
        // lichen freckles — a face that stands
        ctx.fillStyle = withAlpha(col.keep, 0.5);
        for (var k = 0; k < 7; k++) {
          var ly = BTOP + 24 + k * 34, lx = FACE + 5 + (k % 3) * 4;
          ctx.beginPath(); ctx.arc(lx, ly, 2.2, 0, 2 * Math.PI); ctx.fill();
        }
      }
    }

    // a small label for which way the weather comes
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText("weather →", 10, (BTOP + BBOT) / 2);
    ctx.textAlign = "right"; ctx.fillText("into the wall", BX1 - 4, BTOP - 10);

    drawGauge(col, accent, cur);
  }

  function drawWeather(col, freeze, cur) {
    // droplets running down the face; more sit in the bed-ends the more open the beds
    var wet = state.w / 100;
    ctx.fillStyle = withAlpha(cur.verdict === "keep" ? col.keep : col.slate, 0.5);
    for (var i = 0; i < 9; i++) {
      var t = ((i / 9) + (freeze < 0.5 ? season * 0.08 : 0)) % 1;
      var y = BTOP + t * (BBOT - BTOP);
      var run = cur.trap > 0.4 ? 0 : 5 + 6 * (1 - cur.trap);   // sheds outward when beds are square
      ctx.beginPath(); ctx.arc(FACE - 3 - run * (i % 2), y, 1.6 + wet, 0, 2 * Math.PI); ctx.fill();
    }
    // frost mark at the freeze
    if (freeze > 0.6) {
      ctx.strokeStyle = withAlpha(col.slate, 0.7); ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(14, 20); ctx.lineTo(22, 20); ctx.moveTo(18, 16); ctx.lineTo(18, 24);
      ctx.moveTo(15.5, 17.5); ctx.lineTo(20.5, 22.5); ctx.moveTo(20.5, 17.5); ctx.lineTo(15.5, 22.5);
      ctx.stroke();
      ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "left";
      ctx.fillText("freeze", 26, 23);
    }
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    // sqrt scale so the short lives are legible
    var xFor = function (v) { return g.x0 + Math.sqrt(clamp(v, 0, g.max) / g.max) * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    var xs = xFor(SPALL), xn = xFor(SOUND);
    ctx.fillStyle = withAlpha(col.dead, 0.12); ctx.fillRect(g.x0, g.y - 8, xs - g.x0, 16);
    ctx.fillStyle = withAlpha(col.drift, 0.14); ctx.fillRect(xs, g.y - 8, xn - xs, 16);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(xn, g.y - 8, g.x1 - xn, 16);
    ctx.strokeStyle = col.keep; ctx.strokeRect(xn, g.y - 8, g.x1 - xn, 16);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [[0, "0"], [SPALL, "10"], [SOUND, "60"], [300, "300+ yr"]].forEach(function (t) {
      var x = xFor(t[0]);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 9); ctx.lineTo(x, g.y + 13); ctx.stroke();
      ctx.fillText(t[1], x, g.y + 25);
    });
    ctx.textAlign = "left"; ctx.fillText("years to the first spall", g.x0, g.y - 14);
    var pinned = cur.years > g.max, nx = xFor(cur.years);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y - 11); ctx.lineTo(nx, g.y + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, g.y - 11, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) { ctx.beginPath(); ctx.moveTo(nx + 4, g.y - 11); ctx.lineTo(nx + 11, g.y - 14); ctx.lineTo(nx + 11, g.y - 8); ctx.closePath(); ctx.fill(); }
  }

  function withAlpha(c, a) {
    if (c && c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c || "#888";
  }

  // ---- loop --------------------------------------------------------------
  var current = compute(state);
  var lastTs = null;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    season += dt * 0.8;    // the year runs wet → freeze → wet
    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ------------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels();
    render(current);
  }

  inB.addEventListener("input", function () { state.b = parseInt(inB.value, 10); update(); });
  inF.addEventListener("input", function () { state.f = parseInt(inF.value, 10); update(); });
  inW.addEventListener("input", function () { state.w = parseInt(inW.value, 10); update(); });
  stoneBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.stone = b.dataset.stone; update(); });
  });

  $("fix").addEventListener("click", function () {
    state.b = bedToShed(state); inB.value = state.b; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inB.value = state.b; inF.value = state.f; inW.value = state.w; update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  inB.value = state.b; inF.value = state.f; inW.value = state.w;
  update();
})();
