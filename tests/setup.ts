import { afterEach, beforeEach, vi } from "vitest";

/**
 * Network guard: before every test, fetch / navigator.sendBeacon /
 * XMLHttpRequest / WebSocket are replaced with stubs that throw. A test that
 * wants to observe a request must install its own mock (vi.stubGlobal) after
 * this runs; anything unmocked fails loudly instead of reaching the internet.
 */
function forbidden(name: string) {
  return () => {
    throw new Error(`${name} called without a test mock — tests must never hit the network`);
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(forbidden("fetch")));
  vi.stubGlobal("navigator", { userAgent: "vitest", sendBeacon: vi.fn(forbidden("navigator.sendBeacon")) });
  vi.stubGlobal("XMLHttpRequest", vi.fn(forbidden("XMLHttpRequest")));
  vi.stubGlobal("WebSocket", vi.fn(forbidden("WebSocket")));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
