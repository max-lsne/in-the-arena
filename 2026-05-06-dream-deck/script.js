// Waitlist form
const form = document.getElementById('waitlist');
const formMsg = document.getElementById('form-msg');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.querySelector('input').value.trim();
  if (!email) return;
  form.querySelector('input').value = '';
  formMsg.textContent = `You're in. We'll send the first insight letter to ${email}.`;
  formMsg.style.color = 'var(--accent-2)';
});

// Demo: lightweight symbol "reading"
const SYMBOLS = {
  water:    { tag: 'water', meaning: 'emotional undercurrent — something you feel but haven\'t named.' },
  ocean:    { tag: 'ocean', meaning: 'a vast feeling-state you\'re standing at the edge of.' },
  river:    { tag: 'river', meaning: 'time moving without permission.' },
  rain:     { tag: 'rain', meaning: 'release. cleansing. or grief loosening its grip.' },
  flood:    { tag: 'flood', meaning: 'an emotion outpacing your capacity to hold it.' },
  house:    { tag: 'house', meaning: 'the architecture of the self.' },
  childhood:{ tag: 'childhood home', meaning: 'an old version of you still keeping residency.' },
  hallway:  { tag: 'hallway', meaning: 'transition — between who you were and who you\'re becoming.' },
  door:     { tag: 'door', meaning: 'choice. or something asking to be let in.' },
  stairs:   { tag: 'stairs', meaning: 'effort toward a different level — emotional or social.' },
  fall:     { tag: 'falling', meaning: 'loss of control. surrender. or trust in free-fall.' },
  flying:   { tag: 'flying', meaning: 'freedom — or escape from something heavy.' },
  chase:    { tag: 'chase', meaning: 'an avoidance catching up with you.' },
  teeth:    { tag: 'teeth', meaning: 'a visible part of you you\'re afraid is failing.' },
  car:      { tag: 'car', meaning: 'agency over your own direction.' },
  road:     { tag: 'road', meaning: 'the path you\'re currently choosing.' },
  forest:   { tag: 'forest', meaning: 'the unconscious — dense, alive, asking to be entered.' },
  mother:   { tag: 'mother', meaning: 'a primary attachment template surfacing.' },
  father:   { tag: 'father', meaning: 'authority, structure, or absence of it.' },
  baby:     { tag: 'baby', meaning: 'a new part of yourself in early formation.' },
  ex:       { tag: 'an ex', meaning: 'unfinished emotional grammar.' },
  school:   { tag: 'school', meaning: 'old performance pressure resurfacing.' },
  exam:     { tag: 'exam', meaning: 'the fear of being measured before you\'re ready.' },
  naked:    { tag: 'nakedness', meaning: 'exposure — or the fear of being truly seen.' },
  dark:     { tag: 'darkness', meaning: 'unknown territory — not necessarily threatening.' },
  light:    { tag: 'light', meaning: 'orientation. clarity coming online.' },
  fire:     { tag: 'fire', meaning: 'transformation that won\'t wait politely.' },
  snake:    { tag: 'snake', meaning: 'change at the level of skin — something shedding.' },
  dog:      { tag: 'dog', meaning: 'loyalty — or a part of you that needs care.' },
  cat:      { tag: 'cat', meaning: 'autonomy. a self that doesn\'t need permission.' },
  bird:     { tag: 'bird', meaning: 'a perspective trying to lift above the situation.' },
  phone:    { tag: 'phone', meaning: 'the longing or dread of being reached.' },
  mirror:   { tag: 'mirror', meaning: 'a confrontation with how you actually appear to yourself.' },
};

const MOODS = [
  { keys: ['scared', 'afraid', 'fear', 'terrified', 'panic'], label: 'unease' },
  { keys: ['sad', 'crying', 'tears', 'grief', 'lonely'], label: 'grief' },
  { keys: ['happy', 'laughing', 'joy', 'warm'], label: 'warmth' },
  { keys: ['angry', 'rage', 'furious', 'shouting'], label: 'heat' },
  { keys: ['confused', 'lost', 'searching', 'looking for'], label: 'searching' },
  { keys: ['running', 'chase', 'escape'], label: 'flight' },
  { keys: ['floating', 'flying', 'drifting'], label: 'release' },
];

const button = document.getElementById('analyze-btn');
const input = document.getElementById('dream-input');
const output = document.getElementById('demo-output');

button.addEventListener('click', () => {
  const text = (input.value || '').toLowerCase().trim();
  if (!text) {
    output.innerHTML = '<em>Type a fragment first — even one sentence is enough.</em>';
    return;
  }

  const found = [];
  const seen = new Set();
  for (const key in SYMBOLS) {
    if (text.includes(key) && !seen.has(SYMBOLS[key].tag)) {
      found.push(SYMBOLS[key]);
      seen.add(SYMBOLS[key].tag);
    }
  }

  let mood = null;
  for (const m of MOODS) {
    if (m.keys.some(k => text.includes(k))) { mood = m.label; break; }
  }

  if (!found.length && !mood) {
    output.innerHTML = `
      <p><strong>The reading:</strong> nothing recognizable yet — but that's data too. Dreams that resist tagging are often the ones doing the deepest sorting.</p>
      <p style="margin:0;color:var(--ink-dim);font-size:0.85rem">Tip: try mentioning a place, a person, or an element (water, fire, light).</p>`;
    return;
  }

  const tags = found.map(f => `<span class="tag">${f.tag}</span>`).join('');
  const moodLine = mood ? `<p><strong>Emotional weather:</strong> ${mood}.</p>` : '';
  const readings = found.slice(0, 3).map(f => `<li><strong>${f.tag}</strong> — ${f.meaning}</li>`).join('');

  output.innerHTML = `
    <div>${tags}</div>
    ${moodLine}
    <p style="margin:0.6rem 0 0.4rem"><strong>What we're noticing:</strong></p>
    <ul style="margin:0;padding-left:1.1rem;color:var(--ink-dim);font-size:0.92rem">${readings}</ul>
    <p style="margin-top:0.9rem;font-size:0.82rem;color:var(--ink-dim)">In the full app, DreamDeck cross-references these with months of your prior entries to find true patterns.</p>
  `;
});
