# PantryPilot

> Cook what you have. Waste nothing.

A landing page for **PantryPilot** — an AI pantry tracker that suggests recipes from what you already own, predicts spoilage, and auto-builds the smallest possible shopping list.

## The idea

Households throw out roughly a third of the food they buy. Existing recipe apps optimize for inspiration, not for the contents of your fridge. PantryPilot inverts the flow:

1. **Scan** — camera-first inventory recognizes ingredients, brands, and pack sizes.
2. **Plan** — recipes are ranked by what's about to spoil, your taste profile, and how few extras you'd need.
3. **Shop** — missing ingredients become a one-tap checkout at your local grocer.

Monetization: freemium (Home tier) with paid Kitchen ($6/mo) and Pro Cook ($14/mo) tiers.

## Stack

Static site — vanilla HTML, CSS, and a tiny bit of JS. No build step.

```
2026-05-04-pantry-pilot/
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Run locally

Just open `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
