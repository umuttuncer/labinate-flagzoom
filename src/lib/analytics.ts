/**
 * Labinate analytics baseline.
 *
 * Vendor-neutral event tracking. When VITE_ANALYTICS_KEY is set, events are
 * shipped in PostHog capture format to VITE_ANALYTICS_ENDPOINT (the shared
 * portfolio project — see .env.production). Without a key, events are POSTed
 * to the endpoint as raw JSON; with no endpoint they are logged to the
 * console (dev) or dropped (prod). Call sites never change.
 *
 * Every app must fire at least: app_open (automatic), plus its own
 * feature events via track().
 *
 * Privacy: URLs leave the device only as origin + pathname (see safeUrl) —
 * query strings and #fragments can carry tokens, invite codes or emails.
 */

const ENDPOINT: string | undefined = import.meta.env.VITE_ANALYTICS_ENDPOINT;
const KEY: string | undefined = import.meta.env.VITE_ANALYTICS_KEY;
const APP_ID: string = import.meta.env.VITE_APP_ID ?? "unknown-app";

/**
 * Reduce a URL to origin + pathname: drops the query string, the #fragment
 * and any user:password@ part. Returns "" for anything that is not an
 * absolute http(s) URL (relative paths, javascript:, data:, garbage), so the
 * caller can omit the property instead of sending raw input.
 */
export function safeUrl(input: string | null | undefined): string {
  if (typeof input !== "string" || input.trim() === "") return "";
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "";
  return url.origin + url.pathname;
}

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
  const body = JSON.stringify(
    KEY
      ? {
          api_key: KEY,
          event: payload.event,
          distinct_id: payload.anonId,
          timestamp: payload.ts,
          properties: {
            app: payload.app,
            session_id: payload.sessionId,
            // undefined is dropped by JSON.stringify
            $current_url: safeUrl(location.href) || undefined,
            ...payload.props,
          },
        }
      : payload,
  );
  // sendBeacon survives page unload; fall back to fetch. Both send the body
  // as text/plain — no CORS preflight, and PostHog parses it as JSON anyway.
  if (!navigator.sendBeacon?.(ENDPOINT, body)) {
    fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
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
    referrer: document.referrer
      ? safeUrl(document.referrer) || "other"
      : "direct",
    standalone: window.matchMedia("(display-mode: standalone)").matches,
  });
}
