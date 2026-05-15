// Cairn — a small in-browser trail demo.
//
// Twenty-eight weeks of a doctoral year. Each stone is one Sunday.
// Edit any stone (kind, weight, or both). Add this Sunday's. Reset.
// Nothing leaves the browser.

const KINDS = ['made', 'learned', 'navigated', 'rested', 'lost'];

const KIND_LABEL = {
  made: 'Made',
  learned: 'Learned',
  navigated: 'Navigated',
  rested: 'Rested',
  lost: 'Lost',
};

const KIND_COLOR = {
  made: 'var(--made)',
  learned: 'var(--learned)',
  navigated: 'var(--navigated)',
  rested: 'var(--rested)',
  lost: 'var(--lost)',
};

// Twenty-eight stones. A real-looking year-two arc: a strong autumn,
// a brutal February, navigation in March, a recovery, then output.
const SEED = [
  { kind: 'learned',    weight: 3, sentence: 'Read three chapters of Cavell on acknowledgement; took notes on the third one only.' },
  { kind: 'learned',    weight: 4, sentence: 'Mapped the gap between Brandom and McDowell that the chapter has to live in.' },
  { kind: 'made',       weight: 3, sentence: 'Drafted the introduction to chapter two. Bad sentences, real argument.' },
  { kind: 'made',       weight: 4, sentence: 'Wrote the middle section of chapter two in one long Saturday.' },
  { kind: 'navigated',  weight: 2, sentence: 'Decided the third chapter is one chapter, not two.' },
  { kind: 'made',       weight: 4, sentence: 'Finished a credible first pass at chapter two.' },
  { kind: 'rested',     weight: 2, sentence: 'Cabin with my brother. Phone in a drawer. Slept.' },
  { kind: 'learned',    weight: 3, sentence: 'Two long conversations with Mira about her work on testimony.' },
  { kind: 'made',       weight: 3, sentence: 'Opened chapter three and wrote the table of contents I will keep.' },
  { kind: 'lost',       weight: 1, sentence: 'Flu. Nothing got written. The week is here on the trail anyway.' },
  { kind: 'made',       weight: 2, sentence: 'Eight hundred words of chapter three. The opening I had to write to know what it should be.' },
  { kind: 'made',       weight: 4, sentence: 'Six days at the desk. Eighteen pages. The kind of week the rest of the year is paid for by.' },
  { kind: 'learned',    weight: 3, sentence: 'Talked to the advisor about the structural problem. He said the right hard thing.' },
  { kind: 'navigated',  weight: 3, sentence: 'Cut the second half of chapter three. It belongs in chapter four.' },
  { kind: 'lost',       weight: 1, sentence: 'Three days of grant admin. Two days of not writing about not writing.' },
  { kind: 'lost',       weight: 2, sentence: 'February. The kind of February you have once a year.' },
  { kind: 'rested',     weight: 2, sentence: 'Sister visiting; walks; the work waited and was fine.' },
  { kind: 'navigated',  weight: 4, sentence: 'Reread the whole draft start to finish. Found the thesis I have actually been arguing.' },
  { kind: 'made',       weight: 3, sentence: 'Rewrote chapter one to match the thesis I actually have.' },
  { kind: 'made',       weight: 4, sentence: 'Chapter four drafted to the end. First time the arc holds.' },
  { kind: 'learned',    weight: 2, sentence: 'Two papers and a long Anscombe footnote that opens a small door.' },
  { kind: 'made',       weight: 3, sentence: 'Tightened chapters two and three. Cut six pages I will not miss.' },
  { kind: 'navigated',  weight: 2, sentence: 'Set the defence target for late next spring.' },
  { kind: 'made',       weight: 4, sentence: 'Whole-draft pass with the advisor in the room. Survived it.' },
  { kind: 'rested',     weight: 3, sentence: 'A week off after submission of the partial draft. Walked, did not read philosophy.' },
  { kind: 'made',       weight: 3, sentence: 'Started chapter five. Easier than expected. Suspicious of that.' },
  { kind: 'learned',    weight: 2, sentence: 'Long evening with the McDowell reading group. Came away with two pages of notes.' },
  { kind: 'made',       weight: 3, sentence: 'Chapter five through the first hard section. The middle holds.' },
];

let state = {
  stones: SEED.map((s, i) => ({ ...s, week: i + 1 })),
  selected: SEED.length - 1,
};

// ----- DOM -----
const stageEl = document.getElementById('trail-stage');
const axisEl = document.getElementById('trail-axis');
const totalsEl = document.getElementById('trail-totals');
const currentWeekEl = document.getElementById('current-week');
const currentSentenceEl = document.getElementById('current-sentence');
const stonePickerEl = document.getElementById('stone-picker');
const weightSliderEl = document.getElementById('weight-slider');
const weightValueEl = document.getElementById('weight-value');
const addWeekBtn = document.getElementById('add-week');
const resetLink = document.getElementById('reset-demo');
const joinForm = document.getElementById('join-form');
const joinFoot = document.getElementById('join-foot');

// ----- render -----
function render() {
  renderStage();
  renderAxis();
  renderTotals();
  renderCurrent();
}

function renderStage() {
  stageEl.innerHTML = '';
  const max = 5;
  state.stones.forEach((stone, i) => {
    const el = document.createElement('div');
    el.className = `stone ${stone.kind}`;
    el.style.height = `${22 + (stone.weight / max) * 156}px`;
    el.dataset.idx = String(i);
    el.title = `Week ${stone.week} · ${KIND_LABEL[stone.kind]} · weight ${stone.weight}`;
    if (i === state.selected) el.classList.add('selected');
    el.addEventListener('click', () => {
      state.selected = i;
      render();
    });
    stageEl.appendChild(el);
  });
}

function renderAxis() {
  axisEl.innerHTML = '';
  const len = state.stones.length;
  state.stones.forEach((stone, i) => {
    const tick = document.createElement('span');
    tick.className = 'axis-tick';
    const show = i === 0 || i === len - 1 || (stone.week % 4 === 0);
    if (show) {
      tick.classList.add('show');
      tick.textContent = `w${stone.week}`;
    }
    axisEl.appendChild(tick);
  });
}

function renderTotals() {
  const counts = { made: 0, learned: 0, navigated: 0, rested: 0, lost: 0 };
  state.stones.forEach(s => { counts[s.kind] += 1; });
  totalsEl.innerHTML = '';
  KINDS.forEach(k => {
    const pill = document.createElement('span');
    pill.className = 'total-pill';
    pill.innerHTML = `<span class="swatch" style="background:${KIND_COLOR[k]}"></span>${KIND_LABEL[k]} · ${counts[k]}`;
    totalsEl.appendChild(pill);
  });
}

function renderCurrent() {
  const stone = state.stones[state.selected];
  currentWeekEl.textContent = String(stone.week);
  currentSentenceEl.textContent = `"${stone.sentence}"`;
  weightSliderEl.value = String(stone.weight);
  weightValueEl.textContent = String(stone.weight);
  for (const btn of stonePickerEl.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.kind === stone.kind);
  }
}

// ----- listeners -----
stonePickerEl.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const kind = btn.dataset.kind;
  if (!KINDS.includes(kind)) return;
  state.stones[state.selected].kind = kind;
  render();
});

weightSliderEl.addEventListener('input', e => {
  state.stones[state.selected].weight = Number(e.target.value);
  render();
});

addWeekBtn.addEventListener('click', () => {
  const last = state.stones[state.stones.length - 1];
  state.stones.push({
    week: last.week + 1,
    kind: 'navigated',
    weight: 2,
    sentence: 'This Sunday. Choose a stone, set its weight, and write the truest sentence you can.',
  });
  state.selected = state.stones.length - 1;
  render();
});

resetLink.addEventListener('click', e => {
  e.preventDefault();
  state = {
    stones: SEED.map((s, i) => ({ ...s, week: i + 1 })),
    selected: SEED.length - 1,
  };
  render();
});

joinForm.addEventListener('submit', e => {
  e.preventDefault();
  const input = joinForm.querySelector('input');
  if (!input.value) return;
  joinFoot.textContent = `Held. We'll write to ${input.value} when the first season opens — once, and only then.`;
  input.value = '';
});

render();
