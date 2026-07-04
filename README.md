# FlagZoom

Daily flag guessing game (Labinate App #1). A mystery flag starts zoomed in;
you get 6 guesses to name the country. Each wrong guess zooms the flag out and
gives distance + direction hints. One puzzle per day for everyone, with an
emoji-grid share button as the viral loop.

**Live:** https://umuttuncer.github.io/labinate-flagzoom/

Built from [labinate-app-template](https://github.com/umuttuncer/labinate-app-template):
Vite + React + TS static PWA, GitHub Actions → GitHub Pages, `track()`
analytics baseline and `requirePro()` monetization hook.

## How it works

- `src/data/countries.json` — 197 countries (name, ISO code, centroid) from
  [mledoze/countries](https://github.com/mledoze/countries); flags self-hosted
  in `public/flags/` (from flagcdn.com, public domain).
- `src/data/schedule.json` — pre-generated 400-day puzzle schedule (seeded
  shuffle, no repeats within a cycle). Puzzle #1 = 2026-07-04, local-midnight
  rollover.
- `src/lib/game.ts` — puzzle selection, haversine distance / bearing hints,
  proximity squares, share text.
- `src/lib/storage.ts` — per-day game state + lifetime stats (streaks, guess
  distribution) in localStorage.
- Monetization: post-game ad placeholder slot; `requirePro()` gates Practice
  mode and ad removal (paywall stub tracks the funnel).

## Dev

```sh
npm install
npm run dev    # iterate
npm run build  # must pass before push; push to main deploys
```
