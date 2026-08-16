/* Gnomon — a bench for the sundial's one moving part: the shadow of a fixed rod.
 * In the arena, 2026-08-16.
 *
 * One equation runs the whole instrument. Where the sun stands above the horizon
 * is set by sin a = sin φ·sin δ + cos φ·cos δ·cos H — the latitude φ of the place,
 * the declination δ of the sun for the day, and the hour angle H, fifteen degrees
 * for every hour the sky has turned from noon. From the altitude a the shadow
 * follows at once: it lies opposite the sun's bearing, and a rod of height h throws
 * a shadow h/tan a long. Let a whole day run and the shadow's tip traces a conic —
 * a straight line at the equinox, a hyperbola on every other day. That is the
 * gnomon, and the reading of it is gnomonics.
 */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var D2R = Math.PI / 180;
  var R2D = 180 / Math.PI;

  // geometry of the viewBox — a plan view, north up, the rod at the centre
  var VB = 560;
  var CX = 280, CY = 286;
  var DIAL_R = 208;                   // the compass ring
  var MAX_R = DIAL_R - 8;             // shadows drawn no further than this
  var SCALE = 116;                    // svg units per rod-height of shadow

  var LAT_MIN = -85, LAT_MAX = 85;
  var DAY_MIN = 1, DAY_MAX = 365;
  var T_MIN = 0, T_MAX = 1440;        // time slider, minutes past midnight (solar)

  var RUN_RATE = 72;                  // sim-minutes per real second when running

  var DEFAULTS = { lat: 51, day: 156, time: 624 };   // 51°N, Jun 5, 10:24
  var STORE_KEY = "arena.gnomon.v1";

  var state = { lat: DEFAULTS.lat, day: DEFAULTS.day, time: DEFAULTS.time, running: false };

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var MDAYS = [31,28,31,30,31,30,31,31,30,31,30,31];
  var CARD = ["N","NE","E","SE","S","SW","W","NW"];

  // ---- element handles ----
  var svg = document.getElementById("stageSvg");
  var latRange = document.getElementById("latRange");
  var dayRange = document.getElementById("dayRange");
  var timeRange = document.getElementById("timeRange");
  var runBtn = document.getElementById("runBtn");
  var noonBtn = document.getElementById("noonBtn");
  var resetBtn = document.getElementById("resetBtn");

  var el = {
    caseName: document.getElementById("readCase"),
    eq: document.getElementById("rbEq"),
    alt: document.getElementById("rfAlt"),
    az: document.getElementById("rfAz"),
    len: document.getElementById("rfLen"),
    dir: document.getElementById("rfDir"),
    dec: document.getElementById("rfDec"),
    curve: document.getElementById("rfCurve"),
    latVal: document.getElementById("latVal"),
    dayVal: document.getElementById("dayVal"),
    timeVal: document.getElementById("timeVal"),
    status: document.getElementById("status")
  };

  // ---- small helpers ----
  function make(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) { if (attrs.hasOwnProperty(k)) node.setAttribute(k, attrs[k]); }
    return node;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function mod360(d) { d = d % 360; return d < 0 ? d + 360 : d; }
  function cardinal(bearing) { return CARD[Math.round(mod360(bearing) / 45) % 8]; }

  function hhmm(minutes) {
    var m = Math.round(minutes);
    var h = Math.floor(m / 60) % 24;
    var mm = ((m % 60) + 60) % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  // Keep the dial as you left it, across visits — the place, the day and the
  // time on the slider, but not whether it was running (a page should not start
  // sweeping the sun the moment it opens).
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        lat: state.lat, day: state.day, time: Math.round(state.time)
      }));
    } catch (e) { /* private mode or full quota — the dial still works */ }
  }
  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && typeof s.lat === "number" && isFinite(s.lat)) state.lat = clamp(Math.round(s.lat), LAT_MIN, LAT_MAX);
      if (s && typeof s.day === "number" && isFinite(s.day)) state.day = clamp(Math.round(s.day), DAY_MIN, DAY_MAX);
      if (s && typeof s.time === "number" && isFinite(s.time)) state.time = clamp(Math.round(s.time), T_MIN, T_MAX);
    } catch (e) { /* malformed or unreadable — fall back to defaults */ }
  }

  function dateLabel(day) {
    var d = clamp(Math.round(day), 1, 365), i = 0;
    while (i < 12 && d > MDAYS[i]) { d -= MDAYS[i]; i++; }
    return MONTHS[i] + " " + d;
  }

  // The sun's tilt for the day — swinging ±23.44° across the year, zero at the
  // equinoxes. (Cooper's approximation; a fraction of a degree is plenty here.)
  function declination(day) {
    return 23.44 * Math.sin(D2R * (360 / 365 * (day + 284)));
  }

  // Everything the bench shows, worked straight from the altitude equation.
  function solve() {
    var phi = state.lat * D2R;
    var dec = declination(state.day);
    var delta = dec * D2R;
    var t = state.time / 60;                     // solar hours
    var Hdeg = 15 * (t - 12);                    // hour angle from the meridian
    var H = Hdeg * D2R;

    var sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H);
    sinAlt = clamp(sinAlt, -1, 1);
    var alt = Math.asin(sinAlt);                 // radians

    // azimuth from south, +west (Meeus); carried round to a compass bearing
    var azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi));
    var azNorth = mod360(azSouth * R2D + 180);   // 0 = N, 90 = E, 180 = S, 270 = W
    var bearing = mod360(azNorth + 180);         // the shadow lies opposite the sun

    var up = alt > 0;
    var lenH = up ? 1 / Math.tan(alt) : Infinity;   // shadow length in rod-heights

    // when does the sun rise and set, and what shape does the day draw
    var cosH0 = -Math.tan(phi) * Math.tan(delta);
    var polarDay = cosH0 <= -1, polarNight = cosH0 >= 1;
    var H0 = polarDay ? Math.PI : (polarNight ? 0 : Math.acos(clamp(cosH0, -1, 1)));
    var dayLen = 2 * (H0 * R2D) / 15;               // hours of daylight
    var sunrise = 12 - (H0 * R2D) / 15;
    var sunset = 12 + (H0 * R2D) / 15;

    var curve;
    if (polarNight) curve = "none (polar night)";
    else if (polarDay) curve = "ellipse";
    else if (Math.abs(dec) < 0.35) curve = "straight line";
    else curve = "hyperbola";

    return {
      phi: phi, dec: dec, delta: delta, t: t, H: H, Hdeg: Hdeg,
      alt: alt, altDeg: alt * R2D, azNorth: azNorth, bearing: bearing,
      up: up, lenH: lenH, polarDay: polarDay, polarNight: polarNight,
      dayLen: dayLen, sunrise: sunrise, sunset: sunset, curve: curve
    };
  }

  // altitude at a given hour angle, for the day-curve sampling
  function altAt(phi, delta, H) {
    return Math.asin(clamp(Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(H), -1, 1));
  }
  function bearingAt(phi, delta, H) {
    var azSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi));
    return mod360(azSouth * R2D + 180 + 180);
  }

  // plan-view mapping: bearing (compass, from north) + length in rod-heights -> px
  function project(bearing, lenH) {
    var r = lenH * SCALE;
    var b = bearing * D2R;
    return { x: CX + r * Math.sin(b), y: CY - r * Math.cos(b) };
  }
  function edgePoint(bearing) {
    var b = bearing * D2R;
    return { x: CX + DIAL_R * Math.sin(b), y: CY - DIAL_R * Math.cos(b) };
  }

  // ---- drawing ----
  function draw(s) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.appendChild(make("rect", { x: 4, y: 4, width: VB - 8, height: VB - 8, rx: 14, class: "svg-frame" }));

    // compass ring + ticks
    svg.appendChild(make("circle", { cx: CX, cy: CY, r: DIAL_R, class: "dial-ring" }));
    for (var a = 0; a < 360; a += 15) {
      var p0 = edgePoint(a), inner = (a % 90 === 0) ? DIAL_R - 16 : DIAL_R - 8;
      var b = a * D2R;
      svg.appendChild(make("line", {
        x1: p0.x, y1: p0.y, x2: CX + inner * Math.sin(b), y2: CY - inner * Math.cos(b),
        class: (a % 90 === 0) ? "compass-tick" : "compass-tick-minor"
      }));
    }
    label(CX, CY - DIAL_R - 8, "middle", "N", "compass-label");
    label(CX + DIAL_R + 12, CY + 4, "middle", "E", "compass-label");
    label(CX, CY + DIAL_R + 20, "middle", "S", "compass-label");
    label(CX - DIAL_R - 12, CY + 4, "middle", "W", "compass-label");

    // the day-curve — the whole day's path of the shadow tip
    drawDayCurve(s);

    // the current shadow, sun and rod
    if (s.up) {
      drawShadow(s);
      drawSun(s);
    }
    drawRod();

    if (!s.up) {
      var when = (s.t <= s.sunrise || s.polarNight) ? "before sunrise" : "after sunset";
      label(CX, CY + 44, "middle", s.polarNight ? "polar night" : ("no shadow — " + when), "axis-label");
    }
  }

  function drawDayCurve(s) {
    if (s.polarNight) return;
    var lo = s.polarDay ? -180 : (s.sunrise - 12) * 15;
    var hi = s.polarDay ? 180 : (s.sunset - 12) * 15;
    var pts = [], step = (hi - lo) / 160;
    for (var Hd = lo; Hd <= hi + 1e-6; Hd += step) {
      var H = Hd * D2R;
      var alt = altAt(s.phi, s.delta, H);
      if (alt <= 0.5 * D2R) continue;
      var lenH = 1 / Math.tan(alt);
      if (lenH * SCALE > MAX_R) continue;         // runs off the dial near the horizon
      var p = project(bearingAt(s.phi, s.delta, H), lenH);
      pts.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
    }
    if (pts.length > 1) {
      svg.appendChild(make("polyline", { points: pts.join(" "), class: "day-curve" }));
    }

    // whole-hour marks along the curve
    var h0 = Math.ceil(s.polarDay ? 0 : s.sunrise);
    var h1 = Math.floor(s.polarDay ? 24 : s.sunset);
    for (var hr = h0; hr <= h1; hr++) {
      var Hh = (hr - 12) * 15 * D2R;
      var altH = altAt(s.phi, s.delta, Hh);
      if (altH <= 0.5 * D2R) continue;
      var lh = 1 / Math.tan(altH);
      if (lh * SCALE > MAX_R) continue;
      var q = project(bearingAt(s.phi, s.delta, Hh), lh);
      var isNow = Math.abs(hr - s.t) < 0.5;
      svg.appendChild(make("circle", { cx: q.x, cy: q.y, r: isNow ? 4 : 2.6, class: "hour-dot" + (isNow ? " is-now" : "") }));
      if (hr % 2 === 0) {
        var lp = project(bearingAt(s.phi, s.delta, Hh), lh + 0.16);
        label(lp.x, lp.y + 3, "middle", String(hr), "hour-label");
      }
    }
  }

  function drawShadow(s) {
    var draw = Math.min(s.lenH, MAX_R / SCALE);
    var tip = project(s.bearing, draw);
    svg.appendChild(make("line", { x1: CX, y1: CY, x2: tip.x, y2: tip.y, class: "shadow-line" }));
    if (s.lenH * SCALE > MAX_R) {
      // the true tip is off the dial — carry a dashed hint to the edge
      var e = edgePoint(s.bearing);
      svg.appendChild(make("line", { x1: tip.x, y1: tip.y, x2: e.x, y2: e.y, class: "shadow-run" }));
    } else {
      svg.appendChild(make("circle", { cx: tip.x, cy: tip.y, r: 5.5, class: "shadow-tip" }));
    }
  }

  function drawSun(s) {
    var e = edgePoint(s.azNorth);
    var sx = CX + (DIAL_R - 18) * Math.sin(s.azNorth * D2R);
    var sy = CY - (DIAL_R - 18) * Math.cos(s.azNorth * D2R);
    svg.appendChild(make("line", { x1: e.x, y1: e.y, x2: CX, y2: CY, class: "sun-ray" }));
    svg.appendChild(make("circle", { cx: sx, cy: sy, r: 12, class: "sun-halo" }));
    // the higher the sun, the fuller the disc
    var rad = 5 + 4 * Math.max(0, Math.sin(s.alt));
    svg.appendChild(make("circle", { cx: sx, cy: sy, r: rad, class: "sun-body" }));
  }

  function drawRod() {
    svg.appendChild(make("line", { x1: CX, y1: CY, x2: CX, y2: CY - 20, class: "rod-hint" }));
    svg.appendChild(make("ellipse", { cx: CX, cy: CY, rx: 5.5, ry: 3, class: "rod-base" }));
  }

  function label(x, y, anchor, text, cls) {
    var t = make("text", { x: x, y: y, "text-anchor": anchor, class: cls || "axis-label" });
    t.textContent = text;
    svg.appendChild(t);
  }

  // ---- readout ----
  function paint(s) {
    var atNoon = Math.abs(s.t - 12) < 0.17 && s.up;   // within ~10 min of solar noon
    var cls = !s.up ? " is-night" : (atNoon ? " is-noon" : " is-day");
    el.caseName.textContent = hhmm(state.time);
    el.caseName.className = "read-num mono" + cls;

    el.eq.textContent = s.up
      ? "sin a = sin φ sin δ + cos φ cos δ cos H"
      : "the sun is below the horizon — no shadow to read";

    el.alt.textContent = (s.altDeg >= 0 ? "+" : "") + s.altDeg.toFixed(1) + "°";
    el.az.textContent = s.up ? (Math.round(s.azNorth) + "° " + cardinal(s.azNorth)) : "—";
    el.len.textContent = s.up ? shadowLenText(s.lenH) : "—";
    el.dir.textContent = s.up ? (Math.round(s.bearing) + "° " + cardinal(s.bearing)) : "—";
    el.dec.textContent = (s.dec >= 0 ? "+" : "") + s.dec.toFixed(1) + "°";
    el.curve.textContent = s.curve;

    el.latVal.textContent = Math.abs(state.lat) + "° " + (state.lat < 0 ? "S" : "N");
    el.dayVal.textContent = dateLabel(state.day) + " · δ " + (s.dec >= 0 ? "+" : "") + s.dec.toFixed(1) + "°";
    el.timeVal.textContent = hhmm(state.time);
  }

  function shadowLenText(lenH) {
    if (!isFinite(lenH) || lenH > 40) return "> 40 h";
    return lenH.toFixed(2) + " h";
  }

  // Speak the settled state, not every frame of the running day. A live region
  // written on every swept frame would flood a screen reader, so the announcement
  // is debounced and phrased as plain words a reader voices cleanly.
  var announceTimer = null;
  function scheduleAnnounce(s) {
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(function () { speak(s); }, 400);
  }
  function speak(s) {
    var place = Math.abs(state.lat) + "° " + (state.lat < 0 ? "south" : "north") + ", " + dateLabel(state.day);
    var msg;
    if (s.polarNight) {
      msg = "At " + place + " the sun stays below the horizon all day — polar night, and no shadow to read.";
    } else if (!s.up) {
      var when = (s.t <= s.sunrise) ? "before sunrise" : "after sunset";
      msg = "At " + hhmm(state.time) + ", " + place + ", the sun is " + when + " — below the horizon, so there is no shadow. The dial shows only the curve the day will trace.";
    } else {
      msg = "At " + hhmm(state.time) + ", " + place + ", the sun stands " + Math.round(s.altDeg) +
            "° above the horizon in the " + cardinal(s.azNorth) + ", bearing " + Math.round(s.azNorth) + "°. " +
            "The rod's shadow falls " + shadowLenText(s.lenH) + " long toward the " + cardinal(s.bearing) +
            ", bearing " + Math.round(s.bearing) + "°. Through the day the tip traces a " + s.curve +
            "; the sun is up " + s.dayLen.toFixed(1) + " hours.";
    }
    el.status.textContent = msg;
  }

  function render() {
    var s = solve();
    draw(s);
    paint(s);
    scheduleAnnounce(s);
    save();
    return s;
  }

  // ---- run the day ----
  var rafId = null, lastTs = null, prevTime = state.time;

  function tick(ts) {
    if (!state.running) return;
    if (lastTs === null) { lastTs = ts; prevTime = state.time; }
    var dt = clamp((ts - lastTs) / 1000, 0, 0.05);
    lastTs = ts;

    var next = state.time + RUN_RATE * dt;
    // ping the sun as the running day crosses solar noon
    if (prevTime < 720 && next >= 720) pingSun();
    if (next >= T_MAX) next -= T_MAX;             // round to the next day
    prevTime = next;
    state.time = next;
    timeRange.value = String(Math.round(next));

    render();
    rafId = window.requestAnimationFrame(tick);
  }

  function setRunning(on) {
    state.running = on;
    runBtn.setAttribute("aria-pressed", on ? "true" : "false");
    runBtn.textContent = on ? "Stop" : "Run the day";
    timeRange.parentNode.classList.toggle("is-locked", on);
    timeRange.disabled = on;
    if (on) {
      lastTs = null;
      rafId = window.requestAnimationFrame(tick);
    } else if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function pingSun() {
    var halo = svg.querySelector(".sun-halo");
    if (halo) {
      halo.classList.remove("pinged");
      void halo.getBBox;
      halo.classList.add("pinged");
    }
  }

  // ---- control wiring ----
  function setLat(v) {
    state.lat = clamp(Math.round(v), LAT_MIN, LAT_MAX);
    if (latRange.value !== String(state.lat)) latRange.value = String(state.lat);
    render();
  }
  function setDay(v) {
    state.day = clamp(Math.round(v), DAY_MIN, DAY_MAX);
    if (dayRange.value !== String(state.day)) dayRange.value = String(state.day);
    render();
  }
  function setTime(v) {
    state.time = clamp(Math.round(v), T_MIN, T_MAX);
    if (timeRange.value !== String(state.time)) timeRange.value = String(state.time);
    render();
  }

  latRange.addEventListener("input", function () { setLat(parseFloat(latRange.value)); });
  dayRange.addEventListener("input", function () { setDay(parseFloat(dayRange.value)); });
  timeRange.addEventListener("input", function () {
    if (state.running) setRunning(false);          // taking the time back by hand
    setTime(parseFloat(timeRange.value));
  });

  runBtn.addEventListener("click", function () { setRunning(!state.running); });
  noonBtn.addEventListener("click", function () {
    if (state.running) setRunning(false);
    setTime(720);
  });
  resetBtn.addEventListener("click", function () {
    if (state.running) setRunning(false);
    setLat(DEFAULTS.lat); setDay(DEFAULTS.day); setTime(DEFAULTS.time);
  });

  // ---- boot ----
  latRange.min = LAT_MIN; latRange.max = LAT_MAX;
  dayRange.min = DAY_MIN; dayRange.max = DAY_MAX;
  timeRange.min = T_MIN; timeRange.max = T_MAX;
  restore();
  setLat(state.lat); setDay(state.day); setTime(state.time);
})();
