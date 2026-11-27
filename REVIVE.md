# REVIVE.md — umuttuncer/labinate-flagzoom (night2/M87, 2026-11-27)

## What it is
FlagZoom, "Labinate App #1": a daily flag guessing game. You guess the country from a zoomed-in flag in 6 tries. Each guess
gets distance, direction and a proximity bar. There is a share text, streaks and stats in localStorage, and a Pro-gated practice mode.
It has 197 countries and 197 flags, and a 400-day schedule starting 2026-07-04 (local midnight rollover).
Commits: `1bc9e25` v1.0.0 (2026-07-04, "Ada (Labinate)") and `99c4d4f` (LAB-5 PostHog retrofit). Tag: 1.
It is deployed by its own workflow to `https://umuttuncer.github.io/labinate-flagzoom/` (Pages deployment `99c4d4f`, 2026-07-04).
It is **not** the `flag/` app in `Labinate/labinate-apps`; that one is the separate Flag-NotFlag app (M74).

## Commands run (Node 24.22.1, npm 11.21.1)
| Command | Before | After (`night2/M87`) |
|---|---|---|
| `npm ci` / `npx tsc --noEmit` / `npm run build` | 0 / 0 / 0 (JS 161 kB) | 0 / 0 / 0 |
| `npm test` | none | **19 passed, 0 failed** (`tests/game.test.ts` 15, `tests/storage.test.ts` 4) |
| `npm audit` | 7 (5 high, 2 moderate) | after the fix: 2 (vite high, esbuild moderate). After vitest was added: **6 (2 critical, 1 high, 3 moderate), all dev-only** |
| `npm audit --omit=dev` | 0 | 0 |

- `npm audit fix` (no `--force`): lockfile only, commit `cca233b`.
- Tests: commit `a395e8f`, `vitest@^2.1.9` (devDependency, tests in `tests/`, outside the tsconfig `include`).
- `npm run typecheck` (since `night2/M112`) = `tsc --noEmit -p tsconfig.test.json`: covers `src` + `tests` + `vitest.config.ts`, with `@types/node` for tests only (`tsconfig.json` sets `"types": []`, so `src` still cannot use Node globals).
- **Tested on `night2/M112-opt-vitest-major` (2026-11-27): vitest 5.1.2 + vite 6.4.6** (vite major forced by vitest 5 peer `vite ^6.4`; same versions as the template, lockfiles 0 differences for shared packages) — `npm audit` 0, 56/56 tests, typecheck/build green. JS bundle changes (161,660 → 164,488 B) only from vite 6 defaults: lazy `require*()` wrapping of React CJS and `countries.json` emitted as `JSON.parse(...)` (same data). vitest 5 needs Node ≥22.12.
- The 2 critical advisories are in **vitest 2 / tinypool**: the Vitest UI/API server and worker-option prototype pollution. They only matter
  while the test runner is running, and nothing here starts the UI server. All of them are fixed only in vitest 5, which needs vite ≥6.4, so a vite major
  upgrade. vitest 3.2.7 was tried and still had the 2 criticals, so it was reverted. Not done.

## Test coverage (pure logic, `src/lib/game.ts`, `src/lib/storage.ts`)
- **Daily puzzle number:**
  - #1 = 2026-07-04, rolling over at local midnight;
  - checked in UTC, Los Angeles, Tokyo, Istanbul, Kiritimati (+14) and Pago Pago (−11);
  - the same local date gives the same number in every zone;
  - the number goes up by exactly +1 per day across the EU, US and AU DST changes.
- **Answer selection:** deterministic, wraps around the 400-entry schedule (including negative numbers), and every scheduled code is a known country.
- **Guess evaluation:**
  - names are normalised (accents, case, spaces);
  - a correct guess gives 0 km / 🎯 / 5 green, and no wrong guess anywhere looks like a win;
  - distance is symmetric, the arrow points the right way, and the proximity bar always has 5 cells and gets worse with distance.
- **6 tries:** `MAX_GUESSES = 6`, zoom reaches 1.0 by the last try, and the share text shows `n/6` or `X/6`.
- **Stats:** a win counts once per puzzle, streaks build on consecutive days, and a loss or a skipped day resets the streak.

**No bugs were found, so no source code was changed.** Notes:
- Players in different time zones see different puzzles at the same instant. This is intended, as in Wordle.
- A tab left open past midnight keeps the old puzzle (`useMemo`) until reload.

Analytics, paywall and workflow have the same caveats as the template (see its REVIVE.md, items 1–5). The PostHog `phc_` key
in `.env.production` is the same public key as the template's.

## Env vars (names)
`VITE_APP_ID`, `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_KEY` (build-time, public).

## Options (no decision made here)
| Option | What is lost |
|---|---|
| **Keep** | Nothing. It is a working, shipped game. The schedule runs out after 400 days (around 2027-08-07), then wraps around and repeats. |
| **Archive** | No code is lost and Pages keeps serving it. You can no longer push fixes or new schedules without unarchiving. |
| **Delete** | The only copy of the game (game logic, country data, 197 flags) and the live URL. Players' share links break. |
