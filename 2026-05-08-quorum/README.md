# Quorum

> Decide together without the group chat spiral.

Quorum is a tiny app for groups who can't agree on where to eat, what to watch, or when to meet. Everyone votes privately, the app surfaces overlap, and the "I don't know, what do you want?" loop ends in under a minute.

## The idea

Group decisions die in three places: the bystander who waits for someone else to suggest, the polite voter who hides their real preference, and the chat thread that dilutes everyone's attention. Quorum collapses all three.

1. **Open a room.** One link. No accounts.
2. **Drop options, vote in private.** Each person rates each option 1–5, alone. No anchoring, no peer pressure.
3. **Reveal the overlap.** Quorum highlights the option with the highest *floor* — the one nobody hates — not just the loudest yes.

The bet: groups don't actually want the *best* option. They want the option that everyone can live with, decided fast, with no one feeling steamrolled.

## What's in this folder

A static landing page with a working in-browser demo. Spin up a fake room, add options, simulate a few teammates' votes, and watch Quorum pick the consensus — all client-side.

- `index.html` — landing page structure
- `styles.css` — teal / parchment / coral visual design
- `script.js` — waitlist + interactive room demo (state in `localStorage`)

## Run locally

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Status

Concept landing page — built 2026-05-08.
