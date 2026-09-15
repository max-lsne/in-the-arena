/* Cotter — the bench.
 *
 * A flat tapered key driven through a slot draws two members together and, cut
 * shallow enough, holds them there without a nut. Everything the key does is set
 * by its taper t (its rise per length, the 1 in the fitter's "1 : n") against the
 * friction μ on its two bearing faces, given a draw T the joint must hold:
 *
 *   draw per blow   T / F = 1 / (t + 2μ)      (the mechanical advantage)
 *   drive to seat   F     = T · (t + 2μ)
 *   self-locking    t ≤ 2μ                    (the taper gentler than the friction)
 *   lock margin     m     = 2μ / t            (≥ 1 holds; large means seized)
 *   release         F_out = T · (2μ − t)      (>0 must be struck out; <0 creeps)
 *
 * Steepen the taper and the key seats and frees easily but, past the friction,
 * will not stay; flatten it and the hold and the pull both grow without bound,
 * until it seizes. The taper sets how the draw is held, never how large it is —
 * so the members' limits (the key in shear, the bearing in crushing, the member
 * torn across its slot) turn on the draw alone, and no taper relieves them.
 *
 * The four joints are stylised — plausible sections, frictions and design loads,
 * not measured — but the forces drawn from them are exact. Newtons throughout;
 * kN only at the surface, for the reader.
 */
(function () {
  "use strict";

  // Each joint pairs a friction μ on the key's faces with three capacities — the
  // bearing (crushing of the softer member), the key (double shear), and the
  // member torn across its slot — a design draw T_ref, and the timber or metal it
  // is cut in. Stylised — plausible, not measured. Forces in newtons.
  var JOINTS = {
    strap: { label: "strap", mu: 0.50, Tref: 24000, capB: 26000,  capS: 66000,  capR: 54000,  material: "an elm strap and an oak key",        note: "a light strap and wooden key" },
    rod:   { label: "rod",   mu: 0.11, Tref: 58000, capB: 150000, capS: 82000,  capR: 140000, material: "a steel gib and cotter",             note: "a connecting-rod gib and cotter" },
    beam:  { label: "beam",  mu: 0.16, Tref: 86000, capB: 82000,  capS: 235000, capR: 150000, material: "an oak tie and an iron key",         note: "an oak tie drawn up by a cotter" },
    stay:  { label: "stay",  mu: 0.13, Tref: 60000, capB: 280000, capS: 120000, capR: 66000,  material: "a slender wrought-iron stay",        note: "a slender iron stay" }
  };

  // Opens on the steel rod cut to a bold 1 : 3 — steeper than its slick faces can
  // lock, so the key creeps back out under the draw — at 88% of its design load.
  // Find the taper on arrival cuts the key fine enough to hold.
  var DEFAULT = { joint: "rod", rN: 3, load: 88 };
  var RMIN = 3, RMAX = 42, RSTEP = 1;         // taper 1 : rN, bold to fine
  var LMIN = 20, LMAX = 160, LSTEP = 4;
  var MTARGET = 2.6;                          // the lock margin a good taper aims for
  var SEIZE = 5.0;                            // above this margin the key is seized
  var LOCK = 1.0;                             // below this it creeps out under load
  var KEY = "cotter.joint.v1";               // where the joint, draw and taper are kept between visits

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clampStep(v, a, b, step) {
    v = Math.round((+v) / step) * step;
    if (!isFinite(v)) return a;
    return v < a ? a : v > b ? b : v;
  }

  // ---- persistence -----------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!JOINTS[o.joint]) return null;
      return {
        joint: o.joint,
        rN: clampStep(o.rN, RMIN, RMAX, RSTEP),
        load: clampStep(o.load, LMIN, LMAX, LSTEP)
      };
    } catch (e) { return null; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || Object.assign({}, DEFAULT);

  // ---- the joint -------------------------------------------------------
  // Every force from the taper and the draw as a share of the design load.
  function compute(s) {
    var J = JOINTS[s.joint];
    var mu = J.mu, t = 1 / s.rN, alpha = Math.atan(t);

    var T = s.load / 100 * J.Tref;             // the draw the members must hold
    var lock = 2 * mu / t;                     // margin; ≥1 self-locking, large = seized
    var Fdrive = T * (t + 2 * mu);             // blow needed to seat it
    var Frelease = T * (2 * mu - t);           // >0 must be struck out; <0 creeps
    var MA = 1 / (t + 2 * mu);                 // draw won per unit of drive

    var uB = T / J.capB, uS = T / J.capS, uR = T / J.capR;

    // draw %, as a share of T_ref, at which each part reaches its limit. Member
    // forces scale with the draw, so this is just the current load / u; and it is
    // independent of the taper — the key sets how the load is held, not its size.
    var pB = s.load / uB, pS = s.load / uS, pR = s.load / uR;
    var pSafe = Math.min(pB, pS, pR);

    var bind = uB >= uS && uB >= uR ? "bearing" : uS >= uR ? "key" : "rod";
    var over = Math.max(uB, uS, uR) > 1 + 1e-9;

    return {
      J: J, mu: mu, t: t, alpha: alpha,
      T: T, lock: lock, Fdrive: Fdrive, Frelease: Frelease, MA: MA,
      uB: uB, uS: uS, uR: uR, pB: pB, pS: pS, pR: pR,
      pSafe: pSafe, safeW: pSafe / 100 * J.Tref, bind: bind, over: over
    };
  }

  // the taper that locks with a comfortable margin — secure yet still strikeable.
  // Since lock = 2μ/t = 2μ·rN is monotonic in rN, the target rN is exact.
  function findTaper(s) {
    var J = JOINTS[s.joint];
    var rN = MTARGET / (2 * J.mu);
    return clamp(Math.round(rN / RSTEP) * RSTEP, RMIN, RMAX);
  }

  function verdictOf(s, r) {
    if (r.over) return "over";
    if (r.lock < LOCK) return "loose";
    if (r.lock > SEIZE) return "seized";
    return "sound";
  }

  // ---- DOM -------------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  var inW = $("in-W"), inP = $("in-P");
  var labW = $("lab-W"), labP = $("lab-P");
  var jointBtns = Array.prototype.slice.call(document.querySelectorAll(".seg [data-joint]"));
  var verdictEl = $("verdict"), readingEl = $("reading"), stageEl = $("stage"), sayEl = $("say");
  var pMark = $("p-mark"), pNote = $("p-note");

  function fmtkN(N) {
    var kN = N / 1000;
    return (kN >= 10 ? Math.round(kN) : Math.round(kN * 10) / 10) + " kN";
  }

  function syncLabels(r) {
    labW.textContent = state.load + "% · " + fmtkN(r.T);
    labP.textContent = "1 : " + state.rN;
    jointBtns.forEach(function (bn) {
      bn.setAttribute("aria-pressed", String(bn.dataset.joint === state.joint));
    });
  }

  var VERDICT_TEXT = {
    sound:  { cls: "v-keep",  word: "Holds",       note: "self-locking, and still strikes free" },
    seized: { cls: "v-drift", word: "Seized",      note: "holds, but too fine to strike out" },
    loose:  { cls: "v-drift", word: "Works loose", note: "too steep to lock — it creeps out under load" }
  };
  var OVER_NOTE = {
    bearing: "the bearing crushed past its limit",
    key:     "the key sheared past its limit",
    rod:     "the member torn across its slot"
  };

  function uClass(u) { return u >= 1 ? "bad" : u >= 0.85 ? "warn" : "good"; }

  function render(r) {
    var verdict = verdictOf(state, r);
    var v = verdict === "over"
      ? { cls: "v-dead", word: "Overstressed", note: OVER_NOTE[r.bind] }
      : VERDICT_TEXT[verdict];
    verdictEl.className = "verdict " + v.cls;
    verdictEl.innerHTML = '<span class="dot"></span><span>' + v.word + "</span><small>" + v.note + "</small>";

    var bindWord = { bearing: "bearing", key: "key", rod: "member" }[r.bind];
    var carryCls = r.over ? "bad" : (verdict === "sound" ? "good" : "warn");
    var holdCls = r.lock < LOCK ? "bad" : r.lock > SEIZE ? "warn" : "good";
    var holdWord = r.lock < LOCK ? "creeps" : r.lock > SEIZE ? "seized" : "holds";

    var rows = [
      ["Taper", "1 : " + state.rN + '<span class="unit"> · ' + (r.alpha * 180 / Math.PI).toFixed(1) + "°</span>", ""],
      ['Bearing <span class="tag c">crush</span>', fmtkN(r.T) + '<span class="unit"> / ' + fmtkN(r.J.capB) + "</span>", uClass(r.uB)],
      ['Key <span class="tag">shear</span>', fmtkN(r.T) + '<span class="unit"> / ' + fmtkN(r.J.capS) + "</span>", uClass(r.uS)],
      ['Member <span class="tag">tear</span>', fmtkN(r.T) + '<span class="unit"> / ' + fmtkN(r.J.capR) + "</span>", uClass(r.uR)],
      ["Hold", "×" + r.lock.toFixed(1) + '<span class="unit"> · ' + holdWord + "</span>", holdCls],
      ["Carries", fmtkN(r.safeW) + '<span class="unit"> · ' + bindWord + "</span>", carryCls]
    ];
    readingEl.innerHTML = rows.map(function (row) {
      return '<div class="row"><span class="k">' + row[0] + '</span><span class="v ' + row[2] + '">' + row[1] + "</span></div>";
    }).join("");

    markTaper();
    return verdict;
  }

  // mark, under the taper slider, the taper the joint wants
  function markTaper() {
    if (!pMark || !pNote) return;
    var opt = findTaper(state);
    var cur = compute(state);
    pMark.style.left = ((opt - RMIN) / (RMAX - RMIN) * 100) + "%";
    pMark.className = "x-mark" + (cur.over ? " off" : "");
    if (cur.over) pNote.innerHTML = "no taper holds this draw — ease it or widen the bearing";
    else if (Math.abs(opt - state.rN) <= 1) pNote.innerHTML = "the taper this joint wants: <b>1 : " + opt + "</b>";
    else pNote.innerHTML = "locks with margin at <b>1 : " + opt + "</b>";
  }

  // ---- the stage (canvas) ----------------------------------------------
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  stageEl.appendChild(canvas);
  var W = 520, H = 440, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function sizeCanvas() {
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = "100%"; canvas.style.aspectRatio = W + " / " + H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  sizeCanvas();

  var reduceMQ = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceMQ ? reduceMQ.matches : false;

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

  // joint geometry, canvas space
  var CY = 250, SLOTX = 236, KTOP = 176, KBOT = 300;

  // eased display state, so a change of taper reads as the key growing finer or
  // bolder rather than jumping, and a change of draw as the members closing
  var shown = { rN: DEFAULT.rN, load: DEFAULT.load, seat: 0 };
  var lastTs = null, initShown = false;

  function memCol(col, u, warm) {
    if (u >= 1) return col.dead;
    if (u >= 0.85) return col.drift;
    return warm ? col.timber : col.iron;
  }
  function keyW(u) { return 4 + clamp(u, 0, 1) * 3.2; }

  function draw(cur, verdict) {
    var col = {
      ink: cssVar("--ink"), soft: cssVar("--ink-soft"), faint: cssVar("--ink-faint"),
      rule: cssVar("--rule"), field: cssVar("--field"), field2: cssVar("--field-2"),
      timber: cssVar("--timber"), timber2: cssVar("--timber-2"),
      iron: cssVar("--iron"), iron2: cssVar("--iron-2"),
      keep: cssVar("--keep"), drift: cssVar("--drift"), dead: cssVar("--dead")
    };
    var accent = verdict === "sound" ? col.keep
      : verdict === "over" ? col.dead : col.drift;

    ctx.clearRect(0, 0, W, H);

    // ---- the two members, drawn together by the key ----
    // the draw closes a small gap between them; show it eased
    var gap = 8 * (1 - clamp(shown.seat, 0, 1)) + 2;
    var mh = 30;                                   // member height
    // left member: a spigot running in from the left to the slot
    var lx0 = 40, lx1 = SLOTX - gap;
    rectStroke(col, lx0, CY - mh / 2, lx1 - lx0, mh, memCol(col, cur.uB, true), 2);
    // right member: a socket strapping the spigot's line past the slot
    var rx0 = SLOTX + gap, rx1 = 356;              // stops short of the friction cone
    var sh = 12;
    rectStroke(col, rx0, CY - mh / 2 - sh, rx1 - rx0, sh, memCol(col, cur.uB, true), 2);
    rectStroke(col, rx0, CY + mh / 2, rx1 - rx0, sh, memCol(col, cur.uB, true), 2);
    rectStroke(col, rx1 - 10, CY - mh / 2 - sh, 10, mh + 2 * sh, memCol(col, cur.uB, true), 2);
    label(ctx, col.faint, "socket", rx1 - 8, CY + mh / 2 + sh + 14, "right");

    // ---- the tapered key through the slot ----
    // draw its taper a touch bold so a fine key still reads; the true 1:n is labelled
    var t = cur.t;
    var headHalf = clamp(4 + t * 120, 5, 20);      // widening with the taper
    var pointHalf = 3;
    var kx = SLOTX;
    var kAtY = function (y) { return headHalf + (pointHalf - headHalf) * (y - KTOP) / (KBOT - KTOP); };
    var kc = memCol(col, cur.uS, false);
    ctx.fillStyle = withAlpha(kc, 0.16);
    ctx.strokeStyle = kc; ctx.lineWidth = keyW(cur.uS); ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(kx - headHalf, KTOP);
    ctx.lineTo(kx + headHalf, KTOP);
    ctx.lineTo(kx + pointHalf, KBOT);
    ctx.lineTo(kx - pointHalf, KBOT);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // head cap
    ctx.fillStyle = kc; ctx.fillRect(kx - headHalf - 2, KTOP - 6, 2 * headHalf + 4, 6);
    label(ctx, col.iron2, "cotter", kx - headHalf - 8, KTOP + 2, "right");

    // bearing faces where the key squeezes the slot walls
    var bcol = cur.uB >= 1 ? col.dead : cur.uB >= 0.85 ? col.drift : col.timber2;
    var yt = CY - mh / 2, yl = CY + mh / 2;
    ctx.strokeStyle = bcol; ctx.lineWidth = 3.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(kx - kAtY(yt), yt); ctx.lineTo(kx - kAtY(yl), yl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(kx + kAtY(yt), yt); ctx.lineTo(kx + kAtY(yl), yl); ctx.stroke();
    ctx.lineCap = "butt";

    // ---- the drive that seats the key (a blow on the head) ----
    arrow(ctx, accent, kx, KTOP - 30, kx, KTOP - 10, 2.4, 8);
    label(ctx, accent, "drive " + fmtkN(cur.Fdrive), kx, KTOP - 36, "center");

    // ---- the draw pulled up in the members ----
    var dcol = col.iron2;
    arrow(ctx, dcol, lx0 + 70, CY, lx0 + 34, CY, 2, 7);
    arrow(ctx, dcol, rx1 - 40, CY, rx1 - 4, CY, 2, 7);
    label(ctx, dcol, "draw " + fmtkN(cur.T), lx0 + 74, CY + mh / 2 + 16, "left");

    // ---- the release, or the creep ----
    if (cur.Frelease < 0) {
      // not self-locking: the key is worked out by the load
      arrow(ctx, col.dead, kx + headHalf + 26, KTOP + 22, kx + headHalf + 26, KTOP - 2, 1.8, 7);
      label(ctx, col.dead, "creeps out", kx + headHalf + 32, KTOP + 16, "left");
    } else {
      label(ctx, col.faint, "strike free " + fmtkN(cur.Frelease), kx + headHalf + 12, KTOP + 4, "left");
    }

    // ---- taper label ----
    label(ctx, col.soft, "1 : " + state.rN, kx, KBOT + 16, "center");

    // ---- legend ----
    legend(col);

    // ---- the friction cone ----
    drawCone(col, cur);

    // ---- the gauge ----
    drawGauge(col, accent, cur);
  }

  // the friction cone: the key's taper angle α against the self-locking limit,
  // the friction angle of the two faces φ = atan(2μ). Inside the cone (α ≤ φ) the
  // key locks; outside it creeps. Angles are small, so they are drawn exaggerated
  // by a fixed factor — the comparison, not the absolute slope, is what reads.
  function drawCone(col, cur) {
    var ix = 372, iy = 36, iw = 132, ih = 150, pad = 18;
    ctx.fillStyle = withAlpha(col.field2, 0.9);
    roundRect(ix, iy, iw, ih, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();
    label(ctx, col.faint, "friction cone", ix + 10, iy + 16, "left");

    var Ox = ix + pad, Oy = iy + ih - pad, L = iw - 2 * pad;
    var EX = 3.4;                                  // exaggeration for legibility
    var phi = Math.atan(2 * cur.mu), a = cur.alpha;
    var riseFor = function (ang) { return clamp(L * Math.tan(ang) * EX, 0, ih - 2 * pad - 8); };
    var rl = riseFor(phi), ra = riseFor(a);

    // the locking cone (up to the friction limit) as a faint fill
    ctx.fillStyle = withAlpha(col.keep, 0.12);
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + L, Oy); ctx.lineTo(Ox + L, Oy - rl); ctx.closePath(); ctx.fill();

    // baseline
    ctx.strokeStyle = withAlpha(col.faint, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + L, Oy); ctx.stroke();

    // the friction limit ray (the edge of the cone)
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + L, Oy - rl); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, col.keep, "2μ", Ox + L + 2, Oy - rl + 3, "left");

    // the key's taper ray
    var locks = cur.lock >= LOCK;
    var kc = cur.over ? col.dead : locks ? col.iron2 : col.dead;
    ctx.strokeStyle = kc; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(Ox, Oy); ctx.lineTo(Ox + L, Oy - ra); ctx.stroke();
    label(ctx, kc, "α", Ox + L + 2, Oy - ra + 3, "left");

    label(ctx, col.faint, locks ? "inside · locks" : "outside · creeps", ix + 10, Oy + 12, "left");
  }

  function legend(col) {
    var lx = 40, ly = 24;
    swatch(col.timber, lx, ly); label(ctx, col.soft, "members · bearing", lx + 14, ly + 4, "left");
    swatch(col.iron, lx, ly + 16); label(ctx, col.soft, "cotter · the draw", lx + 14, ly + 20, "left");
  }
  function swatch(c, x, y) {
    ctx.fillStyle = c; ctx.fillRect(x, y - 4, 9, 5);
  }

  function drawGauge(col, accent, cur) {
    var bx = 24, by = 352, bw = W - 48, bh = 66;
    ctx.fillStyle = withAlpha(col.field2, 0.96);
    roundRect(bx, by, bw, bh, 8); ctx.fill();
    ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.stroke();

    var gx0 = 64, gx1 = W - 64, gy = 390, scaleMax = 160;
    var xFor = function (p) { return gx0 + clamp(p, 0, scaleMax) / scaleMax * (gx1 - gx0); };

    ctx.strokeStyle = col.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy); ctx.lineTo(gx1, gy); ctx.stroke();

    // green band the joint safely holds
    var gh = xFor(cur.pSafe);
    ctx.fillStyle = withAlpha(col.keep, 0.22);
    ctx.fillRect(gx0, gy - 8, gh - gx0, 16);
    ctx.strokeStyle = col.keep; ctx.lineWidth = 1;
    ctx.strokeRect(gx0, gy - 8, gh - gx0, 16);

    // the binding limit — the break wall
    ctx.strokeStyle = withAlpha(col.dead, 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(gh, gy - 12); ctx.lineTo(gh, gy + 12); ctx.stroke();

    // the next limit behind, as a dashed tick
    var second = secondLimit(cur);
    if (second.p > cur.pSafe + 0.5 && second.p <= scaleMax) {
      var gs = xFor(second.p);
      ctx.strokeStyle = withAlpha(col.soft, 0.7); ctx.lineWidth = 1.4; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(gs, gy - 12); ctx.lineTo(gs, gy + 12); ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, col.faint, second.word, gs, gy + 24, "center");
    }

    label(ctx, col.faint, "no draw", gx0, gy + 24, "left");
    label(ctx, col.faint, "holds", (gx0 + gh) / 2, gy - 13, "center");
    label(ctx, col.faint, cur.bind, gh, gy + 24, "center");

    // needle at the current draw
    var nX = xFor(state.load);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(nX, gy - 11); ctx.lineTo(nX, gy + 11); ctx.stroke();
    ctx.beginPath(); ctx.arc(nX, gy - 11, 3, 0, 2 * Math.PI); ctx.fill();
  }

  // the second-nearest limit, to mark behind the binding one
  function secondLimit(cur) {
    var arr = [
      { p: cur.pB, word: "bearing" },
      { p: cur.pS, word: "key" },
      { p: cur.pR, word: "member" }
    ].sort(function (a, b) { return a.p - b.p; });
    return arr[1];
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
  function rectStroke(col, x, y, w, h, color, lw) {
    ctx.fillStyle = withAlpha(color, 0.08);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.strokeRect(x, y, w, h);
  }
  function line(p0, p1, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    ctx.lineCap = "butt";
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
    c.lineCap = "butt";
  }
  function label(c, color, text, x, y, align) {
    c.fillStyle = color; c.font = "11px ui-monospace, monospace";
    c.textAlign = align || "left"; c.fillText(text, x, y);
    c.textAlign = "left";
  }

  // ---- loop ------------------------------------------------------------
  var current = compute(state);
  var curVerdict = verdictOf(state, current);

  function frame(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    var ease = reduce ? 1 : Math.min(1, dt * 11);
    if (!initShown) { shown.rN = state.rN; shown.load = state.load; shown.seat = 1; initShown = true; }
    shown.rN += (state.rN - shown.rN) * ease;
    shown.load += (state.load - shown.load) * ease;
    // the seat closes toward 1 as the draw is applied; a fresh joint eases shut
    shown.seat += (1 - shown.seat) * ease;

    // the drawn key follows the eased taper
    current.t = 1 / shown.rN;
    draw(current, curVerdict);
    current.t = 1 / state.rN;
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);

  // ---- wiring ----------------------------------------------------------
  function update() {
    current = compute(state);
    syncLabels(current);
    curVerdict = render(current);
    announce(current, curVerdict);
    save();
  }

  // ---- screen-reader status (debounced, so dragging a slider doesn't chatter) ----
  var sayTimer = null;
  function announce(r, verdict) {
    if (!sayEl) return;
    if (sayTimer) clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      var kT = Math.round(r.T / 1000), kF = Math.round(r.Fdrive / 1000);
      var joint = r.J.material.charAt(0).toUpperCase() + r.J.material.slice(1);
      var head = joint + ", drawn to " + state.load + " percent of its design load with the key cut to a taper of one in "
        + state.rN + ". ";
      var forces = "The draw is " + kT + " kilonewtons, seated by a drive of " + kF
        + "; the bearing carries " + Math.round(r.uB * 100) + " percent of its crushing limit, the key "
        + Math.round(r.uS * 100) + " percent of its shear, the member " + Math.round(r.uR * 100) + " percent of its tension.";
      var msg;
      if (verdict === "sound") {
        msg = head + "Holds — the taper is shallower than the friction with margin to spare, self-locking and still strikeable, and every part sits inside its limit. " + forces;
      } else if (verdict === "seized") {
        msg = head + "Seized — self-locking, but far too fine: it seats only under a heavy blow and will not strike free. "
          + "Cut a bolder taper, or find the taper. " + forces;
      } else if (verdict === "loose") {
        msg = head + "Works loose — the taper is steeper than the friction, so the key is not self-locking and creeps out under the load. "
          + "Cut a finer taper, or find the taper. " + forces;
      } else {
        var who = r.bind === "bearing" ? "the bearing has crushed past its limit under the draw"
          : r.bind === "key" ? "the key has sheared past its limit"
          : "the member has torn across the slot its section is left with";
        msg = head + "Overstressed — " + who + ". No taper relieves it — ease the draw or widen the bearing. " + forces;
      }
      sayEl.textContent = msg;
    }, 260);
  }

  inW.addEventListener("input", function () { state.load = parseInt(inW.value, 10); update(); });
  inP.addEventListener("input", function () { state.rN = parseInt(inP.value, 10); update(); });
  jointBtns.forEach(function (bn) {
    bn.addEventListener("click", function () { state.joint = bn.dataset.joint; update(); });
  });

  $("find").addEventListener("click", function () { animateTaper(findTaper(state)); });
  $("reset").addEventListener("click", function () {
    state = Object.assign({}, DEFAULT);
    inW.value = state.load; inP.value = state.rN;
    update();
  });

  // cut the key toward the target taper so it is seen to grow finer or bolder —
  // under reduced motion it lands in one step
  function animateTaper(target) {
    if (reduce || Math.abs(target - state.rN) < 1) { state.rN = target; inP.value = target; update(); return; }
    var dir = target > state.rN ? RSTEP : -RSTEP;
    (function step() {
      state.rN = clamp(state.rN + dir, RMIN, RMAX);
      inP.value = state.rN; update();
      if (Math.abs(state.rN - target) >= 1) setTimeout(step, 22);
    })();
  }

  // nudge a slider-backed value by a step, from the keyboard
  function nudge(field, delta, lo, hi, step, input) {
    state[field] = Math.round(clamp(state[field] + delta, lo, hi) / step) * step;
    input.value = state[field];
    update();
  }

  // keyboard: work the bench without reaching for the mouse
  var JOINT_KEYS = { "1": "strap", "2": "rod", "3": "beam", "4": "stay" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && el.tagName === "INPUT" && el.type === "range") return;   // let a focused slider keep its arrows
    var k = e.key;
    if (k === "f" || k === "F") { $("find").click(); }
    else if (k === "r" || k === "R") { $("reset").click(); }
    else if (JOINT_KEYS[k]) { state.joint = JOINT_KEYS[k]; update(); }
    else if (k === "[") { nudge("rN", -2, RMIN, RMAX, RSTEP, inP); }         // a bolder, steeper taper
    else if (k === "]") { nudge("rN", 2, RMIN, RMAX, RSTEP, inP); }          // a finer, shallower taper
    else if (k === "-" || k === "_") { nudge("load", -LSTEP, LMIN, LMAX, LSTEP, inW); }  // ease the draw
    else if (k === "=" || k === "+") { nudge("load", LSTEP, LMIN, LMAX, LSTEP, inW); }   // add draw
    else return;
    e.preventDefault();
  });

  // follow a live change to the motion setting
  if (reduceMQ && reduceMQ.addEventListener) {
    reduceMQ.addEventListener("change", function (e) { reduce = e.matches; });
  }

  // repaint on theme flips so canvas colours follow
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { draw(current, curVerdict); });
  }

  // ---- go --------------------------------------------------------------
  inW.value = state.load; inP.value = state.rN;
  update();
})();
