import { beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.fn();
vi.mock("../src/lib/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));

const { isPro, requirePro } = await import("../src/lib/monetization");

let mem: Map<string, string>;
let confirmAnswer: boolean;
const confirm = vi.fn((_msg: string) => confirmAnswer);

beforeEach(() => {
  track.mockClear();
  confirm.mockClear();
  mem = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubGlobal("window", { confirm });
});

const events = () => track.mock.calls.map(([name]) => name);

describe("requirePro (stub paywall)", () => {
  it("accepting the stub emits paywall_stub_unlocked, never a purchase event", () => {
    confirmAnswer = true;
    expect(requirePro("export")).toBe(true);
    expect(events()).toEqual(["paywall_shown", "paywall_stub_unlocked"]);
    expect(track).toHaveBeenLastCalledWith("paywall_stub_unlocked", { feature: "export", provider: "stub" });
    expect(events().some((e) => String(e).startsWith("purchase_"))).toBe(false);
    expect(isPro()).toBe(true);
  });

  it("the dialog says it is a free preview unlock, not a purchase", () => {
    confirmAnswer = false;
    requirePro("export");
    const msg = confirm.mock.calls[0][0];
    expect(msg).toMatch(/preview unlock/i);
    expect(msg).toMatch(/nothing is charged/i);
    expect(msg).not.toMatch(/simulates a purchase/i);
  });

  it("dismissing emits paywall_dismissed and stays locked", () => {
    confirmAnswer = false;
    expect(requirePro("export")).toBe(false);
    expect(events()).toEqual(["paywall_shown", "paywall_dismissed"]);
    expect(isPro()).toBe(false);
  });

  it("already unlocked: no dialog, no events", () => {
    mem.set("labinate_pro", "1");
    expect(requirePro("export")).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});
