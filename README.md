# Élan Français (MVP)

A runnable, mobile-first prototype of a French-only gamified learning app with:

- CEFR section path (A1 → C2)
- Unit/lesson progression and unlock logic
- French Score (FS) earning rules with streak multipliers
- Weekly league simulation with tier progression
- Streak goals, freezes, and badge milestones
- Adaptive review queue and skill mastery tracking
- Mascot-driven profile/challenge experience

## Run locally

No build step required.

```bash
python3 -m http.server 4173
```

Then open: `http://localhost:4173`

## Files

- `index.html` – app shell and layout
- `styles.css` – mobile-first visual system
- `app.js` – state, progression, scoring, league and streak logic
- `PRODUCT_BLUEPRINT_FRENCH_APP.md` – complete product specification

## Notes

This is an implementation-focused MVP built from the product blueprint. It uses localStorage for persistence and mock leaderboard data for weekly competition behavior.
