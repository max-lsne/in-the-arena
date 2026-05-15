// Threshold — a small in-browser list demo.
//
// Six doorways. Each is a conversation a person keeps meaning to have.
// Lean on one to see the sentence. Change the room or the waiting days.
// Mark it "had" and it closes — the rest of the list lightens because
// that doorway is no longer the heaviest thing in the hall.
// Nothing leaves the browser.

const ROOMS = ['family', 'work', 'money', 'body', 'friends', 'self'];

const ROOM_LABEL = {
  family:  'Family',
  work:    'Work',
  money:   'Money',
  body:    'Body',
  friends: 'Friends',
  self:    'Self',
};

const ROOM_COLOR = {
  family:  'var(--family)',
  work:    'var(--work)',
  money:   'var(--money)',
  body:    'var(--body)',
  friends: 'var(--friends)',
  self:    'var(--self)',
};

// A real-looking Threshold for a thirty-four-year-old founder in Lisbon,
// mid-May 2026. Six doorways. Days = how long the doorway has waited.
const SEED = [
  { room: 'work',    who: 'Tomás · cofounder',   days: 92,  sentence: 'Tell him the equity split has to change before we raise, and that I have been carrying the talk for three months.' },
  { room: 'family',  who: 'Mum',                 days: 41,  sentence: "Say I am not coming for Christmas this year, and that it is not the year I will be persuaded otherwise." },
  { room: 'money',   who: 'The landlord',        days: 17,  sentence: 'Ask for the lease to be in my name only after Inês moves out, and what that does to the rent.' },
  { room: 'body',    who: 'Dr. Almeida',         days: 64,  sentence: 'Make the appointment. The thing on my back has not gotten smaller in two months.' },
  { room: 'friends', who: 'Catarina',            days: 213, sentence: 'Write the long email. Say what I should have said in March instead of vanishing.' },
  { room: 'self',    who: 'Myself · the drink',  days: 308, sentence: "Decide whether 'a glass with dinner' is what I do, or what I tell myself I do." },
];

const STORAGE_KEY = 'threshold-demo-v1';

let state = loadState() || {
  doors: SEED.map(d => ({ ...d })),
  selected: SEED.length - 1,
};

// ----- DOM -----
const doorsEl       = document.getElementById('doors');
const totalsEl      = document.getElementById('list-totals');
const currentWhoEl  = document.getElementById('current-who');
const currentSentEl = document.getElementById('current-sentence');
const roomPickerEl  = document.getElementById('room-picker');
const daysSliderEl  = document.getElementById('days-slider');
const daysValueEl   = document.getElementById('days-value');
const hadItBtn      = document.getElementById('had-it');
const resetLink     = document.getElementById('reset-list');
const joinForm      = document.getElementById('join-form');
const joinFoot      = document.getElementById('join-foot');

// ----- render -----
function render() {
  renderDoors();
  renderTotals();
  renderCurrent();
  saveState();
}

function renderDoors() {
  doorsEl.innerHTML = '';
  state.doors.forEach((door, i) => {
    const li = document.createElement('li');
    li.className = 'doorway';
    if (i === state.selected) li.classList.add('selected');
    li.dataset.idx = String(i);

    const tag = document.createElement('span');
    tag.className = 'room-tag';
    tag.innerHTML = `<span class="dot" style="background:${ROOM_COLOR[door.room]}"></span>${ROOM_LABEL[door.room]}`;

    const who = document.createElement('p');
    who.className = 'who';
    who.textContent = door.who;

    const waiting = document.createElement('span');
    waiting.className = 'waiting';
    waiting.textContent = waitingLabel(door.days);

    const bar = document.createElement('span');
    bar.className = 'weight-bar';
    const fill = document.createElement('span');
    fill.className = 'weight-fill';
    fill.style.width = `${weightPct(door.days)}%`;
    fill.style.background = ROOM_COLOR[door.room];
    bar.appendChild(fill);

    li.appendChild(tag);
    li.appendChild(who);
    li.appendChild(waiting);
    li.appendChild(bar);

    li.addEventListener('click', () => {
      state.selected = i;
      render();
    });

    doorsEl.appendChild(li);
  });
}

function renderTotals() {
  totalsEl.innerHTML = '';
  const total = state.doors.length;
  const heaviest = state.doors.reduce((acc, d) => d.days > acc.days ? d : acc, state.doors[0]);
  const sumDays  = state.doors.reduce((acc, d) => acc + d.days, 0);

  const open = document.createElement('span');
  open.className = 'total-pill';
  open.innerHTML = `<span class="swatch" style="background:var(--ember)"></span>Open · ${total}`;

  const oldest = document.createElement('span');
  oldest.className = 'total-pill';
  oldest.innerHTML = `<span class="swatch" style="background:${ROOM_COLOR[heaviest.room]}"></span>Heaviest · ${heaviest.days}d`;

  const carried = document.createElement('span');
  carried.className = 'total-pill';
  carried.innerHTML = `<span class="swatch" style="background:var(--slate)"></span>Carried · ${sumDays}d`;

  totalsEl.appendChild(open);
  totalsEl.appendChild(oldest);
  totalsEl.appendChild(carried);
}

function renderCurrent() {
  if (state.doors.length === 0) {
    currentWhoEl.textContent = '—';
    currentSentEl.textContent = 'The hall is empty. Quiet feels different when nothing is waiting in it.';
    daysSliderEl.value = '0';
    daysValueEl.textContent = '—';
    for (const btn of roomPickerEl.querySelectorAll('button')) btn.classList.remove('active');
    hadItBtn.disabled = true;
    return;
  }
  hadItBtn.disabled = false;
  const door = state.doors[state.selected];
  currentWhoEl.textContent = door.who;
  currentSentEl.textContent = `"${door.sentence}"`;
  daysSliderEl.value = String(door.days);
  daysValueEl.textContent = waitingLabel(door.days);
  for (const btn of roomPickerEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.room === door.room);
  }
}

function waitingLabel(days) {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 14)  return `${days} days`;
  if (days < 60)  return `${Math.round(days / 7)} weeks`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = days / 365;
  return years < 1.25 ? 'a year' : `${years.toFixed(1)} years`;
}

function weightPct(days) {
  // 0–365 days → 8–100%. Log-ish curve so a recent doorway still shows weight.
  const x = Math.max(0, Math.min(days, 365));
  return 8 + Math.round(92 * Math.sqrt(x / 365));
}

// ----- listeners -----
roomPickerEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const room = btn.dataset.room;
  if (!ROOMS.includes(room)) return;
  if (state.doors.length === 0) return;
  state.doors[state.selected].room = room;
  render();
});

daysSliderEl.addEventListener('input', e => {
  if (state.doors.length === 0) return;
  state.doors[state.selected].days = Number(e.target.value);
  render();
});

hadItBtn.addEventListener('click', () => {
  if (state.doors.length === 0) return;
  state.doors.splice(state.selected, 1);
  if (state.selected >= state.doors.length) {
    state.selected = Math.max(0, state.doors.length - 1);
  }
  render();
});

resetLink.addEventListener('click', e => {
  e.preventDefault();
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
  state = {
    doors: SEED.map(d => ({ ...d })),
    selected: SEED.length - 1,
  };
  render();
});

joinForm.addEventListener('submit', e => {
  e.preventDefault();
  const input = joinForm.querySelector('input');
  if (!input.value) return;
  joinFoot.textContent = `Held. We will write to ${input.value} when the first thresholds open — once, and only then.`;
  input.value = '';
});

// ----- storage -----
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.doors)) return null;
    for (const door of parsed.doors) {
      if (!ROOMS.includes(door.room)) return null;
      if (typeof door.days !== 'number') return null;
      if (typeof door.who !== 'string') return null;
      if (typeof door.sentence !== 'string') return null;
    }
    if (typeof parsed.selected !== 'number' || parsed.selected < 0 || parsed.selected >= parsed.doors.length) {
      parsed.selected = Math.max(0, parsed.doors.length - 1);
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // storage full or disabled — fine, the demo still works
  }
}

render();
