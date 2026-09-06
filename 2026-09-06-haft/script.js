/* Haft — the bench.
 *
 * A rigid tool held at a grip (the pivot O) is struck a blow of impulse J at a
 * distance x down the head. The blow both drives the tool sideways and spins it
 * about O, and the grip must supply whatever reaction P keeps the pivot in place.
 * Writing the linear and angular impulse together —
 *
 *   angular about O:   J · x = I_O · Δω           →  Δω = J·x / I_O
 *   linear:            J + P = m · d · Δω          [CoM at arm d rides at d·Δω]
 *
 * and eliminating Δω gives the reaction with almost nothing left in it:
 *
 *   P = J · ( m·d·x / I_O  −  1 )  =  J · ( x / L_cop  −  1 )
 *
 * because the centre of percussion sits at
 *
 *   L_cop = I_O / (m · d) = k² / d                 [k = √(I_O/m), radius of gyration]
 *
 * So the shock the hand feels is the blow, scaled by how far the strike sits past
 * the sweet spot as a fraction of the sweet-spot distance. Strike on it and P is
 * exactly zero, whatever the blow. Strike short (x < L_cop) and P flips forward —
 * the handle throws the hands on; strike long (x > L_cop) and P snaps them back.
 *
 * L_cop is also the centre of oscillation: the length of the simple pendulum that
 * swings from O in the tool's own time, T = 2π√(L_cop/g) — Huygens' reciprocal
 * point, Kater's knife-edge. Each tool below is a uniform shaft of mass m_s over
 * [0,L] plus a head mass m_h at position p; the grip choked up a distance c from
 * the butt. Moments are integrated exactly about the chosen grip. SI throughout;
 * centimetres and newton-seconds only at the surface, for the reader.
 */
(function () {
  "use strict";

  var G_ACC = 9.80665;       // gravity, m/s²
  var DEAD = 0.30;           // |P| ≤ this many N·s reads as dead in the hand
  var COMFORT = 1.10;        // |P| ≤ this many N·s is a sting a hand shrugs off

  // Each tool: uniform shaft m_s over [0,L] (m, kg) + head m_h (kg) at p (m).
  // Stylised masses — plausible, not measured — but the mechanics are exact.
  var TOOLS = {
    bat:    { label: "bat",             L: 0.86, ms: 0.72, mh: 0.30, p: 0.80 },
    hammer: { label: "framing hammer",  L: 0.40, ms: 0.22, mh: 0.62, p: 0.375 },
    axe:    { label: "felling axe",     L: 0.82, ms: 0.95, mh: 1.35, p: 0.78 },
    sword:  { label: "sword",           L: 0.95, ms: 0.62, mh: 0.10, p: 0.60 }
  };

  // Opens on a bat middled too far out — struck near the tip, past the sweet
  // spot, so the recoil snaps the hands back. Find the spot on arrival.
  var DEFAULT = { tool: "bat", strikePct: 96, choke: 0, swing: 5 };
  var KEY = "haft.tool.v1";     // where the tool in the hand is kept between visits

  var state = load() || Object.assign({}, DEFAULT);

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!TOOLS[o.tool]) return null;
      return {
        tool: o.tool,
        strikePct: clampNum(o.strikePct, 10, 100),
        choke: clampNum(o.choke, 0, 30),
        swing: clampNum(o.swing, 1, 8)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function clampNum(v, a, b) { v = Math.round(+v); if (!isFinite(v)) return a; return v < a ? a : v > b ? b : v; }

  // ---- the blow --------------------------------------------------------
  function blow(swing) { return 0.6 + swing * 0.9; }   // swing level 1..8 → J, N·s

  // ---- the tool --------------------------------------------------------
  function compute(s) {
    var t = TOOLS[s.tool];
    var L = t.L, ms = t.ms, mh = t.mh, p = t.p;
    var g = Math.min(s.choke / 100, L * 0.45);          // grip position from butt, m
    var exposed = L - g;                                // head length below the grip, m
    var m = ms + mh;

    // moment of inertia about the grip, exact for a uniform shaft + head point
    var lam = ms / L;
    var I_rod = lam * (Math.pow(L - g, 3) + Math.pow(g, 3)) / 3;
    var I_head = mh * (p - g) * (p - g);
    var I_O = I_rod + I_head;

    // first moment about the grip → pivot-to-centre-of-mass arm d (toward tip +)
    var fm_rod = ms * (L / 2 - g);
    var fm_head = mh * (p - g);
    var d = (fm_rod + fm_head) / m;

    var cop = I_O / (m * d);                            // centre of percussion from grip, m
    var k = Math.sqrt(I_O / m);                         // radius of gyration about grip, m
    var period = 2 * Math.PI * Math.sqrt(cop / G_ACC);  // equal-pendulum period, s

    var x = (s.strikePct / 100) * exposed;              // strike distance from grip, m
    var J = blow(s.swing);
    var P = J * (x / cop - 1);                          // grip reaction, N·s (+ back, − forward)

    var mag = Math.abs(P);
    var verdict;
    if (mag <= DEAD) verdict = "dead";
    else if (x < cop) verdict = mag <= COMFORT ? "push" : "jar";
    else verdict = mag <= COMFORT ? "catch" : "snap";

    return {
      L: L, g: g, exposed: exposed, m: m, d: d, I_O: I_O, cop: cop, k: k,
      period: period, headPos: p, x: x, J: J, P: P, mag: mag, verdict: verdict
    };
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inX = $("in-X"), inC = $("in-C"), inS = $("in-S");
  var labX = $("lab-X"), labC = $("lab-C"), labS = $("lab-S");
  var toolBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-tool]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var xMark = $("x-mark"), xNote = $("x-note");
  var X_MIN = 10, X_MAX = 100;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var SWING_WORD = ["", "light", "easy", "steady", "solid", "firm", "hard", "heavy", "full"];

  function syncLabels(r) {
    labX.textContent = Math.round(r.x * 100) + " cm";
    labC.textContent = state.choke + " cm";
    labS.textContent = SWING_WORD[state.swing];
    toolBtns.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.tool === state.tool));
    });
  }

  var VERDICT_TEXT = {
    jar:   { cls: "v-dead",  word: "Jarred forward", note: "struck short — handle throws the hands on" },
    push:  { cls: "v-drift", word: "Pushing on",     note: "a little short, inside comfort" },
    dead:  { cls: "v-keep",  word: "Dead in the hand", note: "the whole blow goes to the target" },
    catch: { cls: "v-drift", word: "Catching back",  note: "a little long, inside comfort" },
    snap:  { cls: "v-dead",  word: "Snapped back",   note: "struck long — the tip snaps the hands back" }
  };

  function severity(v) {
    if (v === "dead") return "good";
    if (v === "push" || v === "catch") return "warn";
    return "bad";
  }

  function render(r) {
    var v = VERDICT_TEXT[r.verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var sev = severity(r.verdict);
    var dir = r.P > 0.001 ? " back" : (r.P < -0.001 ? " forward" : "");
    var copPct = Math.round(r.cop / r.exposed * 100);
    var off = (r.x - r.cop) * 100;                       // cm past the sweet spot
    var offStr, offCls;
    if (Math.abs(off) < 0.5) { offStr = "on it"; offCls = "good"; }
    else {
      var s = off > 0 ? "+" : "−";
      var tail = off > 0 ? " long" : " short";
      offStr = s + Math.abs(Math.round(off)) + "<span class=\"unit\"> cm" + tail + "</span>";
      offCls = r.mag <= DEAD ? "good" : (r.mag <= COMFORT ? "warn" : "bad");
    }

    var rows = [
      ["Sweet spot", Math.round(r.cop * 100) + "<span class=\"unit\"> cm · " + copPct + "%</span>", ""],
      ["Hand reaction", r.mag.toFixed(2) + "<span class=\"unit\"> N·s" + dir + "</span>", sev],
      ["Off the sweet spot", offStr, offCls],
      ["Radius of gyration", Math.round(r.k * 100) + "<span class=\"unit\"> cm</span>", ""]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markSweet(r);
  }

  // put the sweet spot on the strike-point slider track, so the dial reads to it
  function markSweet(r) {
    if (!xMark || !xNote) return;
    var copPct = r.cop / r.exposed * 100;               // where the spot falls on the slider
    var frac = clamp((copPct - X_MIN) / (X_MAX - X_MIN), 0, 1);
    xMark.style.left = (frac * 100) + "%";
    xMark.className = "x-mark" + (copPct < X_MIN || copPct > X_MAX ? " off" : "");
    var off = Math.round((r.x - r.cop) * 100);
    var tail = Math.abs(off) <= 1 ? "on the sweet spot"
      : (off > 0 ? off + " cm past it" : Math.abs(off) + " cm short of it");
    xNote.innerHTML = "sweet spot at <b>" + Math.round(r.cop * 100) + " cm</b> · " + tail;
  }

  // ---- the stage (canvas) ----------------------------------------------
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
  function withAlpha(c, a) {
    if (c.charAt(0) === "#" && c.length === 7) {
      var n = parseInt(c.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }
    return c;
  }

  // tool laid along an axis from the grip, down and to the right
  var GRIP = { x: 92, y: 150 };
  var PXSPAN = 356;                                   // exposed length → this many px
  var AX = { c: Math.cos(0.30), s: Math.sin(0.30) };  // axis unit vector (18° below horizontal)
  var NRM = { x: -AX.s, y: AX.c };                    // transverse (down-left is +, "back")
  var GAUGE = { x0: 44, x1: 476, y: 344 };

  function along(r_m, exposed) {                       // metres from grip → canvas point
    var px = (r_m / exposed) * PXSPAN;
    return { x: GRIP.x + AX.c * px, y: GRIP.y + AX.s * px };
  }

  // eased display state, so a drag reads as a slide and Find reads as a settle
  var shown = { xPx: 0, react: 0 };
  var buzzT = 0, lastTs = null, initShown = false;

  function draw(cur) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), slate: cssVar("--slate"), wood: cssVar("--wood"),
      forge: cssVar("--forge"), keep: cssVar("--keep"), drift: cssVar("--drift"),
      dead: cssVar("--dead"), field: cssVar("--field"), field2: cssVar("--field-2")
    };
    var accent = cur.verdict === "dead" ? col.keep
      : (cur.verdict === "push" || cur.verdict === "catch") ? col.drift : col.dead;

    ctx.clearRect(0, 0, W, H);

    var exposed = cur.exposed;
    var tip = along(exposed, exposed);
    var headStart = along(Math.max(0, cur.headPos - cur.g - exposed * 0.14), exposed);

    // ---- the wooden haft, tapering from grip toward the head ----
    ctx.strokeStyle = col.wood; ctx.lineCap = "round";
    ctx.lineWidth = 5.5; ctx.beginPath();
    ctx.moveTo(GRIP.x, GRIP.y); ctx.lineTo(headStart.x, headStart.y); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath();
    ctx.moveTo(headStart.x, headStart.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();

    // ---- the iron head, sized by the head mass, on the head position ----
    var headC = along(clamp(cur.headPos - cur.g, 0, exposed), exposed);
    var hr = 9 + Math.sqrt(TOOLS[state.tool].mh) * 11;
    ctx.save();
    ctx.translate(headC.x, headC.y);
    ctx.rotate(Math.atan2(AX.s, AX.c));
    ctx.fillStyle = col.slate;
    roundRect(-hr * 0.7, -hr * 0.6, hr * 1.9, hr * 1.2, 4); ctx.fill();
    ctx.fillStyle = withAlpha(col.field, 0.25);
    roundRect(-hr * 0.7 + 3, -hr * 0.6 + 3, hr * 0.6, hr * 1.2 - 6, 2); ctx.fill();
    ctx.restore();

    // ---- the grip: a ring where the hands close ----
    ctx.strokeStyle = col.slate; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(GRIP.x, GRIP.y, 11, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = col.field2;
    ctx.beginPath(); ctx.arc(GRIP.x, GRIP.y, 8, 0, 2 * Math.PI); ctx.fill();

    // ---- centre of mass ----
    var comP = along(cur.d, exposed);
    ctx.fillStyle = col.ink;
    ctx.beginPath(); ctx.arc(comP.x, comP.y, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = col.field; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(comP.x, comP.y, 4, 0, 2 * Math.PI); ctx.stroke();
    label(ctx, col.faint, "CoM", comP.x, comP.y - 14, "center");

    // ---- the sweet spot: a lit band across the tool at L_cop ----
    var copP = along(clamp(cur.cop, 0, exposed), exposed);
    var band = 15;
    ctx.strokeStyle = withAlpha(col.keep, 0.85); ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(copP.x - NRM.x * band, copP.y - NRM.y * band);
    ctx.lineTo(copP.x + NRM.x * band, copP.y + NRM.y * band);
    ctx.stroke();
    ctx.fillStyle = withAlpha(col.keep, 0.16);
    ctx.beginPath(); ctx.arc(copP.x, copP.y, 13, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.keep, "sweet spot", copP.x + NRM.x * 30, copP.y + NRM.y * 30 + 3, "center");

    // ---- the strike: an amber blow onto the tool at x ----
    var xPx = shown.xPx;
    var strikeP = { x: GRIP.x + AX.c * xPx, y: GRIP.y + AX.s * xPx };
    var inLen = 26;
    var from = { x: strikeP.x - NRM.x * inLen, y: strikeP.y - NRM.y * inLen };
    arrow(ctx, col.forge, from.x, from.y, strikeP.x, strikeP.y, 2.6, 8);
    ctx.fillStyle = withAlpha(col.forge, 0.9);
    ctx.beginPath(); ctx.arc(strikeP.x, strikeP.y, 3.4, 0, 2 * Math.PI); ctx.fill();
    label(ctx, col.forge, "blow", from.x - NRM.x * 8, from.y - NRM.y * 8, "center");

    // ---- the reaction at the grip: the jolt the hand takes ----
    var reactPx = shown.react;                          // signed px along +NRM (back)
    var buzz = Math.min(cur.mag, 3) * 0.11 * Math.sin(buzzT * 26);
    var amp = reactPx + (cur.mag > DEAD ? buzz * (reactPx >= 0 ? 1 : -1) * 6 : 0);
    if (Math.abs(amp) > 1.5) {
      var rt = { x: GRIP.x + NRM.x * amp, y: GRIP.y + NRM.y * amp };
      arrow(ctx, accent, GRIP.x, GRIP.y, rt.x, rt.y, 3, 9);
      var lab = amp > 0 ? "hands back" : "hands forward";
      label(ctx, accent, lab, rt.x + NRM.x * 12, rt.y + NRM.y * 12, "center");
    } else {
      label(ctx, col.keep, "hands quiet", GRIP.x, GRIP.y + 26, "center");
    }

    label(ctx, col.faint, "grip", GRIP.x - 4, GRIP.y - 18, "right");
    label(ctx, col.soft, "the head →", tip.x - 8, tip.y + 22, "right");

    drawGauge(col, accent, cur);
  }

  function drawGauge(col, accent, cur) {
    var g = GAUGE, midY = g.y;
    var span = Math.max(cur.cop, cur.exposed - cur.cop) * 100 + 3;   // cm each side of the spot
    var xFor = function (cm) {
      var c = clamp(cm, -span, span);
      return g.x0 + (c + span) / (2 * span) * (g.x1 - g.x0);
    };
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.x0, midY); ctx.lineTo(g.x1, midY); ctx.stroke();

    // dead band, where |P| ≤ DEAD
    var deadCm = DEAD / cur.J * cur.cop * 100;
    var dx0 = xFor(-deadCm), dx1 = xFor(deadCm);
    ctx.fillStyle = withAlpha(col.keep, 0.20);
    ctx.fillRect(dx0, midY - 9, dx1 - dx0, 18);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(dx0, midY - 9, dx1 - dx0, 18);

    // comfort walls, where |P| = COMFORT — they close in as the swing grows
    var comfCm = COMFORT / cur.J * cur.cop * 100;
    [-comfCm, comfCm].forEach(function (cm) {
      if (Math.abs(cm) > span) return;
      var x = xFor(cm);
      ctx.strokeStyle = withAlpha(col.dead, 0.8); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x, midY - 13); ctx.lineTo(x, midY + 13); ctx.stroke();
    });

    ctx.fillStyle = col.faint; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center";
    ctx.fillText("sweet spot", xFor(0), midY - 15);
    ctx.textAlign = "left"; ctx.fillText("short · forward", g.x0, midY + 26);
    ctx.textAlign = "right"; ctx.fillText("long · back", g.x1, midY + 26);
    ctx.textAlign = "left";

    // needle at the current strike offset
    var off = (cur.x - cur.cop) * 100;
    var pinned = Math.abs(off) > span;
    var nx = xFor(off);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nx, midY - 12); ctx.lineTo(nx, midY + 12); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx, midY - 12, 3, 0, 2 * Math.PI); ctx.fill();
    if (pinned) {
      var dir = off > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(nx + dir * 4, midY - 12);
      ctx.lineTo(nx + dir * 11, midY - 15);
      ctx.lineTo(nx + dir * 11, midY - 9);
      ctx.closePath(); ctx.fill();
    }
  }

  // ---- small canvas helpers --------------------------------------------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function arrow(c, color, x0, y0, x1, y1, w, head) {
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    var a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
    c.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
    c.closePath(); c.fill();
  }
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);

  function targets(cur) {
    return {
      xPx: (cur.x / cur.exposed) * PXSPAN,
      react: clamp(cur.P * 16, -78, 78)
    };
  }

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    buzzT += dt;

    var tg = targets(current);
    if (!initShown) { shown.xPx = tg.xPx; shown.react = tg.react; initShown = true; }
    var ease = Math.min(1, dt * 13);
    shown.xPx += (tg.xPx - shown.xPx) * ease;
    shown.react += (tg.react - shown.react) * ease;

    draw(current);
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
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
      var head = SWING_WORD[state.swing] + " swing of the " + TOOLS[state.tool].label
        + ", struck " + Math.round(r.x * 100) + " centimetres down"
        + (state.choke ? ", choked up " + state.choke + " centimetres" : "") + ". ";
      var spot = "Sweet spot at " + Math.round(r.cop * 100) + " centimetres. ";
      var dir = r.P > 0.001 ? "back" : "forward";
      var mag = r.mag.toFixed(2);
      var msg;
      if (r.verdict === "dead") {
        msg = head + spot + "Dead in the hand — the whole blow goes to the target, the grip carries nothing.";
      } else if (r.verdict === "jar") {
        msg = head + spot + "Jarred forward — struck short, " + mag + " newton-seconds throws the hands on, past comfort.";
      } else if (r.verdict === "snap") {
        msg = head + spot + "Snapped back — struck long, " + mag + " newton-seconds snaps the hands back, past comfort.";
      } else {
        msg = head + spot + (r.verdict === "push" ? "Pushing on" : "Catching back")
          + " — " + mag + " newton-seconds " + dir + ", inside comfort.";
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inX.addEventListener("input", function () { state.strikePct = parseInt(inX.value, 10); update(); });
  inC.addEventListener("input", function () { state.choke = parseInt(inC.value, 10); update(); });
  inS.addEventListener("input", function () { state.swing = parseInt(inS.value, 10); update(); });
  toolBtns.forEach(function (b) {
    b.addEventListener("click", function () { state.tool = b.dataset.tool; update(); });
  });

  $("find").addEventListener("click", function () {
    var r = compute(state);
    var pct = clamp(Math.round(r.cop / r.exposed * 100), X_MIN, X_MAX);
    animateStrike(pct);
  });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inX.value = state.strikePct; inC.value = state.choke; inS.value = state.swing;
    update();
  });

  // ease the strike point to a target so a move reads as a slide, not a jump
  function animateStrike(target) {
    var start = state.strikePct, t0 = null, dur = 480;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var pr = Math.min(1, (ts - t0) / dur);
      var e = pr < 0.5 ? 2 * pr * pr : 1 - Math.pow(-2 * pr + 2, 2) / 2;
      state.strikePct = Math.round(start + (target - start) * e);
      inX.value = state.strikePct;
      update();
      if (pr < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current); });
  }

  // ---- go --------------------------------------------------------------
  inX.value = state.strikePct; inC.value = state.choke; inS.value = state.swing;
  update();
})();
