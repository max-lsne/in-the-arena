// Backbone — interactive rehearsal demo.
// Everything is mocked client-side. No requests leave the page.

(() => {
  const $ = (id) => document.getElementById(id);

  // ——— Waitlist form ———
  const form = document.getElementById('waitlist');
  const formMsg = document.getElementById('form-msg');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const v = (input?.value || '').trim();
      if (!v) return;
      formMsg.textContent = `You're in. Confirmation sent to ${v}. Tuesday cohort.`;
      formMsg.style.color = 'var(--rust-600)';
      input.value = '';
    });
  }

  // ——— Demo state ———
  const state = {
    room: 'raise',
    diff: 3,
    style: 'warm',
    runs: 0,
    best: 0,
    roomCount: { raise: 0, review: 0, no: 0, reprice: 0 },
  };

  const rooms = {
    raise: {
      label: 'The Raise',
      who: 'manager',
      pushbacks: {
        warm: [
          "I hear you. Budgets are tight this cycle — help me understand what changed.",
          "I want to support this. Tell me three things you did this year that nobody else could have.",
          "Let me see what I can do. What's the number you actually need to feel good?",
        ],
        terse: [
          "What's the number?",
          "Why now?",
          "Send me a doc. I'll come back.",
        ],
        evasive: [
          "Comp cycles are in October, you know that. Let's circle back.",
          "I'd love to but it's not really my call. HR sets the bands.",
          "Have you thought about a promo instead? Less friction.",
        ],
        aggressive: [
          "A 22% jump? In this market? Walk me through how that's reasonable.",
          "Everyone wants more. What makes you different from the four people who asked me this month?",
          "Frankly, your last quarter was uneven. Convince me.",
        ],
      },
    },
    review: {
      label: 'The Honest Review',
      who: 'report',
      pushbacks: {
        warm: [
          "Okay. That's hard to hear. Can you give me an example?",
          "I thought we were on the same page. What did I miss?",
          "I'll take that. What would 'good' look like in 90 days?",
        ],
        terse: [
          "Example?",
          "Compared to who?",
          "What do you want me to do.",
        ],
        evasive: [
          "I think the team's been weird this quarter. It's not just me.",
          "I had a lot on. You knew that.",
          "Are we talking about the deck thing? Because we resolved that.",
        ],
        aggressive: [
          "Wow. Okay. Is this a PIP conversation?",
          "I've been killing it. Where is this coming from?",
          "Who said that. I want to know who said that.",
        ],
      },
    },
    no: {
      label: 'The No',
      who: 'manager',
      pushbacks: {
        warm: [
          "I really need you on this one. Is there any way?",
          "Help me find the path. What would have to be true for you to say yes?",
          "I get it. Can we talk about what comes off your plate?",
        ],
        terse: [
          "I need you on it.",
          "What's the blocker.",
          "Who can, then.",
        ],
        evasive: [
          "Let's revisit Friday. Maybe things will look different.",
          "I'm sure you can figure it out, you always do.",
          "Why don't you just try it for a week.",
        ],
        aggressive: [
          "That's not really an option here.",
          "Everyone's stretched. You're not special.",
          "I'm going to remember this came back to me.",
        ],
      },
    },
    reprice: {
      label: 'The Re-price',
      who: 'client',
      pushbacks: {
        warm: [
          "I appreciate the heads-up. That's a real jump for us — talk me through it.",
          "We love working with you. Is there a smaller increase that gets us most of the way?",
          "Can we lock the old rate for one more project?",
        ],
        terse: [
          "Why.",
          "When does it take effect.",
          "Send a revised SOW.",
        ],
        evasive: [
          "Hmm. Let me check with finance.",
          "We'll need to think about whether the scope still makes sense.",
          "Send something in writing and I'll get back to you.",
        ],
        aggressive: [
          "That's a 40% increase. You're aware of what the market is, right?",
          "We can find someone else for that price. Easily.",
          "If you bill us that, we'll have to scale the project back. A lot.",
        ],
      },
    },
  };

  // ——— Room picker ———
  const chips = document.querySelectorAll('.room-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.room = chip.dataset.room;
    });
  });

  // ——— Difficulty label ———
  const diffInput = $('diff-input');
  const diffOut = $('diff-out');
  const diffLabels = ['1 — soft toss', '2 — gentle', '3 — realistic', '4 — sharp', '5 — bad day'];
  diffInput?.addEventListener('input', () => {
    state.diff = Number(diffInput.value);
    diffOut.textContent = diffLabels[state.diff - 1];
  });

  // ——— Style picker ———
  $('style-input')?.addEventListener('change', (e) => {
    state.style = e.target.value;
  });

  // ——— Run rehearsal ———
  const runBtn = $('run-btn');
  const resetBtn = $('reset-btn');
  const stage = $('stage');
  const stageLabel = $('stage-label');
  const stageTime = $('stage-time');
  const stageTranscript = $('stage-transcript');
  const grade = $('grade');
  const ringArc = $('ring-arc');
  const ringNum = $('ring-num');
  const gradeLine = $('grade-line');
  const gradeVerdict = $('grade-verdict');
  const gradeBars = $('grade-bars');
  const noteGood = $('note-good');
  const noteFix = $('note-fix');
  const takeHome = $('take-home');

  const statRuns = $('stat-runs');
  const statBest = $('stat-best');
  const statRoom = $('stat-room');

  let timerId = null;

  function appendLine(parent, who, text, label) {
    const p = document.createElement('p');
    p.className = `line ${who} appearing`;
    const span = document.createElement('span');
    span.className = 'who';
    span.textContent = label;
    p.appendChild(span);
    p.appendChild(document.createTextNode(text));
    parent.appendChild(p);
  }

  function pickPushback(roomKey, styleKey, diff) {
    const list = rooms[roomKey].pushbacks[styleKey] || rooms[roomKey].pushbacks.warm;
    const idx = Math.min(list.length - 1, Math.max(0, diff - 2));
    return list[idx];
  }

  function startTimer() {
    if (timerId) clearInterval(timerId);
    let t = 0;
    stageTime.textContent = '00:00';
    timerId = setInterval(() => {
      t += 1;
      const m = String(Math.floor(t / 60)).padStart(2, '0');
      const s = String(t % 60).padStart(2, '0');
      stageTime.textContent = `${m}:${s}`;
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function score(line, goal, diff) {
    const text = (line || '').trim();
    const goalText = (goal || '').trim();
    if (!text) return null;

    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const hasNumber = /[$€£]?\d/.test(text);
    const hasHedge = /(maybe|kind of|sort of|just|i think|i guess|i feel like|i was wondering|if it's possible|if that's okay)/i.test(text);
    const opensWithI = /^\s*i\b/i.test(text);
    const askMark = /\?\s*$/.test(text);
    const apology = /(sorry|apologi[sz]e|hate to|no worries if)/i.test(text);
    const concrete = goalText.length > 0 && words.length > 6;

    let posture = 70;
    if (hasHedge) posture -= 18;
    if (apology) posture -= 14;
    if (askMark) posture -= 6;
    if (opensWithI && wordCount < 10) posture += 4;
    posture = clamp(posture, 8, 98);

    let specifics = 50;
    if (hasNumber) specifics += 22;
    if (concrete) specifics += 14;
    if (wordCount > 14) specifics += 8;
    if (wordCount < 7) specifics -= 18;
    specifics = clamp(specifics, 8, 98);

    let silence = 60;
    if (wordCount > 28) silence -= 18;
    if (askMark) silence -= 8;
    if (/\.$/.test(text) && wordCount < 22) silence += 12;
    silence = clamp(silence, 8, 96);

    let recovery = 55 + (5 - diff) * 4;
    if (hasHedge) recovery -= 8;
    if (apology) recovery -= 6;
    if (hasNumber) recovery += 6;
    recovery = clamp(recovery, 10, 95);

    const total = Math.round((posture * 0.32 + specifics * 0.30 + silence * 0.18 + recovery * 0.20));

    return { posture, specifics, silence, recovery, total, hasNumber, hasHedge, apology, askMark, wordCount };
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function makeNotes(s, roomKey) {
    const good = [];
    const fix = [];
    if (!s.hasHedge) good.push('No hedging words. You said what you meant.');
    else fix.push('Cut the hedges — "just", "kind of", "I think" — they shrink the ask.');

    if (s.hasNumber) good.push('You named a number. That gives them something to react to.');
    else fix.push('Name the number first. Vague asks get vague answers.');

    if (!s.apology) good.push("You didn't apologize for asking.");
    else fix.push('Drop the apology. You\'re not interrupting — you\'re asking.');

    if (s.wordCount >= 8 && s.wordCount <= 26) good.push('Length is good — long enough to be specific, short enough to land.');
    else if (s.wordCount > 26) fix.push('You went on too long. The other side stops listening at sentence three.');
    else fix.push('Too short. Anchor the ask in one piece of evidence.');

    if (!s.askMark) good.push('Statement, not a question. You\'re not requesting permission.');
    else fix.push('Lose the question mark at the end. A raise isn\'t a permission slip.');

    return { good: good.slice(0, 3), fix: fix.slice(0, 3) };
  }

  function verdict(score) {
    if (score >= 80) return ['Steady.', 'You\'d walk out of this room with most of what you came for.'];
    if (score >= 65) return ['Strong, with leaks.', 'Tighten one or two lines and you\'re ready.'];
    if (score >= 45) return ['Wobbly.', 'You opened a real conversation but you\'re leaving money in the room.'];
    return ['Not yet.', 'Run it again. The shape is there — the spine isn\'t.'];
  }

  function takeHomeLine(roomKey, s) {
    if (roomKey === 'raise') {
      if (s.hasNumber) return 'For the real room: name the number first, then go quiet. Five seconds. Don\'t fill it.';
      return 'For the real room: open with "I want to move to $X." Don\'t soften it.';
    }
    if (roomKey === 'review') {
      return 'For the real room: lead with the specific moment. "On Tuesday\'s review, the deck wasn\'t ready." Not "I\'ve noticed lately…"';
    }
    if (roomKey === 'no') {
      return 'For the real room: "I can\'t take this on." Period. No reasons until they ask.';
    }
    return 'For the real room: state the new rate as a fact, with the effective date. Don\'t justify it unprompted.';
  }

  function bar(label, value) {
    return `<div class="grade-bar"><span>${label}</span><div class="b"><i style="width:${value}%"></i></div><span class="v">${value}</span></div>`;
  }

  function runRehearsal() {
    const goal = $('goal-input').value;
    const line = $('line-input').value;
    if (!line.trim()) {
      $('line-input').focus();
      return;
    }

    const room = rooms[state.room];
    stageLabel.textContent = `Rehearsal · ${room.label}`;
    stage.hidden = false;
    stageTranscript.innerHTML = '';
    grade.hidden = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Listening…';

    startTimer();

    appendLine(stageTranscript, 'you', line, 'you');

    setTimeout(() => {
      const reply = pickPushback(state.room, state.style, state.diff);
      appendLine(stageTranscript, 'them', reply, `"${room.who}"`);
    }, 700);

    setTimeout(() => {
      const reply2 = pickPushback(state.room, state.style, Math.min(5, state.diff + 1));
      if (reply2) appendLine(stageTranscript, 'them', reply2, `"${room.who}"`);
    }, 1500);

    setTimeout(() => {
      stopTimer();
      const s = score(line, goal, state.diff);
      if (!s) return;

      // Update stats
      state.runs += 1;
      state.best = Math.max(state.best, s.total);
      state.roomCount[state.room] = (state.roomCount[state.room] || 0) + 1;
      statRuns.textContent = state.runs;
      statBest.textContent = state.best;
      const top = Object.entries(state.roomCount).sort((a, b) => b[1] - a[1])[0];
      statRoom.textContent = rooms[top[0]].label;

      // Render score ring
      ringNum.textContent = s.total;
      const dash = 264;
      ringArc.setAttribute('stroke-dashoffset', String(dash - (dash * s.total) / 100));

      const [v1, v2] = verdict(s.total);
      gradeLine.textContent = v1;
      gradeVerdict.textContent = v2;

      gradeBars.innerHTML =
        bar('Posture', s.posture) +
        bar('Specifics', s.specifics) +
        bar('Silence', s.silence) +
        bar('Recovery', s.recovery);

      const notes = makeNotes(s, state.room);
      noteGood.innerHTML = notes.good.map((n) => `<li>${n}</li>`).join('');
      noteFix.innerHTML = notes.fix.length
        ? notes.fix.map((n) => `<li>${n}</li>`).join('')
        : '<li>Nothing major. Take it into the real room.</li>';

      takeHome.textContent = takeHomeLine(state.room, s);

      grade.hidden = false;
      grade.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      runBtn.disabled = false;
      runBtn.textContent = 'Run another pass';
    }, 2300);
  }

  runBtn?.addEventListener('click', runRehearsal);

  resetBtn?.addEventListener('click', () => {
    $('goal-input').value = '';
    $('line-input').value = '';
    stage.hidden = true;
    grade.hidden = true;
    stopTimer();
    stageTranscript.innerHTML = '';
    runBtn.textContent = 'Run the rehearsal';
    runBtn.disabled = false;
  });
})();
