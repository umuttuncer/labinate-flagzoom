import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadDayState, loadStats, recordResult, saveDayState } from "../src/lib/storage";

beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  });
});

describe("day state", () => {
  it("restores today's guesses and ignores yesterday's", () => {
    saveDayState({ puzzle: 5, guesses: ["tr"] });
    expect(loadDayState(5).guesses).toEqual(["tr"]);
    expect(loadDayState(6).guesses).toEqual([]);
  });
  it("survives corrupt storage", () => {
    localStorage.setItem("flagzoom_state", "{not json");
    expect(loadDayState(1)).toEqual({ puzzle: 1, guesses: [] });
  });
});

describe("stats", () => {
  it("counts a win once per puzzle and builds a streak on consecutive days", () => {
    recordResult(1, true, 3);
    recordResult(1, true, 3); // duplicate call (re-render/refresh) must not double count
    const s = recordResult(2, true, 6);
    expect(s).toMatchObject({ played: 2, wonCount: 2, currentStreak: 2, maxStreak: 2 });
    expect(s.dist).toEqual([0, 0, 1, 0, 0, 1]);
  });
  it("a loss resets the streak; a skipped day restarts it at 1", () => {
    recordResult(1, true, 1);
    recordResult(2, false, 6);
    expect(loadStats().currentStreak).toBe(0);
    recordResult(3, true, 2);
    const s = recordResult(5, true, 2);
    expect(s).toMatchObject({ currentStreak: 1, maxStreak: 1, played: 4, wonCount: 3 });
  });
});
