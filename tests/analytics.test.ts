import { beforeEach, describe, expect, it, vi } from "vitest";

// Placeholder values only — never a real endpoint or key. `.invalid` is a
// reserved TLD that cannot resolve; the network guard in tests/setup.ts would
// throw before any request anyway.
const ENDPOINT = "https://analytics.invalid/capture/";
const KEY = "phc_test_placeholder_not_a_real_key";
const PAGE = "https://umuttuncer.github.io/labinate-app-template/";

let mem: Map<string, string>;

function installBrowser(href = PAGE, referrer = "") {
  const u = new URL(href);
  vi.stubGlobal("location", {
    href,
    origin: u.origin,
    protocol: u.protocol,
    host: u.host,
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
  });
  vi.stubGlobal("document", { referrer });
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
}

/** Fresh module instance with the given build-time env. */
async function loadAnalytics(env: { endpoint?: string; key?: string; appId?: string }) {
  vi.resetModules();
  vi.stubEnv("VITE_ANALYTICS_ENDPOINT", env.endpoint ?? "");
  vi.stubEnv("VITE_ANALYTICS_KEY", env.key ?? "");
  vi.stubEnv("VITE_APP_ID", env.appId ?? "test-app");
  return import("../src/lib/analytics");
}

/** Mock sendBeacon (accepting) and return the parsed bodies it received. */
function captureBeacons(accept = true) {
  const sendBeacon = vi.fn((_url: string, _body: string) => accept);
  vi.stubGlobal("navigator", { userAgent: "vitest", sendBeacon });
  const bodies = () => sendBeacon.mock.calls.map(([, body]) => JSON.parse(body));
  return { sendBeacon, bodies };
}

beforeEach(() => {
  mem = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  });
  installBrowser();
  vi.spyOn(console, "debug").mockImplementation(() => {});
});

describe("network guard (tests/setup.ts)", () => {
  it("unmocked fetch and sendBeacon throw instead of sending", () => {
    expect(() => fetch("https://example.invalid/")).toThrow(/never hit the network/);
    expect(() => navigator.sendBeacon("https://example.invalid/", "x")).toThrow(/never hit the network/);
  });
});

describe("no endpoint configured", () => {
  it("sends nothing (no fetch, no beacon) and logs in dev", async () => {
    const { sendBeacon } = captureBeacons();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const a = await loadAnalytics({ endpoint: "", key: KEY });
    a.track("tapped", { n: 1 });
    a.initAnalytics();
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(console.debug).toHaveBeenCalled();
  });
});

describe("PostHog capture payload (endpoint + key)", () => {
  it("has the documented shape", async () => {
    const { sendBeacon, bodies } = captureBeacons();
    const a = await loadAnalytics({ endpoint: ENDPOINT, key: KEY, appId: "demo" });
    a.track("tapped", { n: 3, pro: false });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.mock.calls[0][0]).toBe(ENDPOINT);
    const [p] = bodies();
    expect(Object.keys(p).sort()).toEqual(["api_key", "distinct_id", "event", "properties", "timestamp"]);
    expect(p.api_key).toBe(KEY);
    expect(p.event).toBe("tapped");
    expect(p.distinct_id).toBe(mem.get("labinate_anon_id"));
    expect(new Date(p.timestamp).toISOString()).toBe(p.timestamp);
    expect(p.properties).toEqual({
      app: "demo",
      session_id: expect.any(String),
      $current_url: PAGE,
      n: 3,
      pro: false,
    });
  });

  it("app_open carries referrer and standalone flags", async () => {
    const { bodies } = captureBeacons();
    const a = await loadAnalytics({ endpoint: ENDPOINT, key: KEY });
    a.initAnalytics();
    const [p] = bodies();
    expect(p.event).toBe("app_open");
    expect(p.properties.referrer).toBe("direct");
    expect(p.properties.standalone).toBe(false);
  });

  it("falls back to fetch(keepalive) when sendBeacon refuses", async () => {
    captureBeacons(false);
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));
    vi.stubGlobal("fetch", fetchMock);
    const a = await loadAnalytics({ endpoint: ENDPOINT, key: KEY });
    a.track("tapped");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(init.body as string).event).toBe("tapped");
  });

  it("falls back to fetch when sendBeacon does not exist", async () => {
    vi.stubGlobal("navigator", { userAgent: "vitest" });
    const fetchMock = vi.fn(() => Promise.reject(new Error("offline")));
    vi.stubGlobal("fetch", fetchMock);
    const a = await loadAnalytics({ endpoint: ENDPOINT, key: KEY });
    expect(() => a.track("tapped")).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("raw payload (endpoint, no key)", () => {
  it("posts the AnalyticsEvent as-is", async () => {
    const { bodies } = captureBeacons();
    const a = await loadAnalytics({ endpoint: ENDPOINT, key: "", appId: "demo" });
    a.track("tapped", { n: 1 });
    const [p] = bodies();
    expect(Object.keys(p).sort()).toEqual(["anonId", "app", "event", "props", "sessionId", "ts"]);
    expect(p).toMatchObject({ app: "demo", event: "tapped", props: { n: 1 } });
    expect(p).not.toHaveProperty("api_key");
  });
});

describe("anonymous id", () => {
  it("is created once, stored under labinate_anon_id and reused", async () => {
    const { bodies } = captureBeacons();
    const a = await loadAnalytics({ endpoint: ENDPOINT, key: KEY });
    a.track("one");
    a.track("two");
    a.initAnalytics();
    const ids = bodies().map((p) => p.distinct_id);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe(mem.get("labinate_anon_id"));
    const sessions = bodies().map((p) => p.properties.session_id);
    expect(new Set(sessions).size).toBe(1);
  });

  it("survives a reload (new module instance) and keeps a pre-existing id", async () => {
    mem.set("labinate_anon_id", "existing-id");
    const { bodies } = captureBeacons();
    (await loadAnalytics({ endpoint: ENDPOINT, key: KEY })).track("a");
    (await loadAnalytics({ endpoint: ENDPOINT, key: KEY })).track("b");
    expect(bodies().map((p) => p.distinct_id)).toEqual(["existing-id", "existing-id"]);
  });
});
