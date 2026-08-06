/* Cant — the bench.
 *
 * A train on a curve is thrown outward with an acceleration v²/R, and the only
 * thing the track can do about it is decide which way "down" points. Raise the
 * outer rail above the inner by an amount E — the cant, or superelevation — and
 * the track tilts by an angle θ with
 *
 *   tan θ  =  E / G                          [G = transverse rail spacing]
 *
 * so a slice g·(E/G) of gravity is turned inward, against the throw. The two
 * cancel exactly at one speed, the balancing (equilibrium) speed:
 *
 *   V_e  =  √( g · E · R / G )                [E, G in metres]
 *
 * At any other speed the track is canted for the wrong throw, and the mismatch
 * is expressed as the extra cant that speed *would* have wanted — the cant
 * deficiency (positive) or excess (negative):
 *
 *   E_d  =  G · v² / (g · R)  −  E            [the running speed's wanted cant, less applied]
 *
 * and the unbalanced sideways acceleration the passenger feels falls straight
 * out of it:
 *
 *   a_lat  =  g · E_d / G
 *
 * Two walls bound E_d, and they are different walls. Deficiency (running fast,
 * leaning out) is capped by ride comfort and, past it, by the outer wheel
 * climbing the rail — a limit that rises with stiffer stock (loco-hauled →
 * multiple unit → tilting). Excess (running slow on a high cant, leaning in) is
 * capped by inner-rail wear and by a stopped train leaning toward the ditch. And
 * the applied cant E itself is ceilinged near 150–180 mm by that same stopped
 * train. G is taken as 1.500 m, the conventional distance between rail contact
 * points. SI throughout; millimetres only at the surface, for the reader.
 */
(function () {
  "use strict";

  var G_ACC = 9.80665;       // gravity, m/s²
  var GAUGE = 1.500;         // transverse spacing of the rail contact points, m
  var E_EXCESS = 110;        // cant-excess wall (inner), mm — fixed by the slow/stopped train
  var BAND = 25;             // |deficiency| ≤ this many mm reads as in balance
  var E_CAP = 180;           // applied-cant ceiling, mm (the stopped train's wall)

  // deficiency wall (outer), mm — how much lean-out each kind of train can carry
  var STOCK = {
    loco: { label: "loco-hauled",   Ed: 110 },
    unit: { label: "multiple unit",  Ed: 150 },
    tilt: { label: "tilting",        Ed: 300 }
  };

  // Opens on a curve canted too low for the express that runs it: a big
  // deficiency, thrown to the high rail. Cant it true on arrival — or find that
  // a tilting set could take it as it stands.
  var DEFAULT = { R: 1000, E: 40, V: 120, stock: "loco" };
  var KEY = "cant.curve.v1";     // where the curve is kept between visits

  var state = load() || Object.assign({}, DEFAULT);

  // ---- persistence -------------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (typeof o.R !== "number" || !STOCK[o.stock]) return null;
      return {
        R: clampNum(o.R, 300, 2500),
        E: clampNum(o.E, 0, E_CAP),
        V: clampNum(o.V, 40, 220),
        stock: o.stock
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function clampNum(v, a, b) { v = +v; if (!isFinite(v)) return a; return v < a ? a : v > b ? b : v; }

  // ---- the curve ---------------------------------------------------------
  function compute(s) {
    var v = s.V / 3.6;                                   // running speed, m/s
    var wanted = GAUGE * v * v / (G_ACC * s.R) * 1000;   // cant the speed wants, mm
    var Ed = wanted - s.E;                               // deficiency (+) / excess (−), mm
    var Ve = Math.sqrt(G_ACC * (s.E / 1000) * s.R / GAUGE) * 3.6;  // balancing speed, km/h
    var aLat = G_ACC * (Ed / 1000) / GAUGE;              // unbalanced lateral accel, m/s² (signed: + out)

    var EdLim = STOCK[s.stock].Ed;

    var verdict;
    if (Ed > EdLim) verdict = "thrown";
    else if (Ed < -E_EXCESS) verdict = "slide";
    else if (Math.abs(Ed) <= BAND) verdict = "balance";
    else if (Ed > 0) verdict = "wide";
    else verdict = "list";

    // room in line speed to the nearest wall the running point is heading for
    var kmh = function (cantMm) { return Math.sqrt((cantMm / 1000) * G_ACC * s.R / GAUGE) * 3.6; };
    var room, roomWall;
    if (Ed >= 0) {                       // outer (deficiency) wall is the near one
      room = kmh(s.E + EdLim) - s.V;     // + can speed up, − already past
      roomWall = "out";
    } else {                             // inner (excess) wall is the near one, below us
      var inner = s.E - E_EXCESS;
      if (inner <= 0) { room = Infinity; roomWall = "in"; }   // can slow to a stand without sliding
      else { room = s.V - kmh(inner); roomWall = "in"; }
    }

    return {
      wanted: wanted, Ed: Ed, Ve: Ve, aLat: aLat,
      EdLim: EdLim, verdict: verdict, room: room, roomWall: roomWall
    };
  }

  // applied cant that nulls the throw for the present speed and radius
  function trueCant(s) {
    var v = s.V / 3.6;
    var wanted = GAUGE * v * v / (G_ACC * s.R) * 1000;   // mm
    return clamp(Math.round(wanted / 5) * 5, 0, E_CAP);
  }

  // ---- DOM ---------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inR = $("in-R"), inE = $("in-E"), inV = $("in-V");
  var labR = $("lab-R"), labE = $("lab-E"), labV = $("lab-V");
  var stockBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-stock]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var veMark = $("ve-mark"), veNote = $("ve-note");
  var V_MIN = 40, V_MAX = 220;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function syncLabels() {
    labR.textContent = state.R + " m";
    labE.textContent = state.E + " mm";
    labV.textContent = state.V + " km/h";
    stockBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.stock === state.stock));
    });
  }

  var VERDICT_TEXT = {
    slide:   { cls: "v-dead",  word: "Sliding in",   note: "cant excess — drags the inner rail" },
    list:    { cls: "v-drift", word: "Leaning in",   note: "some excess, inside the wall" },
    balance: { cls: "v-keep",  word: "In balance",   note: "the throw is cancelled" },
    wide:    { cls: "v-drift", word: "Running wide",  note: "some deficiency, inside the wall" },
    thrown:  { cls: "v-dead",  word: "Thrown out",   note: "deficiency past the limit" }
  };

  function severity(v) {
    if (v === "balance") return "good";
    if (v === "wide" || v === "list") return "warn";
    return "bad";                 // thrown / slide
  }

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var sev = severity(r.verdict);
    var edSign = r.Ed > 0.5 ? "+" : (r.Ed < -0.5 ? "−" : "");
    var edDir = r.Ed > 0.5 ? " out" : (r.Ed < -0.5 ? " in" : "");
    var forceDir = r.Ed > 0.5 ? " out" : (r.Ed < -0.5 ? " in" : "");
    var roomStr, roomCls;
    if (!isFinite(r.room)) { roomStr = "clear"; roomCls = "good"; }
    else {
      var rr = Math.round(r.room);
      roomStr = (rr < 0 ? "−" : "") + Math.abs(rr) + "<span class=\"unit\"> km/h</span>";
      roomCls = rr < 0 ? "bad" : (rr <= 20 ? "warn" : "good");
    }

    var rows = [
      ["Balancing speed", Math.round(r.Ve) + "<span class=\"unit\"> km/h</span>", ""],
      ["Cant deficiency", edSign + Math.abs(Math.round(r.Ed)) + "<span class=\"unit\"> mm" + edDir + "</span>", sev],
      ["Side force", Math.abs(r.aLat).toFixed(2) + "<span class=\"unit\"> m/s²" + forceDir + "</span>", sev],
      ["Room to the wall", roomStr, roomCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markBalance(r);
  }

  // put the balancing speed on the line-speed track, so the dial reads against it
  function markBalance(r) {
    if (!veMark || !veNote) return;
    var ve = Math.round(r.Ve);
    var frac = clamp((r.Ve - V_MIN) / (V_MAX - V_MIN), 0, 1);
    veMark.style.left = (frac * 100) + "%";
    veMark.className = "ve-mark" + (r.Ve < V_MIN || r.Ve > V_MAX ? " off" : "");
    var diff = Math.round(state.V - r.Ve);
    var tail = Math.abs(diff) <= 2 ? "at the balancing speed"
      : (diff > 0 ? diff + " km/h over balance" : Math.abs(diff) + " km/h under balance");
    veNote.innerHTML = "balances at <b>" + ve + " km/h</b> · " + tail;
  }

  // ---- the stage (canvas cross-section) ----------------------------------
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
  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  // cross-section geometry
  var CX = 250, HALF = 95, RUN = 2 * HALF;   // inner→outer horizontal span, px
  var BASE_Y = 250;                          // inner-rail contact height
  var RISE_MAX = 72;                         // px the outer rail lifts at E = 180 mm
  var GAUGE_G = { x0: 44, x1: 476, y: 374 }; // deficiency gauge baseline

  function riseApplied(E) { return (E / E_CAP) * RISE_MAX; }
  function riseWanted(cantMm) { return clamp((cantMm / E_CAP) * RISE_MAX, 0, 120); }
  function visAngle(rise) { return Math.atan2(rise, RUN); }  // tilt toward outer, rad

  // eased display state, so a change reads as a lean, not a jump
  var shown = { rise: riseApplied(DEFAULT.E), want: riseWanted(0) };
  var swayT = 0, lastTs = null;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), steel: cssVar("--steel"),
      lamp: cssVar("--lamp"), keep: cssVar("--keep"), drift: cssVar("--drift"),
      dead: cssVar("--dead"), field: cssVar("--field"), field2: cssVar("--field-2")
    };
    var accent = cur.verdict === "balance" ? col.keep
      : (cur.verdict === "wide" || cur.verdict === "list") ? col.drift : col.dead;

    ctx.clearRect(0, 0, W, H);

    var rise = shown.rise;
    var innerP = { x: CX - HALF, y: BASE_Y };
    var outerP = { x: CX + HALF, y: BASE_Y - rise };
    var midP = { x: CX, y: (innerP.y + outerP.y) / 2 };
    var angPlane = Math.atan2(outerP.y - innerP.y, outerP.x - innerP.x);  // up-to-the-right, negative

    // ---- ballast ----
    ctx.fillStyle = withAlpha(col.slate, 0.10);
    ctx.beginPath();
    ctx.moveTo(innerP.x - 30, innerP.y + 8);
    ctx.lineTo(outerP.x + 30, outerP.y + 8);
    ctx.lineTo(outerP.x + 62, innerP.y + 74);
    ctx.lineTo(innerP.x - 62, innerP.y + 74);
    ctx.closePath(); ctx.fill();

    // ---- sleeper ----
    ctx.strokeStyle = col.slate; ctx.lineWidth = 9; ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(innerP.x - 22, innerP.y + 6); ctx.lineTo(outerP.x + 22, outerP.y + 6);
    ctx.stroke();

    // ---- rails (short heads standing off the sleeper, perpendicular to it) ----
    var nrm = { x: Math.sin(angPlane), y: -Math.cos(angPlane) };  // outward-normal (up from track)
    [innerP, outerP].forEach(function (p) {
      var top = { x: p.x + nrm.x * 8, y: p.y + nrm.y * 8 };
      ctx.strokeStyle = col.steel; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    });

    // ---- vehicle body, riding the tilt ----
    ctx.save();
    ctx.translate(midP.x, midP.y - 8);
    ctx.rotate(angPlane);
    var bw = 176, bh = 96, by = -bh - 18;
    roundRect(-bw / 2, by, bw, bh, 12);
    ctx.fillStyle = col.field2; ctx.fill();
    ctx.strokeStyle = col.slate; ctx.lineWidth = 2; ctx.stroke();
    // windows
    ctx.fillStyle = withAlpha(col.steel, 0.30);
    for (var wI = 0; wI < 4; wI++) {
      roundRect(-bw / 2 + 18 + wI * 38, by + 16, 28, 24, 4); ctx.fill();
    }
    // solebar
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-bw / 2 + 6, by + bh - 6); ctx.lineTo(bw / 2 - 6, by + bh - 6); ctx.stroke();
    ctx.restore();

    // ---- wheels at the two contacts ----
    ctx.fillStyle = col.slate;
    [innerP, outerP].forEach(function (p) {
      var c = { x: p.x + nrm.x * 12, y: p.y + nrm.y * 12 };
      ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = col.field; ctx.beginPath(); ctx.arc(c.x, c.y, 3, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = col.slate;
    });

    // ---- the forces, from the centre of mass ----
    var com = { x: midP.x + nrm.x * 58, y: midP.y - 8 + nrm.y * 58 };
    var Lref = 78, Lres = 88;

    // true vertical (gravity reference)
    ctx.strokeStyle = withAlpha(col.faint, 0.9); ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(com.x, com.y); ctx.lineTo(com.x, com.y + Lref); ctx.stroke();
    ctx.setLineDash([]);

    // floor-down (the track's idea of "down": tilted toward outer by the applied cant)
    var phi = visAngle(rise);
    ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(com.x, com.y);
    ctx.lineTo(com.x + Math.sin(phi) * Lref, com.y + Math.cos(phi) * Lref); ctx.stroke();
    ctx.setLineDash([]);

    // resultant (apparent down: tilted toward outer by the cant the speed wants)
    var sway = (reduce || cur.verdict === "balance") ? 0 : Math.sin(swayT * 2.2) * 0.012;
    var beta = visAngle(shown.want) + sway;
    var tip = { x: com.x + Math.sin(beta) * Lres, y: com.y + Math.cos(beta) * Lres };
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(com.x, com.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    // arrowhead
    var ah = 8, aA = Math.atan2(tip.y - com.y, tip.x - com.x);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - ah * Math.cos(aA - 0.4), tip.y - ah * Math.sin(aA - 0.4));
    ctx.lineTo(tip.x - ah * Math.cos(aA + 0.4), tip.y - ah * Math.sin(aA + 0.4));
    ctx.closePath(); ctx.fill();
    // plumb bob + CoM dot
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 4.5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = col.ink; ctx.beginPath(); ctx.arc(com.x, com.y, 3, 0, 2 * Math.PI); ctx.fill();

    // ---- labels ----
    ctx.font = "11px ui-monospace, monospace"; ctx.fillStyle = col.faint;
    ctx.textAlign = "center";
    ctx.fillText("inner · low", innerP.x, BASE_Y + 60);
    ctx.fillText("outer · high", outerP.x, BASE_Y + 60);
    ctx.textAlign = "left"; ctx.fillStyle = col.soft;
    ctx.fillText("← to the curve's centre", 16, 26);

    // ---- deficiency gauge ----
    drawGauge(col, accent, cur);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE_G, midY = g.y;
    var span = Math.max(cur.EdLim, E_EXCESS) + 60;   // mm at the gauge ends
    var xFor = function (mm) {
      var c = clamp(mm, -span, span);
      return g.x0 + (c + span) / (2 * span) * (g.x1 - g.x0);
    };
    // baseline
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, midY); ctx.lineTo(g.x1, midY); ctx.stroke();

    // balance band
    var bx0 = xFor(-BAND), bx1 = xFor(BAND);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(bx0, midY - 9, bx1 - bx0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(bx0, midY - 9, bx1 - bx0, 18);

    // the two walls
    var wall = function (mm, label) {
      var x = xFor(mm);
      ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, midY - 13); ctx.lineTo(x, midY + 13); ctx.stroke();
      ctx.fillStyle = col.faint; ctx.font = "9px ui-monospace, monospace"; ctx.textAlign = "center";
      ctx.fillText(label, x, midY + 26);
    };
    wall(-E_EXCESS, "excess");
    wall(cur.EdLim, "deficiency");

    // ends + centre
    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("balance", xFor(0), midY - 16);
    ctx.textAlign = "left"; ctx.fillText("leans in", g.x0, midY - 16);
    ctx.textAlign = "right"; ctx.fillText("leans out", g.x1, midY - 16);
    ctx.textAlign = "left";

    // needle at the current deficiency
    var pinned = Math.abs(cur.Ed) > span;
    var nx = xFor(cur.Ed);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, midY - 12); ctx.lineTo(nx, midY + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, midY - 12, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) {
      var dir = cur.Ed > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(nx + dir * 4, midY - 12);
      ctx.lineTo(nx + dir * 11, midY - 15);
      ctx.lineTo(nx + dir * 11, midY - 9);
      ctx.closePath(); ctx.fill();
    }
  }

  // ---- loop --------------------------------------------------------------
  var current = compute(state);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!reduce) swayT += dt;

    var tRise = riseApplied(state.E);
    var tWant = riseWanted(current.wanted);
    var ease = Math.min(1, dt * 12);
    shown.rise += (tRise - shown.rise) * ease;
    shown.want += (tWant - shown.want) * ease;

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
      var head = state.R + " metre curve, " + state.E + " mm cant, " + state.V
        + " km per hour, " + STOCK[state.stock].label + ". ";
      var ed = Math.abs(Math.round(r.Ed));
      var msg;
      if (r.verdict === "balance") {
        msg = head + "In balance — the throw is cancelled, balancing speed " + Math.round(r.Ve) + ".";
      } else if (r.verdict === "thrown") {
        msg = head + "Thrown out — " + ed + " millimetres of cant deficiency, past the limit; "
          + Math.abs(r.aLat).toFixed(2) + " metres per second squared toward the outer rail.";
      } else if (r.verdict === "slide") {
        msg = head + "Sliding in — " + ed + " millimetres of cant excess, past the limit; the load drags the inner rail.";
      } else if (r.verdict === "wide") {
        msg = head + "Running wide — " + ed + " millimetres of deficiency, inside the wall; leaning out.";
      } else {
        msg = head + "Leaning in — " + ed + " millimetres of excess, inside the wall.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inR.addEventListener("input", function () { state.R = parseInt(inR.value, 10); update(); });
  inE.addEventListener("input", function () { state.E = parseInt(inE.value, 10); update(); });
  inV.addEventListener("input", function () { state.V = parseInt(inV.value, 10); update(); });
  stockBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.stock = b.dataset.stock; update(); });
  });

  $("cant").addEventListener("click", function () { animateCant(trueCant(state)); });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inR.value = state.R; inE.value = state.E; inV.value = state.V;
    update();
  });

  // ease the applied cant to a target so a trim reads as a lift, not a jump
  function animateCant(target) {
    var start = state.E, t0 = null, dur = 520;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      state.E = Math.round(start + (target - start) * e);
      inE.value = state.E;
      update();
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  // nudge the applied cant by a small step (keyboard trimming)
  function nudgeCant(delta) {
    state.E = clamp(state.E + delta, 0, E_CAP);
    inE.value = state.E;
    update();
  }

  // keyboard: the bench under the hands, without reaching for the mouse
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    // let a focused slider keep its own arrow keys
    if (el && el.tagName === "INPUT" && el.type === "range") return;
    var k = e.key;
    if (k === "c" || k === "C") { $("cant").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (k === "1") { state.stock = "loco"; update(); }
    else if (k === "2") { state.stock = "unit"; update(); }
    else if (k === "3") { state.stock = "tilt"; update(); }
    else if (k === "[") { nudgeCant(-5); }   // less tilt — leans out
    else if (k === "]") { nudgeCant(5); }     // more tilt — leans in
    else return;
    e.preventDefault();
  });

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // ---- go ----------------------------------------------------------------
  inR.value = state.R; inE.value = state.E; inV.value = state.V;
  update();
})();
