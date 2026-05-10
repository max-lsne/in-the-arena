// Lichen — query clustering + cheat-sheet demo
// Everything lives in localStorage. No server.

const STORAGE_KEY = 'lichen.patch.v1';

const STOP_WORDS = new Set([
  'a','an','the','to','for','of','in','on','at','is','it','my','do','i','how',
  'what','why','when','where','can','does','should','with','from','that','this',
  'and','or','but','if','as','be','am','are','was','were','will','would','could',
  'me','you','your','its','vs','versus','best','way','example','code','syntax'
]);

const STEM_OVERRIDES = {
  'rebasing': 'rebase',
  'rebased': 'rebase',
  'committing': 'commit',
  'commits': 'commit',
  'committed': 'commit',
  'undoing': 'undo',
  'undid': 'undo',
  'merging': 'merge',
  'merged': 'merge',
  'cronjob': 'cron',
  'crontab': 'cron',
  'mins': 'minute',
  'min': 'minute',
  'minutes': 'minute',
  'secs': 'second',
  'seconds': 'second',
  'hrs': 'hour',
  'hours': 'hour',
  'vertical': 'vertical',
  'vertically': 'vertical',
  'horizontal': 'horizontal',
  'horizontally': 'horizontal',
  'centered': 'center',
  'centre': 'center',
  'centring': 'center',
  'centering': 'center',
  'dockerfile': 'docker',
  'containers': 'container',
  'pythonic': 'python',
  'comprehensions': 'comprehension',
};

const SEED_QUERIES = [
  'how to undo last git commit',
  'cron syntax every 15 minutes',
  'git rebase interactive squash',
  'awk print second column',
  'css center div vertically',
  'how to undo a git commit i already pushed',
  'python list comprehension if else',
  'crontab every 5 mins example',
  'flexbox vertical center',
  'awk sum column',
  'git interactive rebase squash commits',
  'python ternary in list comprehension',
  'docker remove all containers',
];

// ——— state ———

let state = load() || {
  queries: [],
  notes: {},
  hasClustered: false,
};

// ——— helpers ———

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function tokens(q) {
  return q
    .toLowerCase()
    .replace(/[^\w\s\-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(t => STEM_OVERRIDES[t] || t)
    .filter(t => !STOP_WORDS.has(t) && t.length > 1 && !/^\d+$/.test(t));
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function cluster(queries) {
  // Simple greedy clustering: each query joins the highest-similarity
  // existing cluster above threshold, else starts a new one.
  const THRESH = 0.3;
  const clusters = [];

  for (const q of queries) {
    const qTokens = tokens(q);
    if (!qTokens.length) continue;

    let best = { idx: -1, score: 0 };
    clusters.forEach((c, idx) => {
      // Compare against the cluster's centroid (union of tokens), capped.
      const score = jaccard(qTokens, c.tokens);
      if (score > best.score) best = { idx, score };
    });

    if (best.idx >= 0 && best.score >= THRESH) {
      const c = clusters[best.idx];
      c.queries.push(q);
      // expand cluster tokens (keep most common, soft cap)
      for (const t of qTokens) if (!c.tokens.includes(t)) c.tokens.push(t);
    } else {
      clusters.push({ queries: [q], tokens: [...qTokens] });
    }
  }

  // Keep only clusters with 2+ rhymes — single-time queries aren't signal yet.
  return clusters
    .filter(c => c.queries.length >= 2)
    .map(c => ({
      ...c,
      title: titleOf(c),
    }))
    .sort((a, b) => b.queries.length - a.queries.length);
}

function titleOf(cluster) {
  // Pick the most "shared" tokens across this cluster as a title.
  const counts = {};
  for (const q of cluster.queries) {
    for (const t of new Set(tokens(q))) counts[t] = (counts[t] || 0) + 1;
  }
  const ranked = Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
  if (ranked.length === 0) {
    // fall back to the shortest query
    return cluster.queries.slice().sort((a, b) => a.length - b.length)[0];
  }
  return ranked.join(' · ');
}

function clusterKey(c) {
  return c.title.toLowerCase().replace(/\s+/g, '_');
}

// ——— rendering ———

const queriesList = document.getElementById('queries-list');
const patchEl = document.getElementById('patch');
const patchOut = document.getElementById('patch-out');
const statQueries = document.getElementById('stat-queries');
const statClusters = document.getElementById('stat-clusters');
const statNotes = document.getElementById('stat-notes');

function render() {
  // Query pills
  queriesList.innerHTML = '';
  state.queries.forEach((q, i) => {
    const pill = document.createElement('span');
    pill.className = 'query-pill';
    pill.innerHTML = `<span></span><button aria-label="remove">×</button>`;
    pill.firstChild.textContent = q;
    pill.querySelector('button').addEventListener('click', () => {
      state.queries.splice(i, 1);
      save();
      render();
    });
    queriesList.appendChild(pill);
  });

  statQueries.textContent = state.queries.length;

  // Patch
  if (state.hasClustered) {
    const clusters = cluster(state.queries);
    statClusters.textContent = clusters.length;
    statNotes.textContent = clusters.filter(c => (state.notes[clusterKey(c)] || '').trim()).length;

    if (clusters.length === 0) {
      patchEl.hidden = false;
      patchOut.innerHTML = `<p class="microcopy small">No repeats yet. Add a query that rhymes with one you've already typed — or seed the demo to see it in action.</p>`;
    } else {
      patchEl.hidden = false;
      patchOut.innerHTML = '';
      clusters.forEach(c => {
        const key = clusterKey(c);
        const card = document.createElement('div');
        card.className = 'cheat-card';
        card.innerHTML = `
          <div class="cheat-head">
            <p class="cheat-title"></p>
            <span class="cheat-count">${c.queries.length}× asked</span>
          </div>
          <div class="cheat-rhymes"></div>
          <textarea class="cheat-note" placeholder="Three lines max — what you actually figured out…" rows="2"></textarea>
        `;
        card.querySelector('.cheat-title').textContent = c.title;
        const rhymes = card.querySelector('.cheat-rhymes');
        c.queries.forEach(q => {
          const r = document.createElement('span');
          r.className = 'cheat-rhyme';
          r.textContent = q;
          rhymes.appendChild(r);
        });
        const ta = card.querySelector('.cheat-note');
        ta.value = state.notes[key] || '';
        ta.addEventListener('input', () => {
          state.notes[key] = ta.value;
          save();
          statNotes.textContent = Object.values(state.notes).filter(v => (v || '').trim()).length;
        });
        patchOut.appendChild(card);
      });
    }
  } else {
    patchEl.hidden = true;
    statClusters.textContent = 0;
    statNotes.textContent = 0;
  }
}

// ——— interactions ———

document.getElementById('add-btn').addEventListener('click', addQuery);
document.getElementById('query-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addQuery(); }
});

function addQuery() {
  const input = document.getElementById('query-input');
  const v = (input.value || '').trim();
  if (!v) return;
  state.queries.push(v);
  input.value = '';
  save();
  render();
}

document.getElementById('cluster-btn').addEventListener('click', () => {
  if (state.queries.length === 0) {
    flashMsg('Add or seed some queries first.');
    return;
  }
  state.hasClustered = true;
  save();
  render();
  patchEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('seed-btn').addEventListener('click', () => {
  state.queries = [...SEED_QUERIES];
  state.hasClustered = true;
  save();
  render();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  state = { queries: [], notes: {}, hasClustered: false };
  save();
  render();
});

// ——— waitlist ———

const form = document.getElementById('waitlist');
const formMsg = document.getElementById('form-msg');
form.addEventListener('submit', e => {
  e.preventDefault();
  const email = form.querySelector('input').value.trim();
  if (!email) return;
  formMsg.textContent = `You're in. We'll only write when there's something worth re-finding.`;
  formMsg.style.color = '#b6603a';
  form.reset();
});

function flashMsg(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #283832; color: #f6f1e6; padding: 10px 16px; border-radius: 999px;
    font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.3); z-index: 100;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// ——— init ———

render();
