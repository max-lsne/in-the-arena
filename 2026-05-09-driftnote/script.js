/* ---------- Driftnote — interactive demo ---------- */

const STORAGE_KEY = 'driftnote.v1';

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','of','to','in','on','at','for','with','by','from','as',
  'is','am','are','was','were','be','been','being','do','does','did','have','has','had','having',
  'i','me','my','mine','we','us','our','you','your','yours','they','them','their','he','she','it','its',
  'this','that','these','those','what','which','who','whom','whose','where','when','why','how',
  'so','not','no','yes','too','very','just','really','maybe','about','some','any','one','two','three',
  'can','could','would','should','will','shall','may','might','must','than','because','also','still',
  'into','out','up','down','over','under','again','more','most','less','other','same','own',
  'while','during','before','after','here','there','now','always','never','sometimes','often',
  'feel','feels','feeling','felt','think','thinks','thinking','thought','thoughts','wonder','wondering',
  'gonna','wanna','kinda','really','actually','maybe','probably','seem','seems','seemed',
  'thing','things','stuff','way','ways','someone','something','anything','everything','nothing',
  'don\'t','doesn\'t','didn\'t','can\'t','won\'t','isn\'t','aren\'t','wasn\'t','weren\'t','hasn\'t','haven\'t','hadn\'t',
  'i\'m','i\'ve','i\'ll','i\'d','you\'re','you\'ve','you\'ll','you\'d','we\'re','we\'ve','they\'re','they\'ve',
  'like','liked','likes','want','wants','wanted','need','needs','needed','get','got','gets','getting',
  'know','knows','knew','known','make','makes','made','making','keep','keeps','kept','keeping',
  'going','went','gone','come','came','says','said','saying',
  'much','many','few','little','big','small','good','bad','better','worse','best','worst',
  'us','him','her','old','new','first','last'
]);

const SEEDED = [
  "Quiet might actually be the product, not just a side effect of being small.",
  "I keep starting new docs instead of finishing the old ones — what is that pattern?",
  "Sleeping badly the nights I don't go on a morning walk. Three weeks running.",
  "The best onboarding I've ever seen had no welcome screen at all.",
  "Walking is when the actual thinking happens. Desk is just for typing it up.",
  "Small teams ship faster because they have fewer meetings, not because they work harder.",
  "Why do I always check email before I've decided what today is for?",
  "Quiet apps win the second decade. Loud apps win the first."
];

const $ = (id) => document.getElementById(id);

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { thoughts: [], lastWeave: null };
    const parsed = JSON.parse(raw);
    if (!parsed.thoughts) parsed.thoughts = [];
    return parsed;
  } catch {
    return { thoughts: [], lastWeave: null };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function fmtAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

/* ---------- thought management ---------- */

function addThought(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  state.thoughts.push({
    id: 'tn_' + Math.random().toString(36).slice(2, 9),
    text: trimmed,
    at: Date.now()
  });
  save();
  render();
  return true;
}

function removeThought(id) {
  state.thoughts = state.thoughts.filter(t => t.id !== id);
  save();
  render();
}

function seedThoughts() {
  // backdate the seeded ones so they feel like a week of capture
  const now = Date.now();
  const offsets = [3, 18, 36, 60, 90, 130, 170, 220]; // minutes ago, spread out
  state.thoughts = SEEDED.map((text, i) => ({
    id: 'tn_seed_' + i,
    text,
    at: now - (offsets[i] || (i + 1) * 30) * 60 * 1000
  }));
  state.lastWeave = null;
  save();
  render();
}

function reset() {
  state = { thoughts: [], lastWeave: null };
  save();
  render();
}

/* ---------- weaving (clustering) ---------- */

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w && w.length > 2 && !STOPWORDS.has(w));
}

function stem(word) {
  // very gentle stemming so "walks", "walking", "walked" → "walk"
  return word
    .replace(/('s|s)$/, '')
    .replace(/(ing|ed)$/, '')
    .replace(/(ly|er|est)$/, '');
}

function weave(thoughts) {
  if (thoughts.length === 0) return { themes: [], echoes: 0, untethered: [] };

  // Build per-thought stem sets and a global stem frequency
  const stemFreq = new Map();
  const enriched = thoughts.map(t => {
    const stems = new Set(tokenize(t.text).map(stem).filter(s => s.length > 2));
    for (const s of stems) stemFreq.set(s, (stemFreq.get(s) || 0) + 1);
    return { ...t, stems };
  });

  // Themes: any stem that appears in at least 2 thoughts
  const themeStems = [...stemFreq.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  // Greedy assignment: each thought goes to its highest-frequency theme stem
  const themeMap = new Map(); // stem → [thought,…]
  const assigned = new Set();
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let echoes = 0;

  for (const t of enriched) {
    let best = null;
    let bestFreq = 0;
    for (const s of themeStems) {
      if (t.stems.has(s) && (stemFreq.get(s) || 0) > bestFreq) {
        best = s;
        bestFreq = stemFreq.get(s);
      }
    }
    if (best) {
      if (!themeMap.has(best)) themeMap.set(best, []);
      themeMap.get(best).push(t);
      assigned.add(t.id);
    }
  }

  // For each theme, mark "echo" if any thought is older than a week
  // (with seeded data, none will be — but mark thoughts that are siblings
  // captured >12h apart as echoes, to make the demo feel alive)
  const themes = [...themeMap.entries()].map(([stem, ts]) => {
    ts.sort((a, b) => b.at - a.at);
    const span = ts.length > 1 ? ts[0].at - ts[ts.length - 1].at : 0;
    const hasEcho = span > 12 * 60 * 60 * 1000 || ts.some(t => t.at < oneWeekAgo);
    if (hasEcho) echoes++;
    return {
      stem,
      label: prettyLabel(stem, ts),
      thoughts: ts,
      hasEcho
    };
  });

  themes.sort((a, b) => b.thoughts.length - a.thoughts.length);

  const untethered = enriched.filter(t => !assigned.has(t.id));

  return { themes, echoes, untethered };
}

function prettyLabel(themeStem, thoughts) {
  // surface the longest surface-form word that stems to this theme
  let bestWord = themeStem;
  let bestLen = themeStem.length;
  for (const t of thoughts) {
    for (const w of tokenize(t.text)) {
      if (w.length > bestLen && stem(w) === themeStem) {
        bestWord = w;
        bestLen = w.length;
      }
    }
  }
  return bestWord;
}

/* ---------- rendering ---------- */

function render() {
  const list = $('thoughts-list');
  list.innerHTML = '';
  state.thoughts
    .slice()
    .sort((a, b) => b.at - a.at)
    .forEach(t => {
      const row = document.createElement('div');
      row.className = 'thought';
      row.innerHTML = `
        <div>
          <div class="thought-text"></div>
          <span class="thought-meta"></span>
        </div>
        <button class="thought-remove" aria-label="Remove thought">×</button>
      `;
      row.querySelector('.thought-text').textContent = t.text;
      row.querySelector('.thought-meta').textContent = fmtAgo(t.at);
      row.querySelector('.thought-remove').addEventListener('click', () => removeThought(t.id));
      list.appendChild(row);
    });

  $('stat-thoughts').textContent = state.thoughts.length;
  if (state.lastWeave) {
    $('stat-themes').textContent = state.lastWeave.themes.length;
    $('stat-echoes').textContent = state.lastWeave.echoes;
    renderConstellation(state.lastWeave);
  } else {
    $('stat-themes').textContent = 0;
    $('stat-echoes').textContent = 0;
    $('constellation').hidden = true;
  }
}

function renderConstellation(woven) {
  const root = $('constellation');
  const out = $('themes-out');
  out.innerHTML = '';

  if (woven.themes.length === 0 && woven.untethered.length === 0) {
    root.hidden = true;
    return;
  }

  for (const theme of woven.themes) {
    const block = document.createElement('div');
    block.className = 'theme';
    const echoTag = theme.hasEcho
      ? `<span class="theme-echo">↺ echo</span>`
      : '';
    block.innerHTML = `
      <div class="theme-name">
        <span></span>
        <span class="theme-count"></span>
        ${echoTag}
      </div>
      <ul class="theme-thoughts"></ul>
    `;
    block.querySelector('.theme-name span:first-child').textContent = theme.label;
    block.querySelector('.theme-count').textContent =
      `${theme.thoughts.length} thought${theme.thoughts.length === 1 ? '' : 's'}`;
    const ul = block.querySelector('.theme-thoughts');
    for (const t of theme.thoughts) {
      const li = document.createElement('li');
      li.textContent = t.text;
      ul.appendChild(li);
    }
    out.appendChild(block);
  }

  if (woven.untethered.length > 0) {
    const block = document.createElement('div');
    block.className = 'theme';
    block.innerHTML = `
      <div class="theme-name">
        <span>still drifting</span>
        <span class="theme-count"></span>
      </div>
      <ul class="theme-thoughts"></ul>
    `;
    block.querySelector('.theme-count').textContent =
      `${woven.untethered.length} thought${woven.untethered.length === 1 ? '' : 's'} · no theme yet`;
    const ul = block.querySelector('.theme-thoughts');
    for (const t of woven.untethered) {
      const li = document.createElement('li');
      li.textContent = t.text;
      ul.appendChild(li);
    }
    out.appendChild(block);
  }

  root.hidden = false;
}

/* ---------- waitlist ---------- */

function setupWaitlist() {
  const form = $('waitlist');
  const msg = $('form-msg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const v = (input.value || '').trim();
    if (!v) return;
    msg.textContent = `On the list — we'll send a quiet note when it's ready.`;
    input.value = '';
    input.blur();
  });
}

/* ---------- wiring ---------- */

function setup() {
  $('catch-btn').addEventListener('click', () => {
    const ta = $('thought-input');
    if (addThought(ta.value)) {
      ta.value = '';
      ta.focus();
    }
  });

  $('thought-input').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      $('catch-btn').click();
    }
  });

  $('weave-btn').addEventListener('click', () => {
    const woven = weave(state.thoughts);
    state.lastWeave = woven;
    save();
    render();
    const el = $('constellation');
    if (!el.hidden) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('seed-btn').addEventListener('click', () => {
    seedThoughts();
  });

  $('reset-btn').addEventListener('click', () => {
    reset();
  });

  setupWaitlist();
  render();
}

document.addEventListener('DOMContentLoaded', setup);
