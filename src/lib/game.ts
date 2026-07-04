/**
 * FlagZoom core game logic: daily puzzle selection, guess feedback
 * (distance / direction / proximity squares), and share-text building.
 */

import countriesJson from "../data/countries.json";
import scheduleJson from "../data/schedule.json";

export interface Country {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

export const COUNTRIES: Country[] = countriesJson as Country[];
const SCHEDULE: string[] = scheduleJson as string[];
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export const MAX_GUESSES = 6;
export const APP_URL = "https://umuttuncer.github.io/labinate-flagzoom/";

/** Puzzle #1 is 2026-07-04, rolling over at local midnight (like Wordle). */
const EPOCH = { y: 2026, m: 6, d: 4 };

export function todayPuzzleNumber(): number {
  const now = new Date();
  const a = Date.UTC(EPOCH.y, EPOCH.m, EPOCH.d);
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b - a) / 86400000) + 1;
}

export function puzzleAnswer(puzzle: number): Country {
  const i = (((puzzle - 1) % SCHEDULE.length) + SCHEDULE.length) % SCHEDULE.length;
  return BY_CODE.get(SCHEDULE[i])!;
}

export function getCountry(code: string): Country {
  return BY_CODE.get(code)!;
}

export function randomCountry(): Country {
  return COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const BY_NAME = new Map(COUNTRIES.map((c) => [norm(c.name), c]));

export function findCountry(input: string): Country | undefined {
  return BY_NAME.get(norm(input));
}

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(a: Country, b: Country): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h)));
}

const ARROWS = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];

/** Arrow pointing from the guess toward the answer. */
export function directionArrow(from: Country, to: Country): string {
  const dLng = rad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(dLng);
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ARROWS[Math.round(bearing / 45) % 8];
}

/** 5-square proximity bar; 20,000 km (max earth distance) = all black. */
export function proximitySquares(dist: number): string {
  if (dist === 0) return "🟩🟩🟩🟩🟩";
  const p = Math.max(0, 1 - dist / 20000);
  const greens = Math.min(4, Math.floor(p * 5));
  const partial = p * 5 - greens >= 0.5;
  return (
    "🟩".repeat(greens) +
    (partial ? "🟨" : "") +
    "⬛".repeat(5 - greens - (partial ? 1 : 0))
  );
}

export interface GuessFeedback {
  country: Country;
  dist: number;
  arrow: string;
  squares: string;
}

export function feedbackFor(guessCode: string, answer: Country): GuessFeedback {
  const country = getCountry(guessCode);
  const dist = guessCode === answer.code ? 0 : distanceKm(country, answer);
  return {
    country,
    dist,
    arrow: dist === 0 ? "🎯" : directionArrow(country, answer),
    squares: proximitySquares(dist),
  };
}

/** Flag starts zoomed in and pulls back with each wrong guess. */
const ZOOMS = [3.2, 2.6, 2.1, 1.7, 1.4, 1.0];
const ORIGINS = ["25% 30%", "70% 25%", "30% 70%", "75% 70%", "50% 45%"];

export function zoomFor(guessCount: number, finished: boolean): number {
  return finished ? 1 : ZOOMS[Math.min(guessCount, ZOOMS.length - 1)];
}

export function originFor(puzzle: number): string {
  return ORIGINS[((puzzle % ORIGINS.length) + ORIGINS.length) % ORIGINS.length];
}

export function shareText(
  puzzle: number,
  guesses: string[],
  answer: Country,
  won: boolean,
  streak: number,
): string {
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const streakPart = won && streak > 1 ? ` 🔥${streak}` : "";
  const rows = guesses
    .map((g) => {
      const f = feedbackFor(g, answer);
      return `${f.squares} ${f.arrow}`;
    })
    .join("\n");
  return `FlagZoom #${puzzle} ${score}${streakPart}\n${rows}\n${APP_URL}`;
}
