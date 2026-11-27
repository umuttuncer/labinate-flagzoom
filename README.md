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
npm test       # vitest (game, storage, analytics)
npm run typecheck
npm run build  # must pass before push; push to main deploys
```

## Analytics & privacy

What `src/lib/analytics.ts` sends, exactly:

- **When:** `app_open` once at startup (`initAnalytics()` in `main.tsx`), plus
  every `track(event, props)` call the app makes. Nothing else (no autocapture,
  no cookies, no session recording).
- **Where:** only if `VITE_ANALYTICS_ENDPOINT` is set at build time
  (`.env.production`). Without it nothing leaves the device (dev builds log to
  the console). Transport: `navigator.sendBeacon`, falling back to
  `fetch(..., { keepalive: true })`, body is JSON sent as `text/plain`.
- **Payload (PostHog capture format, when `VITE_ANALYTICS_KEY` is set):**
  `api_key` (public project key), `event`, `timestamp` (ISO),
  `distinct_id` = random UUID kept in localStorage key `labinate_anon_id`
  (stable per browser until storage is cleared), and `properties`:
  `app` (`VITE_APP_ID`), `session_id` (random UUID per page load),
  `$current_url`, plus the event's own props. `app_open` adds
  `referrer` and `standalone` (installed-PWA flag).
  Without a key the raw `{ app, event, props, anonId, sessionId, ts }` is sent.
- **URLs are reduced to origin + pathname** by `safeUrl()`: no query string,
  no `#fragment`, no `user:password@`. Non-http(s) URLs are not sent
  (`$current_url` omitted, referrer becomes `"other"`); an empty referrer is
  `"direct"`. Do not put secrets in the *path* — the path is still sent.
- **Not sent by this code:** IP address and user agent are not in the payload,
  but the analytics server sees them on the HTTP request.
- **No consent / opt-out yet** (the anon id is persistent). That is a product
  and legal decision; see the template's `REVIVE.md`.
- Tests (`npm test`) cover the payload shape, the URL stripping and "no
  network without an endpoint"; `tests/setup.ts` makes any unmocked
  `fetch`/`sendBeacon` throw, so tests never send real events.
