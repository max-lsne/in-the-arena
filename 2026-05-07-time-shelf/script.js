// TimeShelf — landing-page interactions

(() => {
  const STORAGE_KEY = 'timeshelf.demo.v1';
  const STATS_KEY   = 'timeshelf.stats.v1';

  // ---- waitlist ----
  const form = document.getElementById('waitlist');
  const msg  = document.getElementById('form-msg');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const value = (input.value || '').trim();
      if (!value) return;
      msg.textContent = `Shelved your spot. We'll resurface in your inbox when it's time.`;
      msg.style.color = 'var(--sage-deep)';
      input.value = '';
    });
  }

  // ---- shelf demo ----
  const input    = document.getElementById('want-input');
  const button   = document.getElementById('shelf-btn');
  const display  = document.getElementById('shelf-display');
  const statOn   = document.getElementById('stat-on');
  const statSurv = document.getElementById('stat-survived');
  const statAban = document.getElementById('stat-abandoned');

  const loadJSON = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch { return fallback; }
  };
  const saveJSON = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  };

  let items = loadJSON(STORAGE_KEY, []);
  let stats = loadJSON(STATS_KEY, { survived: 0, abandoned: 0 });

  const getDuration = () => {
    const r = document.querySelector('input[name="dur"]:checked');
    return r ? parseInt(r.value, 10) : 30;
  };

  const fmtRemaining = (ms) => {
    if (ms <= 0) return 'ready';
    const days = Math.floor(ms / 86400000);
    if (days >= 1) return `${days}d left`;
    const hrs = Math.floor(ms / 3600000);
    if (hrs >= 1) return `${hrs}h left`;
    const mins = Math.max(1, Math.floor(ms / 60000));
    return `${mins}m left`;
  };

  const render = () => {
    display.innerHTML = '';
    if (!items.length) {
      updateStats();
      return;
    }
    const row = document.createElement('div');
    row.className = 'shelved-row';

    const now = Date.now();
    items.forEach((it) => {
      const remaining = it.until - now;
      const ready = remaining <= 0;
      const el = document.createElement('div');
      el.className = 'shelved' + (ready ? ' ready' : '');
      el.innerHTML = `
        <span class="when">${ready ? 'survived the wait' : fmtRemaining(remaining)}</span>
        <span class="label"></span>
        <button class="toss" aria-label="Abandon this">✕</button>
      `;
      el.querySelector('.label').textContent = it.text;
      el.querySelector('.toss').addEventListener('click', () => abandon(it.id));
      row.appendChild(el);
    });
    display.appendChild(row);

    updateStats();
  };

  const updateStats = () => {
    statOn.textContent   = items.length;
    statSurv.textContent = stats.survived;
    statAban.textContent = stats.abandoned;
  };

  const shelf = (text) => {
    const days = getDuration();
    const now = Date.now();
    items.push({
      id: Math.random().toString(36).slice(2, 9),
      text,
      created: now,
      until: now + days * 86400000,
      days,
    });
    saveJSON(STORAGE_KEY, items);
    render();
  };

  const abandon = (id) => {
    const before = items.length;
    items = items.filter((i) => i.id !== id);
    if (items.length < before) {
      stats.abandoned += 1;
      saveJSON(STATS_KEY, stats);
      saveJSON(STORAGE_KEY, items);
    }
    render();
  };

  // mark ready items as "survived" once their timer ends — but keep them visible
  // until the user dismisses or "keeps" them. For demo simplicity, we'll auto-credit
  // survival the first time the timer flips to <= 0.
  const tick = () => {
    let dirty = false;
    const now = Date.now();
    items.forEach((it) => {
      if (!it.creditedSurvival && it.until <= now) {
        it.creditedSurvival = true;
        stats.survived += 1;
        dirty = true;
      }
    });
    if (dirty) {
      saveJSON(STATS_KEY, stats);
      saveJSON(STORAGE_KEY, items);
    }
    render();
  };

  if (button) {
    button.addEventListener('click', () => {
      const text = (input.value || '').trim();
      if (!text) {
        input.focus();
        return;
      }
      shelf(text);
      input.value = '';
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') button.click();
    });
  }

  if (display) {
    render();
    setInterval(tick, 30000); // re-evaluate twice a minute
  }

  // ---- smooth scroll ----
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
