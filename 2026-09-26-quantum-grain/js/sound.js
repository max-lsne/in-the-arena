/* Quantum Grain sound. Everything is synthesized with WebAudio: no samples.
   Keys bottom out in two strokes (leaf click, then a thump), knobs ratchet,
   a run ticks like a counter, a result rings a short chord. */
(() => {
  "use strict";

  const PREF_KEY = "qg-sound";
  let ctx = null;
  let out = null;
  let noiseBuf = null;
  let enabled = true;
  try { enabled = localStorage.getItem(PREF_KEY) !== "off"; } catch (_) {}

  const rnd = (a, b) => a + Math.random() * (b - a);

  function ensure() {
    if (!enabled) return null;
    if (!ctx && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.12;
      out = ctx.createGain();
      out.gain.value = 0.9;
      out.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // a burst of filtered noise: the "click" part of most sounds
  function burst(t, { freq = 2800, q = 1.2, type = "bandpass", dur = 0.014, gain = 0.5 } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = rnd(0.9, 1.1);
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.0007);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, rnd(0, 0.6)); src.stop(t + dur + 0.02);
  }

  // a pitched thump: the "body" of a key or switch
  function thump(t, { from = 150, to = 62, dur = 0.07, gain = 0.5, type = "sine" } = {}) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function tone(t, freq, { dur = 0.5, gain = 0.18, type = "triangle", detune = 0 } = {}) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.4, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  const S = {
    get enabled() { return enabled; },

    unlock() { ensure(); },

    setEnabled(on) {
      enabled = !!on;
      try { localStorage.setItem(PREF_KEY, enabled ? "on" : "off"); } catch (_) {}
      if (enabled) { ensure(); S.toggle(true); }
    },

    // key goes down: leaf click, then bottom-out about 16 ms later
    keyDown(weight = 1) {
      if (!ensure()) return;
      const t = ctx.currentTime, p = rnd(0.94, 1.06);
      burst(t, { freq: 3000 * p, q: 1.6, dur: 0.012, gain: 0.42 * weight });
      burst(t + 0.016, { freq: 1100 * p, q: 0.9, dur: 0.024, gain: 0.5 * weight });
      thump(t + 0.016, { from: 170 * p, to: 64, dur: 0.075, gain: 0.5 * weight });
      if (navigator.vibrate) { try { navigator.vibrate(6); } catch (_) {} }
    },

    // key comes back up: one lighter, higher click
    keyUp(weight = 1) {
      if (!ensure()) return;
      const t = ctx.currentTime, p = rnd(0.95, 1.05);
      burst(t, { freq: 4300 * p, q: 1.8, dur: 0.009, gain: 0.24 * weight });
      thump(t, { from: 260 * p, to: 130, dur: 0.035, gain: 0.14 * weight });
    },

    // knob detent i of n: a ratchet that climbs in pitch
    detent(i = 0, n = 9) {
      if (!ensure()) return;
      const t = ctx.currentTime, k = i / Math.max(1, n - 1);
      burst(t, { freq: 1700 + k * 2400, q: 2.2, dur: 0.008, gain: 0.42 });
      thump(t, { from: 380 + k * 420, to: 190 + k * 200, dur: 0.03, gain: 0.16, type: "triangle" });
      if (navigator.vibrate) { try { navigator.vibrate(3); } catch (_) {} }
    },

    // slide switch: heavy thock, then a small snap
    toggle(on = true) {
      if (!ensure()) return;
      const t = ctx.currentTime, p = on ? 1.12 : 0.92;
      thump(t, { from: 130 * p, to: 52, dur: 0.1, gain: 0.55 });
      burst(t, { freq: 1300 * p, q: 1, dur: 0.02, gain: 0.45 });
      burst(t + 0.034, { freq: 3400 * p, q: 2, dur: 0.01, gain: 0.3 });
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
    },

    // shutter for the hero lens
    shutterDown() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      burst(t, { freq: 3600, q: 1.4, dur: 0.012, gain: 0.4 });
      burst(t + 0.022, { freq: 900, q: 0.8, dur: 0.03, gain: 0.5 });
      thump(t + 0.022, { from: 210, to: 70, dur: 0.09, gain: 0.5 });
    },
    shutterUp() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      burst(t, { freq: 5200, q: 1.6, dur: 0.008, gain: 0.28 });
      burst(t + 0.05, { freq: 2200, q: 1.2, dur: 0.012, gain: 0.3 });
      thump(t + 0.05, { from: 300, to: 140, dur: 0.04, gain: 0.2 });
    },

    // one count of the run: a Geiger tick
    count(level = 1) {
      if (!ensure()) return;
      const t = ctx.currentTime;
      burst(t, { freq: rnd(5200, 7800), q: 0.7, type: "highpass", dur: 0.004, gain: 0.3 * level });
    },

    // result chimes. clean rings bright, collapsed sinks.
    result(verdict) {
      if (!ensure()) return;
      const t = ctx.currentTime;
      if (verdict === "Clean") {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.07, f, { dur: 0.7, gain: 0.16 }));
      } else if (verdict === "Grainy") {
        [523.25, 659.25, 783.99].forEach((f, i) => tone(t + i * 0.09, f, { dur: 0.5, gain: 0.13 }));
      } else if (verdict === "Noisy") {
        tone(t, 440, { dur: 0.5, gain: 0.13, detune: -12 });
        tone(t + 0.11, 622.25, { dur: 0.5, gain: 0.11, detune: 14 });
      } else {
        tone(t, 196, { dur: 0.55, gain: 0.16, type: "sawtooth" });
        tone(t + 0.14, 138.6, { dur: 0.6, gain: 0.16, type: "sawtooth" });
      }
    },

    error() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      thump(t, { from: 160, to: 90, dur: 0.12, gain: 0.5, type: "square" });
      thump(t + 0.14, { from: 130, to: 70, dur: 0.16, gain: 0.5, type: "square" });
    },
  };

  window.QGSound = S;
})();
