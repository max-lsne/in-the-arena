/* Slake — the bench.
 *
 * One tub of lime. Two levers the limeburner sets:
 *   water — the dose given to the burn (starved -> matched -> flooded)
 *   rest  — the months the putty matures under water
 *
 * The reading comes "fat & true" only where the water is matched AND the
 * putty has rested. Starve it and live grains blow on the wall; drown it and
 * it stays lean; match it but use it young and it is merely green.
 */

(function () {
  "use strict";

  var WATER_TRUE = 62;   // the dose that matches the burn
  var MATCH_BAND = 6;    // how close to true still counts as "matched"
  var REST_FAT = 9;      // months under water before it comes fat

  var els = {
    waterRange: document.getElementById("water-range"),
    restRange: document.getElementById("rest-range"),
    waterOut: document.getElementById("water-out"),
    restOut: document.getElementById("rest-out"),
    grainOut: document.getElementById("grain-out"),
    bodyOut: document.getElementById("body-out"),
    reading: document.getElementById("reading"),
    readingSub: document.getElementById("reading-sub"),
    putty: document.getElementById("putty"),
    water: document.getElementById("water"),
    sheen: document.getElementById("sheen"),
    waterline: document.getElementById("waterline"),
    grains: document.getElementById("grains"),
    steam: document.getElementById("steam"),
    slakeTrue: document.getElementById("slake-true"),
    reset: document.getElementById("reset"),
    presetRow: document.getElementById("preset-row"),
    presets: Array.prototype.slice.call(document.querySelectorAll(".preset")),
  };

  var SVGNS = "http://www.w3.org/2000/svg";

  // fixed scatter of grain positions inside the putty, so the count can change
  // without the grains jumping around between renders.
  var GRAIN_SPOTS = [
    [78, 168], [140, 210], [205, 162], [262, 232], [318, 178],
    [372, 218], [430, 170], [110, 244], [186, 196], [240, 176],
    [296, 210], [352, 244], [408, 200], [452, 232],
  ];

  var STORE_KEY = "slake.batch.v1";
  var state = { water: WATER_TRUE, rest: 12 };
  var activeName = null;

  function save() {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ water: state.water, rest: state.rest, preset: activeName })
      );
    } catch (e) { /* private mode, quota, etc. — the bench just won't remember */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (typeof saved.water === "number") state.water = clamp(saved.water, 0, 100);
      if (typeof saved.rest === "number") state.rest = clamp(saved.rest, 0, 36);
      if (typeof saved.preset === "string") activeName = saved.preset;
    } catch (e) { /* corrupt or unreadable — fall back to defaults */ }
  }

  // --- steam: a few soft rising curls, opacity driven by reaction heat ---
  function buildSteam() {
    var xs = [110, 190, 270, 350, 430];
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute(
        "d",
        "M" + x + " 66 q -8 -12 0 -22 q 8 -10 0 -22"
      );
      els.steam.appendChild(p);
    }
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function evaluate(water, rest) {
    var under = Math.max(0, WATER_TRUE - water);
    var over = Math.max(0, water - WATER_TRUE);

    // live grains: only when starved of water, more the further below true
    var grains = water >= WATER_TRUE - 4
      ? 0
      : clamp(Math.round((WATER_TRUE - 4 - water) / 3), 1, GRAIN_SPOTS.length);

    // leanness from drowning, 0..1
    var leanness = clamp((over - 4) / 34, 0, 1);

    // fatness: grows with rest, capped by how well it was slaked
    var rested = clamp(rest / 18, 0, 1.1);
    var fatness = clamp(rested * (1 - leanness * 0.85), 0, 1.1);

    // reaction heat: hottest when starved (boils dry), cold when drowned
    var heat = water < 5 ? 0.06 : clamp((78 - water) / 78, 0.05, 1);

    // the reading — coarsest error wins
    var band, cls, sub;
    if (over > 22) {
      band = "Drowned — lean and chalky.";
      cls = "is-bad";
      sub = "Flooded cold. The slake chilled before it turned; no amount of resting brings this to fat.";
    } else if (under > 22) {
      band = "Scorched — it blows on the wall.";
      cls = "is-bad";
      sub = "Starved of water and boiled dry. Live grains rode through and will pop out of the finished coat for months.";
    } else if (over > MATCH_BAND) {
      band = "Slack — soft, short of body.";
      cls = "is-warn";
      sub = "A jug over. The reaction cooled early; it will work, but it never quite comes to itself.";
    } else if (under > MATCH_BAND) {
      band = "Short — gritty, some live grains.";
      cls = "is-warn";
      sub = "A jug shy. Mostly turned, but coarse grains fight the trowel and a few will still blow.";
    } else if (rest < 3) {
      band = "Green — slaked true, but used young.";
      cls = "is-warn";
      sub = "Matched to the burn, but troweled the same week. It has not rested; it is short and coarse for want of leaving alone.";
    } else if (rest < REST_FAT) {
      band = "Coming to body — leave it longer.";
      cls = "is-warn";
      sub = "Slaked through and starting to fatten. A few more months under water and it is there.";
    } else {
      band = "Fat &amp; true.";
      cls = "is-good";
      sub = rest >= 24
        ? "Matched to the burn and long-aged under water. The oldest lime in the yard is the best lime in the yard."
        : "Water matched to the burn and months under water. This is lime you can work.";
    }

    return {
      under: under, over: over, grains: grains,
      leanness: leanness, fatness: fatness, heat: heat,
      band: band, cls: cls, sub: sub,
    };
  }

  function doseLabel(water) {
    var under = Math.max(0, WATER_TRUE - water);
    var over = Math.max(0, water - WATER_TRUE);
    if (over > 22) return "flooded";
    if (under > 22) return "starved";
    if (over > MATCH_BAND) return "over";
    if (under > MATCH_BAND) return "shy";
    return "matched";
  }

  function bodyLabel(f) {
    if (f < 0.2) return "green";
    if (f < 0.5) return "coming to body";
    if (f < 0.85) return "fat";
    return "fat, long-aged";
  }

  function render() {
    var r = evaluate(state.water, state.rest);

    // --- water layer thickness tracks the dose ---
    var waterH = 6 + (state.water / 100) * 42;
    var waterTop = 140 - waterH;
    els.water.setAttribute("y", waterTop);
    els.water.setAttribute("height", waterH);
    els.waterline.setAttribute("y1", waterTop);
    els.waterline.setAttribute("y2", waterTop);

    // --- fat sheen on the putty surface ---
    els.sheen.setAttribute("opacity", (r.fatness * 0.6).toFixed(2));

    // --- steam curls track reaction heat ---
    for (var i = 0; i < els.steam.childNodes.length; i++) {
      els.steam.childNodes[i].style.opacity = (r.heat * 0.85).toFixed(2);
    }

    // --- live grains ---
    while (els.grains.firstChild) els.grains.removeChild(els.grains.firstChild);
    for (var g = 0; g < r.grains; g++) {
      var spot = GRAIN_SPOTS[g];
      var c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", spot[0]);
      c.setAttribute("cy", spot[1]);
      c.setAttribute("r", 3.4);
      c.setAttribute("class", "grain-dot");
      els.grains.appendChild(c);
    }

    // --- readouts ---
    els.waterOut.textContent = doseLabel(state.water);
    els.restOut.textContent = state.rest + (state.rest === 1 ? " month" : " months");
    els.grainOut.textContent = r.grains === 0
      ? "none — slaked through"
      : r.grains + " live — will blow on the wall";
    els.bodyOut.textContent = bodyLabel(r.fatness);

    // --- the reading ---
    els.reading.className = "reading " + r.cls;
    els.reading.innerHTML = r.band.indexOf("&amp;") >= 0
      ? "Slaked true, rested — <strong>" + r.band + "</strong>"
      : "<strong>" + r.band + "</strong>";
    els.readingSub.textContent = r.sub;

    save();
  }

  function setActivePreset(name) {
    activeName = name;
    els.presets.forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.name === name);
    });
  }

  function syncInputs() {
    els.waterRange.value = state.water;
    els.restRange.value = state.rest;
  }

  // --- wiring ---
  els.waterRange.addEventListener("input", function () {
    state.water = parseInt(this.value, 10);
    setActivePreset(null);
    render();
  });
  els.restRange.addEventListener("input", function () {
    state.rest = parseInt(this.value, 10);
    setActivePreset(null);
    render();
  });

  els.slakeTrue.addEventListener("click", function () {
    state.water = WATER_TRUE;
    setActivePreset(null);
    syncInputs();
    render();
  });

  els.reset.addEventListener("click", function () {
    state.water = WATER_TRUE;
    state.rest = 12;
    setActivePreset(null);
    syncInputs();
    render();
  });

  els.presets.forEach(function (b) {
    b.addEventListener("click", function () {
      state.water = parseInt(b.dataset.water, 10);
      state.rest = parseInt(b.dataset.rest, 10);
      setActivePreset(b.dataset.name);
      syncInputs();
      render();
    });
  });

  // --- keyboard: work the whole bench without a mouse ---
  function nudge(key, delta) {
    state[key] = clamp(state[key] + delta, key === "water" ? 0 : 0, key === "water" ? 100 : 36);
    setActivePreset(null);
    syncInputs();
    render();
  }

  document.addEventListener("keydown", function (e) {
    var t = e.target;
    // let range inputs keep their native arrow-key behaviour
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case ",": nudge("water", -2); break;
      case ".": nudge("water", 2); break;
      case "[": nudge("rest", -1); break;
      case "]": nudge("rest", 1); break;
      case "s": case "S":
        state.water = WATER_TRUE; setActivePreset(null); syncInputs(); render(); break;
      case "r": case "R":
        state.water = WATER_TRUE; state.rest = 12; setActivePreset(null); syncInputs(); render(); break;
      default: return;
    }
    e.preventDefault();
  });

  buildSteam();
  load();
  if (activeName) setActivePreset(activeName);
  syncInputs();
  render();
})();
