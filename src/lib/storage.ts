/**
 * localStorage persistence: today's in-progress game (survives refresh)
 * and lifetime stats (streak, win %, guess distribution).
 */

import { MAX_GUESSES } from "./game";

const STATE_KEY = "flagzoom_state";
const STATS_KEY = "flagzoom_stats";

export interface DayState {
  puzzle: number;
  guesses: string[];
}

export interface Stats {
  played: number;
  wonCount: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedPuzzle: number;
  dist: number[];
}

const emptyStats = (): Stats => ({
  played: 0,
  wonCount: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedPuzzle: 0,
  dist: Array(MAX_GUESSES).fill(0),
});

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function loadDayState(puzzle: number): DayState {
  const s = read<DayState>(STATE_KEY);
  return s && s.puzzle === puzzle ? s : { puzzle, guesses: [] };
}

export function saveDayState(state: DayState): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function loadStats(): Stats {
  return read<Stats>(STATS_KEY) ?? emptyStats();
}

export function recordResult(
  puzzle: number,
  won: boolean,
  guessCount: number,
): Stats {
  const s = loadStats();
  if (puzzle === s.lastPlayedPuzzle) return s;
  s.played += 1;
  if (won) {
    s.wonCount += 1;
    s.currentStreak = puzzle === s.lastPlayedPuzzle + 1 ? s.currentStreak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
    s.dist[Math.min(guessCount, MAX_GUESSES) - 1] += 1;
  } else {
    s.currentStreak = 0;
  }
  s.lastPlayedPuzzle = puzzle;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
  return s;
}
