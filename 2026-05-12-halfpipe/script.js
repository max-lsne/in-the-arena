(() => {
  const pitchInput = document.getElementById('pitch-input');
  const whoInput = document.getElementById('who-input');
  const priceInput = document.getElementById('price-input');
  const priceOut = document.getElementById('price-out');
  const hoursInput = document.getElementById('hours-input');
  const hoursOut = document.getElementById('hours-out');
  const runBtn = document.getElementById('run-btn');
  const resetBtn = document.getElementById('reset-btn');
  const ramp = document.getElementById('ramp');
  const rampStatus = document.getElementById('ramp-status');
  const dotsEl = document.getElementById('dots');
  const result = document.getElementById('result');
  const ringArc = document.getElementById('ring-arc');
  const ringNum = document.getElementById('ring-num');
  const resultLine = document.getElementById('result-line');
  const resultVerdict = document.getElementById('result-verdict');
  const resultQuotes = document.getElementById('result-quotes');
  const statRuns = document.getElementById('stat-runs');
  const statYes = document.getElementById('stat-yes');
  const statSaved = document.getElementById('stat-saved');
  const waitlistForm = document.getElementById('waitlist');
  const formMsg = document.getElementById('form-msg');

  // ——— Sliders mirror to display ———
  const updatePrice = () => { priceOut.textContent = priceInput.value; };
  const updateHours = () => { hoursOut.textContent = hoursInput.value; };
  priceInput.addEventListener('input', updatePrice);
  hoursInput.addEventListener('input', updateHours);
  updatePrice();
  updateHours();

  // ——— Quote pool: opinions panelists might leave ———
  const yesQuotes = [
    "I'd pay this on my own card without thinking. Clear pain.",
    "Title earns the price. The page does too. Take my money.",
    "I tried to talk myself out of paying and couldn't. Good sign.",
    "If this exists Tuesday I switch from the spreadsheet I hate.",
    "Bought worse for more. Ship it.",
    "Niche but I'm in the niche and I'd buy. Don't broaden it."
  ];
  const maybeQuotes = [
    "I'd pay $X not $Y. Make me feel that gap.",
    "Yes for me, no for my team. Price the seat, not the org.",
    "Closer to a feature than a product. What's the third thing it does?",
    "Annual only at this price. Monthly feels too sticky to start.",
    "Loved it until I read the pricing. Loved it less.",
    "I'd try it free; not sure I'd renew. Lean into the first 30 days."
  ];
  const noQuotes = [
    "I already do this in a spreadsheet for free. What changes?",
    "Founders won't pay for this. Sell to ops people.",
    "Cute landing, brittle premise. What happens at month two?",
    "This is a wedge, not a product. Pick what it grows into.",
    "Solves a problem I have once a quarter. Not subscription-shaped.",
    "Too close to {generic SaaS}. The 'why now' isn't there."
  ];

  // ——— Score generation: deterministic-ish from input ———
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
  }

  function generateRun() {
    const pitch = (pitchInput.value || '').trim();
    const who = (whoInput.value || '').trim();
    const price = parseInt(priceInput.value, 10);

    const seed = hashStr(pitch + '|' + who + '|' + price);

    // Base score: 30–80, pitch length matters a little, price matters a lot.
    let base = 38 + seed * 32;

    // A pitch that names a specific person ("for X") and has a verb scores higher.
    if (pitch.length > 40) base += 6;
    if (/for\s+\w+/i.test(pitch)) base += 6;
    if (who.length > 8) base += 4;

    // Price sweet spot is roughly $9–$49/mo. Free or >$150 punishes the score.
    if (price === 0) base -= 18;
    else if (price < 5) base -= 6;
    else if (price >= 9 && price <= 49) base += 6;
    else if (price > 99) base -= 10;
    else if (price > 49) base -= 4;

    if (pitch.length < 14) base -= 12;

    const score = Math.max(8, Math.min(94, Math.round(base)));

    // Yes count tracks score with mild noise.
    const yesPct = score / 100;
    const yes = Math.max(2, Math.min(48, Math.round(yesPct * 50 + (seed - 0.5) * 6)));
    const maybe = Math.max(2, Math.min(40 - Math.abs(25 - score) / 2, Math.round((1 - Math.abs(score - 50) / 100) * 18 + 6)));
    const no = Math.max(0, 50 - yes - maybe);

    return { score, yes, maybe, no, seed };
  }

  function pickN(arr, n, seed) {
    const shuffled = arr.map((v, i) => ({ v, k: hashStr(v + seed + i) })).sort((a, b) => a.k - b.k);
    return shuffled.slice(0, n).map(x => x.v);
  }

  function verdictFor(score) {
    if (score >= 70) return "Commit. This is closer to a yes than most things you've shipped.";
    if (score >= 50) return "Pivot the price or the pitch — not the product. Re-run.";
    if (score >= 30) return "Kill the framing, not the idea. The wedge isn't here yet.";
    return "Kill it. Save the year.";
  }

  // ——— Render dots ———
  function buildDots() {
    dotsEl.innerHTML = '';
    for (let i = 0; i < 50; i++) {
      const d = document.createElement('div');
      d.className = 'dot';
      dotsEl.appendChild(d);
    }
  }

  // ——— Run animation ———
  let stats = { runs: 0, yes: 0, saved: 0 };
  let running = false;

  async function runRamp() {
    if (running) return;
    const pitch = (pitchInput.value || '').trim();
    if (pitch.length < 6) {
      pitchInput.focus();
      pitchInput.style.borderColor = 'var(--spark-500)';
      setTimeout(() => { pitchInput.style.borderColor = ''; }, 1200);
      return;
    }

    running = true;
    runBtn.disabled = true;
    result.hidden = true;
    ramp.classList.add('is-running');
    buildDots();

    const run = generateRun();
    const dots = Array.from(dotsEl.children);

    // Decide which dots are yes/maybe/no (shuffle with seed for stability).
    const labels = [];
    for (let i = 0; i < run.yes; i++) labels.push('yes');
    for (let i = 0; i < run.maybe; i++) labels.push('maybe');
    for (let i = 0; i < run.no; i++) labels.push('no');
    // pad if needed
    while (labels.length < 50) labels.push('no');
    // shuffle deterministically
    const indexed = labels.map((v, i) => ({ v, k: hashStr(v + run.seed + i + 'x') }));
    indexed.sort((a, b) => a.k - b.k);
    const order = indexed.map(x => x.v);

    rampStatus.textContent = 'Builders are reviewing your pitch…';

    const reveal = (i) => new Promise(res => {
      setTimeout(() => {
        const d = dots[i];
        if (!d) return res();
        d.classList.add('is-active');
        const label = order[i];
        if (label === 'yes') d.classList.add('is-yes');
        else if (label === 'no') d.classList.add('is-no');
        setTimeout(() => d.classList.remove('is-active'), 180);
        res();
      }, 0);
    });

    for (let i = 0; i < 50; i++) {
      await reveal(i);
      if (i === 14) rampStatus.textContent = 'A few are noting the price. Reading on…';
      if (i === 32) rampStatus.textContent = 'The panel is wrapping up…';
      await new Promise(r => setTimeout(r, 38));
    }

    rampStatus.textContent = 'Run closed. Score below.';

    // Reveal result.
    setTimeout(() => {
      result.hidden = false;
      const circumference = 264;
      const offset = circumference * (1 - run.score / 100);
      ringArc.setAttribute('stroke-dashoffset', String(offset));
      ringNum.textContent = String(run.score);
      resultLine.textContent = `${run.yes} of 50 said they'd pay $${priceInput.value}/mo. ${run.maybe} maybe. ${run.no} hard no.`;
      resultVerdict.textContent = verdictFor(run.score);

      // Pick 3 quotes, weighted to the actual mix.
      const picks = [];
      if (run.yes >= 20) picks.push(...pickN(yesQuotes, 1, run.seed));
      picks.push(...pickN(maybeQuotes, run.yes >= 20 ? 1 : 2, run.seed + 'm'));
      picks.push(...pickN(noQuotes, picks.length === 2 ? 1 : 2, run.seed + 'n'));
      const finalPicks = picks.slice(0, 3);
      const tagOffsets = pickN([4, 7, 11, 18, 22, 27, 33, 39, 41, 47], 3, run.seed + 't');

      resultQuotes.innerHTML = '';
      finalPicks.forEach((q, i) => {
        const li = document.createElement('li');
        li.className = 'result-quote';
        const tag = document.createElement('span');
        tag.className = 'qtag';
        tag.textContent = '#' + tagOffsets[i];
        li.appendChild(tag);
        li.appendChild(document.createTextNode(q));
        resultQuotes.appendChild(li);
      });

      // Update stats.
      stats.runs += 1;
      stats.yes += run.yes;
      const hours = parseInt(hoursInput.value, 10);
      stats.saved += Math.round(hours * (1 - run.score / 100));
      statRuns.textContent = stats.runs;
      statYes.textContent = stats.yes;
      statSaved.textContent = stats.saved + 'h';

      runBtn.disabled = false;
      running = false;
    }, 240);
  }

  function reset() {
    pitchInput.value = '';
    whoInput.value = '';
    priceInput.value = 19;
    hoursInput.value = 40;
    updatePrice();
    updateHours();
    ramp.classList.remove('is-running');
    result.hidden = true;
    dotsEl.innerHTML = '';
  }

  runBtn.addEventListener('click', runRamp);
  resetBtn.addEventListener('click', reset);

  // ——— Waitlist form ———
  waitlistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = waitlistForm.querySelector('input');
    if (!input.value || !input.value.includes('@')) {
      input.focus();
      return;
    }
    waitlistForm.style.display = 'none';
    formMsg.textContent = "You're in line. We'll send the next ramp slot on Tuesday.";
    formMsg.style.color = 'var(--spark-600)';
    formMsg.style.fontWeight = '600';
  });
})();
