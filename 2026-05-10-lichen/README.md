# Lichen

> Stop being a beginner at things you stopped being a beginner at.

Lichen is a quiet sidekick that watches what you keep re-Googling and turns it into a personal cheat-sheet of stuff you've actually used. Not a wiki you have to maintain. Not a course you have to finish. A slow-growing patch of *your* knowledge — earned, not curated.

## The idea

You learned `awk` in 2021. You learned it again in 2023. You're about to learn it a third time.

The internet has every answer. Your search history is full of evidence that *you've already had every answer*. The gap is between the moment you understood a thing and the moment, six months later, you needed it again — and didn't trust yourself to remember.

Lichen sits in that gap.

1. **Catches repeats.** It only notices the queries you've made more than once. The first time you Google `cron syntax` is research. The fourth time is a signal.
2. **Grows micro-notes.** Each repeat gets a tiny card: the thing, the answer you arrived at, the project where it mattered. Three lines, max. A cheat-sheet, not a textbook.
3. **Surfaces at the right moment.** When you start typing a query that rhymes with one you've already solved, Lichen quietly hands you your own old note before you finish.

The bet: most "personal knowledge management" apps fail because they ask you to file things you didn't know you'd need. Lichen flips it — it only files the things you've already proved you need, by Googling them twice.

## What's in this folder

A static landing page with a working in-browser demo. Paste in (or seed) a list of recent queries — Lichen detects the fuzzy repeats, groups them, and lets you write a one-line note that becomes your cheat-sheet card. Entirely client-side; everything lives in `localStorage`.

- `index.html` — landing page structure
- `styles.css` — moss / cream / copper visual design
- `script.js` — query clustering + cheat-sheet demo (state in `localStorage`)

## Run locally

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Status

Concept landing page — built 2026-05-10.
