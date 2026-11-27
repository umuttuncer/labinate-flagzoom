import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COUNTRIES,
  MAX_GUESSES,
  directionArrow,
  distanceKm,
  feedbackFor,
  findCountry,
  getCountry,
  proximitySquares,
  puzzleAnswer,
  shareText,
  todayPuzzleNumber,
  zoomFor,
} from "../src/lib/game";
import schedule from "../src/data/schedule.json";

const ORIGINAL_TZ = process.env.TZ;
function at(iso: string, tz: string): number {
  process.env.TZ = tz;
  vi.setSystemTime(new Date(iso));
  return todayPuzzleNumber();
}

describe("daily puzzle number", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = ORIGINAL_TZ;
  });

  it("puzzle #1 is 2026-07-04 local", () => {
    expect(at("2026-07-04T00:00:00Z", "UTC")).toBe(1);
    expect(at("2026-07-04T23:59:59Z", "UTC")).toBe(1);
    expect(at("2026-07-05T00:00:00Z", "UTC")).toBe(2);
    expect(at("2026-07-03T12:00:00Z", "UTC")).toBe(0);
  });

  it("rolls over at local midnight in every time zone", () => {
    // same instant, different local dates
    const instant = "2026-07-04T23:30:00Z";
    expect(at(instant, "UTC")).toBe(1);
    expect(at(instant, "America/Los_Angeles")).toBe(1); // 16:30 Jul 4
    expect(at(instant, "Asia/Tokyo")).toBe(2); // 08:30 Jul 5
    expect(at(instant, "Europe/Istanbul")).toBe(2); // 02:30 Jul 5
    expect(at("2026-07-04T10:00:00Z", "Pacific/Kiritimati")).toBe(2); // UTC+14
    expect(at("2026-07-04T10:00:00Z", "Pacific/Pago_Pago")).toBe(0); // UTC-11: 23:00 Jul 3
  });

  it("is the same number for the same local calendar date in any zone", () => {
    const zones = ["UTC", "America/New_York", "Asia/Kolkata", "Australia/Sydney", "Europe/Istanbul"];
    // local noon on 2026-12-25 in each zone -> one shared puzzle number
    const nums = zones.map((tz) => {
      process.env.TZ = tz;
      vi.setSystemTime(new Date(2026, 11, 25, 12, 0, 0));
      return todayPuzzleNumber();
    });
    expect(new Set(nums).size).toBe(1);
    expect(nums[0]).toBe(175);
  });

  it("advances by exactly one per day across DST changes", () => {
    for (const tz of ["America/New_York", "Europe/Istanbul", "Australia/Sydney", "Europe/London"]) {
      process.env.TZ = tz;
      let prev: number | undefined;
      // 2026-10-20 .. 2026-11-10 covers EU (Oct 25) and US (Nov 1) DST ends
      for (let d = 20; d <= 41; d++) {
        vi.setSystemTime(new Date(2026, 9, d, 0, 30)); // 00:30 local, just after midnight
        const n = todayPuzzleNumber();
        if (prev !== undefined) expect(n, `${tz} day ${d}`).toBe(prev + 1);
        prev = n;
      }
    }
  });
});

describe("puzzle answer selection", () => {
  it("is deterministic and follows the schedule", () => {
    expect(puzzleAnswer(1).code).toBe((schedule as string[])[0]);
    expect(puzzleAnswer(42)).toBe(puzzleAnswer(42));
  });

  it("wraps around the schedule and never returns undefined", () => {
    const len = (schedule as string[]).length;
    expect(puzzleAnswer(1 + len).code).toBe(puzzleAnswer(1).code);
    for (const n of [-len, -1, 0, 1, len, len + 1, 10 * len + 3]) {
      expect(puzzleAnswer(n)).toBeDefined();
    }
  });

  it("every scheduled code is a known country", () => {
    for (const code of schedule as string[]) expect(getCountry(code), code).toBeDefined();
  });
});

describe("guess evaluation", () => {
  const tr = getCountry("tr");
  const gr = getCountry("gr");

  it("finds countries ignoring case, accents and spaces", () => {
    expect(findCountry("  TURKEY ")?.code ?? findCountry("Türkiye")?.code).toBe("tr");
    expect(findCountry("not a country")).toBeUndefined();
    for (const c of COUNTRIES) expect(findCountry(c.name)?.code).toBe(c.code);
  });

  it("correct guess is distance 0, target arrow, all green", () => {
    expect(feedbackFor("tr", tr)).toMatchObject({ dist: 0, arrow: "🎯", squares: "🟩🟩🟩🟩🟩" });
  });

  it("wrong guess never looks like a win", () => {
    for (const c of COUNTRIES) {
      if (c.code === "tr") continue;
      const f = feedbackFor(c.code, tr);
      expect(f.dist, c.code).toBeGreaterThan(0);
      expect(f.arrow).not.toBe("🎯");
      expect(f.squares).not.toBe("🟩🟩🟩🟩🟩");
    }
  });

  it("distance is symmetric and plausible", () => {
    expect(distanceKm(tr, gr)).toBe(distanceKm(gr, tr));
    expect(distanceKm(tr, gr)).toBeGreaterThan(300);
    expect(distanceKm(tr, gr)).toBeLessThan(1500);
  });

  it("arrow points the right way", () => {
    expect(directionArrow(getCountry("ca"), getCountry("us"))).toBe("⬇️");
    expect(directionArrow(getCountry("us"), getCountry("ca"))).toBe("⬆️");
    expect(directionArrow(gr, tr)).toBe("➡️");
  });

  it("proximity squares always have 5 cells and degrade with distance", () => {
    const count = (s: string) => [...s.matchAll(/🟩|🟨|⬛/gu)].length;
    let prevGreens = 5;
    for (const d of [0, 1, 500, 2000, 5000, 10000, 15000, 19999, 20000, 25000]) {
      const s = proximitySquares(d);
      expect(count(s), `d=${d}`).toBe(5);
      const greens = [...s.matchAll(/🟩/gu)].length;
      expect(greens).toBeLessThanOrEqual(prevGreens);
      prevGreens = greens;
    }
    expect(proximitySquares(20000)).toBe("⬛⬛⬛⬛⬛");
    expect(proximitySquares(1)).not.toBe("🟩🟩🟩🟩🟩");
  });
});

describe("6-try limit and share text", () => {
  it("MAX_GUESSES is 6 and zoom pulls back to 1 by the last try", () => {
    expect(MAX_GUESSES).toBe(6);
    expect(zoomFor(0, false)).toBeGreaterThan(zoomFor(5, false));
    expect(zoomFor(MAX_GUESSES - 1, false)).toBe(1);
    expect(zoomFor(99, false)).toBe(1);
    expect(zoomFor(0, true)).toBe(1);
  });

  it("share text shows score, one row per guess, and X on a loss", () => {
    const answer = getCountry("tr");
    const won = shareText(7, ["gr", "tr"], answer, true, 3);
    expect(won.split("\n")[0]).toBe("FlagZoom #7 2/6 🔥3");
    expect(won.split("\n")).toHaveLength(4);
    const lost = shareText(7, ["gr", "fr", "de", "es", "it", "pt"], answer, false, 0);
    expect(lost.split("\n")[0]).toBe("FlagZoom #7 X/6");
    expect(lost).not.toContain("🎯");
  });
});
