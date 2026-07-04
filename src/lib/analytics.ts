/**
 * Labinate analytics baseline.
 *
 * Vendor-neutral event tracking. Events are POSTed as JSON to
 * VITE_ANALYTICS_ENDPOINT if set; otherwise they are logged to the console
 * (dev) or dropped (prod). Swapping in PostHog/Plausible later only means
 * changing `send()` — call sites stay the same.
 *
 * Every app must fire at least: app_open (automatic), plus its own
 * feature events via track().
 */

const ENDPOINT: string | undefined = import.meta.env.VITE_ANALYTICS_ENDPOINT;
const APP_ID: string = import.meta.env.VITE_APP_ID ?? "unknown-app";

function getAnonId(): string {
  const key = "labinate_anon_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const sessionId = crypto.randomUUID();

export interface AnalyticsEvent {
  app: string;
  event: string;
  props?: Record<string, string | number | boolean>;
  anonId: string;
  sessionId: string;
  ts: string;
}

function send(payload: AnalyticsEvent): void {
  if (!ENDPOINT) {
    if (import.meta.env.DEV) console.debug("[analytics]", payload);
    return;
  }
  const body = JSON.stringify(payload);
  // sendBeacon survives page unload; fall back to fetch.
  if (!navigator.sendBeacon?.(ENDPOINT, body)) {
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export function track(
  event: string,
  props?: Record<string, string | number | boolean>,
): void {
  send({
    app: APP_ID,
    event,
    props,
    anonId: getAnonId(),
    sessionId,
    ts: new Date().toISOString(),
  });
}

/** Call once at app startup (main.tsx does this). */
export function initAnalytics(): void {
  track("app_open", {
    referrer: document.referrer || "direct",
    standalone: window.matchMedia("(display-mode: standalone)").matches,
  });
}
