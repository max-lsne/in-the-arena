// ---------- Quorum — interactive demo ----------

(function () {
  const STORAGE_KEY = 'quorum-room-v1';

  const state = load() || {
    question: '',
    options: [], // { id, name }
    votes: {},   // { voter: { optionId: rating 1..5 } }
    pending: {}, // current voter's in-progress ratings { optionId: rating }
  };

  // ---------- elements ----------
  const $question = document.getElementById('question-input');
  const $option = document.getElementById('option-input');
  const $addOption = document.getElementById('add-option-btn');
  const $list = document.getElementById('options-list');
  const $voter = document.getElementById('voter-name');
  const $cast = document.getElementById('cast-btn');
  const $reset = document.getElementById('reset-btn');
  const $result = document.getElementById('result');
  const $resultName = document.getElementById('result-name');
  const $resultDetail = document.getElementById('result-detail');
  const $statOptions = document.getElementById('stat-options');
  const $statVoters = document.getElementById('stat-voters');
  const $waitlist = document.getElementById('waitlist');
  const $formMsg = document.getElementById('form-msg');

  // ---------- waitlist ----------
  if ($waitlist) {
    $waitlist.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $waitlist.querySelector('input');
      if (!input.value) return;
      $waitlist.style.transition = 'opacity .3s ease';
      $waitlist.style.opacity = '0.5';
      setTimeout(() => {
        $formMsg.textContent = "You're on the list. We'll be quietly in touch.";
        $formMsg.style.color = 'var(--teal-deep)';
        input.value = '';
        $waitlist.style.opacity = '1';
      }, 240);
    });
  }

  // ---------- init ----------
  $question.value = state.question || '';
  $question.addEventListener('input', () => {
    state.question = $question.value;
    save();
  });

  $addOption.addEventListener('click', addOption);
  $option.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addOption(); }
  });

  $cast.addEventListener('click', castVotes);
  $reset.addEventListener('click', resetRoom);

  render();

  // ---------- actions ----------
  function addOption() {
    const name = $option.value.trim();
    if (!name) return;
    const id = 'o' + Math.random().toString(36).slice(2, 9);
    state.options.push({ id, name });
    state.pending[id] = 0;
    $option.value = '';
    save();
    render();
  }

  function removeOption(id) {
    state.options = state.options.filter((o) => o.id !== id);
    delete state.pending[id];
    Object.keys(state.votes).forEach((voter) => {
      delete state.votes[voter][id];
    });
    save();
    render();
  }

  function rate(id, value) {
    state.pending[id] = value;
    save();
    render(/* keepFocus */ true);
  }

  function castVotes() {
    const voter = ($voter.value || 'Anonymous').trim().slice(0, 20);
    if (!state.options.length) {
      flashResult('Add at least one option first.', '—');
      return;
    }
    const ratings = {};
    let any = false;
    state.options.forEach((o) => {
      const r = state.pending[o.id] || 0;
      if (r > 0) { ratings[o.id] = r; any = true; }
    });
    if (!any) {
      flashResult('Tap stars to rate at least one option.', '—');
      return;
    }
    state.votes[voter] = ratings;
    state.pending = {};
    state.options.forEach((o) => { state.pending[o.id] = 0; });
    $voter.value = '';
    save();
    render();
    revealConsensus();
  }

  function resetRoom() {
    state.question = '';
    state.options = [];
    state.votes = {};
    state.pending = {};
    $question.value = '';
    $voter.value = '';
    save();
    $result.hidden = true;
    render();
  }

  // ---------- consensus ----------
  // Quorum picks the option with the highest *floor* — the best worst-score.
  // Ties broken by average. Options without a complete vote default to 1 (treat
  // a missing rating as a soft "no" to keep things honest).
  function revealConsensus() {
    if (!state.options.length) return;
    const voters = Object.keys(state.votes);
    if (!voters.length) return;

    const scored = state.options.map((o) => {
      const ratings = voters.map((v) => state.votes[v][o.id] || 1);
      const floor = Math.min(...ratings);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      return { ...o, floor, avg, ratings };
    });

    scored.sort((a, b) => (b.floor - a.floor) || (b.avg - a.avg));
    const winner = scored[0];

    $result.hidden = false;
    $resultName.textContent = winner.name;
    const detail = `Floor ${winner.floor}/5 · Average ${winner.avg.toFixed(1)} · ${voters.length} voter${voters.length === 1 ? '' : 's'}`;
    $resultDetail.textContent = detail;
  }

  function flashResult(detail, name) {
    $result.hidden = false;
    $resultName.textContent = name;
    $resultDetail.textContent = detail;
  }

  // ---------- render ----------
  function render(keepFocus = false) {
    const focused = document.activeElement;
    $list.innerHTML = '';

    state.options.forEach((o) => {
      const row = document.createElement('div');
      row.className = 'opt-row';

      const label = document.createElement('span');
      label.className = 'opt-label';
      label.textContent = o.name;

      const stars = document.createElement('span');
      stars.className = 'stars';
      const current = state.pending[o.id] || 0;
      for (let i = 1; i <= 5; i++) {
        const s = document.createElement('button');
        s.type = 'button';
        s.textContent = '★';
        s.setAttribute('aria-label', `Rate ${i}`);
        if (i <= current) s.classList.add('on');
        s.addEventListener('click', () => rate(o.id, i));
        stars.appendChild(s);
      }

      const remove = document.createElement('button');
      remove.className = 'remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Remove option';
      remove.addEventListener('click', () => removeOption(o.id));

      row.appendChild(label);
      row.appendChild(stars);
      row.appendChild(remove);
      $list.appendChild(row);
    });

    $statOptions.textContent = state.options.length;
    $statVoters.textContent = Object.keys(state.votes).length;

    if (Object.keys(state.votes).length > 0) {
      revealConsensus();
    } else {
      $result.hidden = true;
    }

    if (keepFocus && focused && document.contains(focused)) {
      try { focused.focus(); } catch (_) {}
    }
  }

  // ---------- persistence ----------
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* private mode etc. */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.options)) return null;
      parsed.pending = parsed.pending || {};
      parsed.votes = parsed.votes || {};
      parsed.options.forEach((o) => {
        if (parsed.pending[o.id] == null) parsed.pending[o.id] = 0;
      });
      return parsed;
    } catch (_) {
      return null;
    }
  }
})();
