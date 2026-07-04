# Labinate Release Checklist

Run top to bottom for every release. An app is not "shipped" until every box
is checked.

## 1. Pre-release

- [ ] `package.json` `name` and version set; version bumped from last release.
- [ ] App title set in `index.html` and `public/manifest.webmanifest`
      (name, short_name, icons — no template leftovers).
- [ ] `VITE_APP_ID` set — analytics must not report `unknown-app`.
- [ ] Analytics: `app_open` fires plus at least one feature event
      (check console in dev, or the collector).
- [ ] Monetization: at least one path calls `requirePro()`; paywall funnel
      events fire (paywall_shown / purchase_clicked / paywall_dismissed).
- [ ] `npm run build` passes clean locally.

## 2. Deploy (web)

- [ ] Push to `main`; "Build & Deploy" workflow is green.
- [ ] Live URL loads: `https://<owner>.github.io/<repo>/`.
- [ ] Tag the release: `git tag v<version> && git push --tags`.

## 3. Smoke test (on the live URL, not localhost)

- [ ] App loads with no console errors.
- [ ] Core loop works (the one thing the app does).
- [ ] Premium path shows the paywall and unlock works.
- [ ] Mobile check: open on a phone (or devtools mobile viewport);
      layout usable, "Add to Home Screen" available.

## 4. Store submission (only when an app earns a store build)

- [ ] Escalate to Isaac first — developer accounts cost money
      (Apple $99/yr, Google $25 one-time).
- [ ] `npx cap add android` (start with Android: cheaper, faster review).
- [ ] Store assets: icon, screenshots, 1-2 sentence description.
- [ ] Privacy policy URL (required by both stores even for trivial apps).
- [ ] Internal-testing track first, then production.

## 5. Post-release

- [ ] Confirm live analytics events arrive from the production URL: load the
      live site in a real browser, then check the PostHog project for an
      `app_open` event whose `properties.app` matches this `VITE_APP_ID`
      (Activity tab, or a HogQL query via the API).
- [ ] Update the portfolio tracker (issue/board) with the live URL and date.
- [ ] File follow-up bugs as issues; do NOT keep polishing — next app.
