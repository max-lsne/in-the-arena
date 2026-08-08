/* Bias — the bench.
 *
 * A woven cloth's give does not come from the thread stretching but from the
 * weave racking: square cells shearing into diamonds. That racking is greatest
 * at 45° to the thread and vanishes on it, so the give follows sin(2α):
 *
 *   give   = maxGive · sin(2α)         drape the cut offers
 *   demand = 1 + 15·(curve/100)        drape the curve asks for
 *   sag    = give · (drop/100) · creep  growth under its own hanging weight
 *
 * Too little give and the piece stands stiff and will not round the curve; too
 * much give on a long drop and it grows and sags. Between them it hangs true.
 * Crisp poplin has little give and grows slowly; fluid crepe has give to spare
 * and grows the fastest. */
(function () {
  "use strict";

  var CLOTH = {
    poplin:  { label: "poplin",     maxGive: 6,  creep: 0.10 },
    suiting: { label: "suiting",    maxGive: 11, creep: 0.17 },
    crepe:   { label: "silk crepe", maxGive: 18, creep: 0.30 }
  };
  var SAGLIMIT = 2.2;    // cm the hem may grow before it sags
  var MEET = 0.85;       // give must reach this fraction of the demand to sit

  // Opens on a soft collar cut nearly on the grain — standing stiff, refusing to roll.
  var DEFAULT = { a: 6, d: 24, c: 78, cloth: "crepe" };

  var KEY = "grain.bias.v1";   // where the piece is kept between visits
  var state = load() || Object.assign({}, DEFAULT);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var o = JSON.parse(window.localStorage.getItem(KEY));
      if (!o || !CLOTH[o.cloth]) return null;
      return {
        a: clamp(Math.round(o.a), 0, 90),
        d: clamp(Math.round(o.d / 2) * 2, 10, 140),
        c: clamp(Math.round(o.c), 0, 100),
        cloth: o.cloth
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // ---- the cloth ---------------------------------------------------------
  function compute(st) {
    var m = CLOTH[st.cloth];
    var give = m.maxGive * Math.sin(2 * st.a * Math.PI / 180);
    var demand = 1 + 15 * (st.c / 100);
    var sag = give * (st.d / 100) * m.creep;
    var waste = Math.sin(2 * st.a * Math.PI / 180) * 38;
    var verdict;
    if (give < demand * MEET) verdict = "dead";     // stands stiff — will not sit
    else if (sag > SAGLIMIT) verdict = "drift";     // grows and sags
    else verdict = "keep";                          // hangs true
    return { give: give, demand: demand, sag: sag, waste: waste, maxGive: m.maxGive, verdict: verdict };
  }

  // the least angle that turns the cut onto enough bias to meet the curve
  function cutToBias(st) {
    var m = CLOTH[st.cloth];
    var demand = 1 + 15 * (st.c / 100);
    var ratio = demand / m.maxGive;
    if (ratio >= 1) return 45;                        // cannot meet it — full bias is the best there is
    return clamp(Math.round(0.5 * Math.asin(ratio) * 180 / Math.PI), 0, 45);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inA = $("in-A"), inD = $("in-D"), inC = $("in-C");
  var labA = $("lab-A"), labD = $("lab-D"), labC = $("lab-C");
  var clothBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-cloth]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");

  function syncLabels() {
    labA.textContent = state.a + "°";
    labD.textContent = state.d + " cm";
    labC.textContent = state.c + "%";
    clothBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.cloth === state.cloth));
    });
  }

  var VERDICT_TEXT = {
    dead:  { cls: "v-dead",  word: "Stands stiff", note: "will not round it" },
    drift: { cls: "v-drift", word: "Grows",        note: "the hem sags & wavers" },
    keep:  { cls: "v-keep",  word: "Hangs true",   note: "lies to the curve" }
  };

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    var note = v.note;
    if (r.verdict === "keep" && state.a < 12) note = "holds its line";
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + note + "</small>";

    var giveCls = r.give < r.demand * MEET ? "bad" : (r.sag > SAGLIMIT ? "warn" : "good");
    var sagCls = r.sag > SAGLIMIT ? "bad" : (r.sag > SAGLIMIT * 0.7 ? "warn" : "good");
    var rows = [
      ["Give at this angle", r.give.toFixed(1) + '<span class="unit">%</span>', giveCls],
      ["The curve asks", r.demand.toFixed(1) + '<span class="unit">%</span>', ""],
      ["It grows", r.sag.toFixed(1) + '<span class="unit"> cm</span>', sagCls],
      ["Cloth wasted in the lay", Math.round(r.waste) + '<span class="unit">%</span>', ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");
  }

  // ---- the stage (canvas: a bias strip laid round a curve) ---------------
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

  var CXc = 262, CYc = 74, BW = 30;      // the curve's centre, and the strip's width
  var GAUGE = { x0: 74, x1: 452, y: 388, max: 20 };
  var sway = 0;    // a slow settle of the hanging cloth

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), brass: cssVar("--brass"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead"), field: cssVar("--field")
    };
    var accent = cur.verdict === "keep" ? col.keep : (cur.verdict === "drift" ? col.drift : col.dead);
    ctx.clearRect(0, 0, W, H);

    var R = 200 - (state.c / 100) * 130;      // tighter curve → smaller radius
    var th0 = 22 * Math.PI / 180, th1 = 158 * Math.PI / 180;

    // the curve the cloth must round — the guide, dashed
    ctx.strokeStyle = withAlpha(col.slate, 0.55); ctx.lineWidth = 1.5;
    dashArc(CXc, CYc, R, th0, th1);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("the curve to round", CXc, CYc + R + 20);

    if (cur.verdict === "dead") drawStiff(cur, R, th0, th1, col, accent);
    else drawDraped(cur, R, th0, th1, col, accent);

    drawGauge(col, accent, cur);
  }

  function arcPt(cx, cy, r, th) { return [cx + r * Math.cos(th), cy + r * Math.sin(th)]; }

  function dashArc(cx, cy, r, th0, th1) {
    var n = 60;
    for (var i = 0; i < n; i += 2) {
      var a = th0 + (th1 - th0) * i / n, b = th0 + (th1 - th0) * (i + 1) / n;
      var p = arcPt(cx, cy, r, a), q = arcPt(cx, cy, r, b);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
  }

  // stiff: the strip cannot bend, so it stands off the curve in straight chords
  function drawStiff(cur, R, th0, th1, col, accent) {
    var K = 5;
    ctx.fillStyle = withAlpha(accent, 0.16);
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath();
    var i, p;
    for (i = 0; i <= K; i++) { p = arcPt(CXc, CYc, R, th0 + (th1 - th0) * i / K); i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
    for (i = K; i >= 0; i--) { p = arcPt(CXc, CYc, R + BW, th0 + (th1 - th0) * i / K); ctx.lineTo(p[0], p[1]); }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    grainHatch(R, th0, th1, K, col, accent, 0);

    // the gap it stands off, and wrinkles where it is forced round
    var mid = (th0 + th1) / 2, g = arcPt(CXc, CYc, R, mid), gc = arcPt(CXc, CYc, R - R * (1 - Math.cos((th1 - th0) / (2 * K))) * 2.2, mid);
    ctx.strokeStyle = withAlpha(col.dead, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g[0], g[1] + 2); ctx.lineTo(g[0], g[1] + 22); ctx.stroke();
    ctx.fillStyle = col.dead; ctx.font = "600 11px ui-monospace, monospace"; ctx.textAlign = "left";
    ctx.fillText("stands off", g[0] + 6, g[1] + 18);
  }

  // draped: the strip lies on the curve; if it grows, a slack tail droops past the end
  function drawDraped(cur, R, th0, th1, col, accent) {
    var grow = cur.verdict === "drift" ? clamp((cur.sag - SAGLIMIT) * 10, 4, 52) : 0;
    var ripple = cur.verdict === "drift" ? 3 : 0;
    var n = 48;

    ctx.fillStyle = withAlpha(accent, 0.16);
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath();
    var i, a, p, wob;
    for (i = 0; i <= n; i++) {
      a = th0 + (th1 - th0) * i / n;
      p = arcPt(CXc, CYc, R, a);
      i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
    }
    for (i = n; i >= 0; i--) {
      a = th0 + (th1 - th0) * i / n;
      wob = ripple * Math.sin(i / n * 7 + sway);
      p = arcPt(CXc, CYc, R + BW + wob, a);
      // the growing tail sags downward toward the far (right) end
      var droop = grow * Math.pow(Math.max(0, (a - (th0 + th1) / 2)) / ((th1 - th0) / 2), 2);
      ctx.lineTo(p[0], p[1] + droop);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    grainHatch(R, th0, th1, 12, col, accent, sway);

    if (cur.verdict === "drift") {
      var e = arcPt(CXc, CYc, R + BW, th1);
      ctx.fillStyle = col.drift; ctx.font = "600 11px ui-monospace, monospace"; ctx.textAlign = "left";
      ctx.fillText("grows " + cur.sag.toFixed(1) + " cm", e[0] - 40, e[1] + grow + 12);
    } else {
      var m = arcPt(CXc, CYc, R + BW / 2, (th0 + th1) / 2);
      ctx.fillStyle = withAlpha(col.keep, 0.9); ctx.font = "600 11px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText("lies to the curve", m[0], m[1] + 4);
    }
  }

  // the weave, printed across the strip at the cut angle
  function grainHatch(R, th0, th1, count, col, accent, ph) {
    ctx.strokeStyle = withAlpha(col.slate, 0.30); ctx.lineWidth = 1;
    var aRad = state.a * Math.PI / 180;
    for (var i = 1; i < count; i++) {
      var a = th0 + (th1 - th0) * i / count;
      var base = arcPt(CXc, CYc, R + 3, a), outr = arcPt(CXc, CYc, R + BW - 3, a);
      // two thread families: one along the strip turned by α, one across
      drawThread(base, outr, aRad);
      drawThread(base, outr, aRad + Math.PI / 2);
    }
  }

  function drawThread(base, outr, ang) {
    var mx = (base[0] + outr[0]) / 2, my = (base[1] + outr[1]) / 2;
    var len = 9;
    ctx.beginPath();
    ctx.moveTo(mx - Math.cos(ang) * len, my - Math.sin(ang) * len);
    ctx.lineTo(mx + Math.cos(ang) * len, my + Math.sin(ang) * len);
    ctx.stroke();
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE;
    var xFor = function (v) { return g.x0 + clamp(v, 0, g.max) / g.max * (g.x1 - g.x0); };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, g.y); ctx.lineTo(g.x1, g.y); ctx.stroke();
    // the demand marker, and the band of give that meets it without over-sagging
    var lo = xFor(cur.demand * MEET), demandX = xFor(cur.demand);
    var hi = xFor(cur.demand * MEET + SAGLIMIT / ((state.d / 100) * CLOTH[state.cloth].creep || 1));
    hi = Math.min(hi, g.x1);
    ctx.fillStyle = withAlpha(col.dead, 0.12); ctx.fillRect(g.x0, g.y - 8, lo - g.x0, 16);
    ctx.fillStyle = withAlpha(col.keep, 0.20); ctx.fillRect(lo, g.y - 8, hi - lo, 16);
    ctx.strokeStyle = col.keep; ctx.strokeRect(lo, g.y - 8, Math.max(1, hi - lo), 16);
    ctx.fillStyle = withAlpha(col.drift, 0.14); ctx.fillRect(hi, g.y - 8, g.x1 - hi, 16);
    // demand tick
    ctx.strokeStyle = withAlpha(col.slate, 0.8); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(demandX, g.y - 10); ctx.lineTo(demandX, g.y + 10); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    [[0, "stiff"], [10, "10%"], [20, "full bias"]].forEach(function (t) {
      var x = xFor(t[0]);
      ctx.strokeStyle = col.rule; ctx.beginPath(); ctx.moveTo(x, g.y + 9); ctx.lineTo(x, g.y + 13); ctx.stroke();
      ctx.fillText(t[1], x, g.y + 25);
    });
    ctx.textAlign = "left"; ctx.fillText("give the cut offers, vs the curve's demand", g.x0, g.y - 14);
    var nx = xFor(cur.give);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, g.y - 11); ctx.lineTo(nx, g.y + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, g.y - 11, 3, 0, 2 * Math.PI); ctx.fill();
  }

  function withAlpha(c, a) {
    if (c && c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c || "#888";
  }

  // ---- loop --------------------------------------------------------------
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = compute(state);
  var lastTs = null;
  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) sway += dt * 1.4;    // a slow settle of the hanging cloth, stilled if unwanted
    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

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
      var pre = state.a + " degrees to the weave, " + state.d + " centimetre drop, curve "
        + state.c + " percent, " + CLOTH[state.cloth].label + ". ";
      var msg;
      if (r.verdict === "dead") {
        msg = pre + "Stands stiff — the cut offers " + r.give.toFixed(1)
          + " percent give and the curve asks " + r.demand.toFixed(1)
          + ", so it will not sit. Cut it on the bias, or choose a softer cloth.";
      } else if (r.verdict === "drift") {
        msg = pre + "Grows — the give is enough to round it, but a piece this long grows "
          + r.sag.toFixed(1) + " centimetres and the hem sags. Ease the bias, or shorten the drop.";
      } else {
        msg = pre + "Hangs true — " + r.give.toFixed(1) + " percent give against a "
          + r.demand.toFixed(1) + " percent curve, growing " + r.sag.toFixed(1) + " centimetres.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inA.addEventListener("input", function () { state.a = parseInt(inA.value, 10); update(); });
  inD.addEventListener("input", function () { state.d = parseInt(inD.value, 10); update(); });
  inC.addEventListener("input", function () { state.c = parseInt(inC.value, 10); update(); });
  clothBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.cloth = b.dataset.cloth; update(); });
  });

  $("fix").addEventListener("click", function () {
    state.a = cutToBias(state); inA.value = state.a; update();
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inA.value = state.a; inD.value = state.d; inC.value = state.c; update();
  });

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  inA.value = state.a; inD.value = state.d; inC.value = state.c;
  update();
})();
