# Driftnote

> Catch thoughts before they drift.

Driftnote is a voice-first thought catcher. Whisper an idea while walking, waiting in line, or staring out a window — Driftnote weaves it into a quiet constellation of your thinking, themed and findable, so the half-thoughts you usually lose actually compound.

## The idea

Most of us already have hundreds of voice memos no one will ever revisit, Apple Notes graveyards, and Slack DMs to ourselves. The capture problem is solved. The *return* problem isn't.

Driftnote does three things:

1. **Walk-and-talk capture.** Tap once, talk, tap again. Transcript and audio both saved.
2. **Themes, not folders.** Driftnote clusters thoughts by what they're *about*, not when you wrote them. The same idea coming back in three different forms is the signal.
3. **Echoes.** When you log a thought that sounds like one from six months ago, Driftnote shows you. The pattern was there — you just couldn't see it from inside the week.

The bet: people don't need another note-taker. They need their old thoughts to come find them at the moment a new one rhymes.

## What's in this folder

A static landing page with a working in-browser demo. Drop in a few thoughts (or use the seeded ones), hit *Weave*, and watch Driftnote cluster them into themes — entirely client-side, no server, no API.

- `index.html` — landing page structure
- `styles.css` — slate / cream / amber visual design
- `script.js` — waitlist + thought-clustering demo (state in `localStorage`)

## Run locally

Open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Status

Concept landing page — built 2026-05-09.
