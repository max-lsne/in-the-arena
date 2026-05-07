# TimeShelf

> Try wanting it tomorrow.

TimeShelf is a cold-storage inbox for everything you *almost* bought, *almost* read, *almost* subscribed to. Park your impulses, let them age, and only act on the ones that survive the wait.

## The idea

The internet is engineered to make you want things in the next eight seconds. TimeShelf adds a small, deliberate gap between *the want* and *the buy*.

1. **Park anywhere.** Share sheet, browser extension, copy-paste a link. One tap.
2. **Cold storage.** The item disappears from view for 7, 30, or 90 days. No reminders, no nagging.
3. **Survival report.** When the timer ends, you see only what's left of your past self's wants. Most things don't make the cut.

The bet: regret math beats willpower. People will gladly delay a purchase if the friction is shaped like a calm room instead of a guilt trip.

## What's in this folder

A static landing page with a small client-side demo. Type what you want, shelf it, watch it sit there. Items persist in `localStorage` so you can revisit.

- `index.html` — landing page structure
- `styles.css` — sage / cream / terracotta visual design
- `script.js` — waitlist + interactive shelf demo

## Run locally

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Status

Concept landing page — built 2026-05-07.
