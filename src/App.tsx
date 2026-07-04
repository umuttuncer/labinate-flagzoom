import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "./lib/analytics";
import { isPro, requirePro } from "./lib/monetization";
import {
  APP_URL,
  COUNTRIES,
  Country,
  MAX_GUESSES,
  feedbackFor,
  findCountry,
  originFor,
  puzzleAnswer,
  randomCountry,
  shareText,
  todayPuzzleNumber,
  zoomFor,
} from "./lib/game";
import {
  loadDayState,
  loadStats,
  recordResult,
  saveDayState,
  Stats,
} from "./lib/storage";

const FLAGS_BASE = `${import.meta.env.BASE_URL}flags/`;

type Mode = "daily" | "practice";

export default function App() {
  const puzzleNo = useMemo(todayPuzzleNumber, []);
  const dailyAnswer = useMemo(() => puzzleAnswer(puzzleNo), [puzzleNo]);

  const [mode, setMode] = useState<Mode>("daily");
  const [practiceAnswer, setPracticeAnswer] = useState<Country>(randomCountry);
  const [dailyGuesses, setDailyGuesses] = useState<string[]>(
    () => loadDayState(puzzleNo).guesses,
  );
  const [practiceGuesses, setPracticeGuesses] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<Stats>(loadStats);
  const [pro, setPro] = useState(isPro);
  const [copied, setCopied] = useState(false);

  const answer = mode === "daily" ? dailyAnswer : practiceAnswer;
  const guesses = mode === "daily" ? dailyGuesses : practiceGuesses;
  const won = guesses.includes(answer.code);
  const finished = won || guesses.length >= MAX_GUESSES;

  const adTracked = useRef(false);
  useEffect(() => {
    if (mode === "daily" && finished && !pro && !adTracked.current) {
      adTracked.current = true;
      track("ad_slot_viewed", { puzzle: puzzleNo });
    }
  }, [mode, finished, pro, puzzleNo]);

  const submitGuess = () => {
    if (finished) return;
    const country = findCountry(input);
    if (!country) {
      setMessage("Pick a country from the list");
      return;
    }
    if (guesses.includes(country.code)) {
      setMessage("Already guessed that one");
      return;
    }
    setMessage("");
    setInput("");
    const next = [...guesses, country.code];
    const correct = country.code === answer.code;
    const over = correct || next.length >= MAX_GUESSES;
    track("guess_submitted", {
      mode,
      guessNo: next.length,
      distanceKm: feedbackFor(country.code, answer).dist,
    });
    if (mode === "daily") {
      setDailyGuesses(next);
      saveDayState({ puzzle: puzzleNo, guesses: next });
      if (over) {
        track(correct ? "game_won" : "game_lost", {
          puzzle: puzzleNo,
          guesses: next.length,
        });
        setStats(recordResult(puzzleNo, correct, next.length));
      }
    } else {
      setPracticeGuesses(next);
      if (over) {
        track(correct ? "practice_won" : "practice_lost", {
          guesses: next.length,
        });
      }
    }
  };

  const share = () => {
    const text = shareText(
      puzzleNo,
      dailyGuesses,
      dailyAnswer,
      won,
      stats.currentStreak,
    );
    track("share_clicked", { puzzle: puzzleNo, won });
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setMessage("Copy failed — long-press to copy manually"),
    );
  };

  const startPractice = () => {
    if (!requirePro("practice_mode")) return;
    setPro(true);
    track("practice_started");
    setPracticeAnswer(randomCountry());
    setPracticeGuesses([]);
    setInput("");
    setMessage("");
    setMode("practice");
  };

  const backToDaily = () => {
    setMode("daily");
    setInput("");
    setMessage("");
  };

  const goPro = () => {
    if (!requirePro("remove_ads")) return;
    setPro(true);
  };

  const zoom = zoomFor(guesses.length, finished);
  const origin =
    mode === "daily"
      ? originFor(puzzleNo)
      : originFor(practiceAnswer.code.charCodeAt(0));
  const winPct = stats.played
    ? Math.round((100 * stats.wonCount) / stats.played)
    : 0;

  return (
    <main className="app">
      <header>
        <h1>🔍 FlagZoom</h1>
        {mode === "daily" ? (
          <button className="ghost" onClick={startPractice}>
            Practice {pro ? "★" : "🔒"}
          </button>
        ) : (
          <button className="ghost" onClick={backToDaily}>
            ← Daily #{puzzleNo}
          </button>
        )}
      </header>
      <p className="tagline">
        {mode === "daily"
          ? `Daily #${puzzleNo} — guess the country from the zoomed-in flag`
          : "Practice — random flag, no streak at stake"}
      </p>

      <div className="flag-frame">
        <img
          className="flag"
          src={`${FLAGS_BASE}${answer.code}.png`}
          alt="Mystery flag"
          style={{ transform: `scale(${zoom})`, transformOrigin: origin }}
          draggable={false}
        />
      </div>

      <ol className="guesses">
        {guesses.map((g) => {
          const f = feedbackFor(g, answer);
          return (
            <li key={g} className="guess-row">
              <span className="guess-name">{f.country.name}</span>
              <span className="guess-dist">
                {f.dist === 0 ? "🎯" : `${f.dist.toLocaleString()} km ${f.arrow}`}
              </span>
              <span className="guess-squares">{f.squares}</span>
            </li>
          );
        })}
        {!finished &&
          Array.from({ length: MAX_GUESSES - guesses.length }, (_, i) => (
            <li key={`empty-${i}`} className="guess-row empty">
              {guesses.length + i + 1}
            </li>
          ))}
      </ol>

      {!finished ? (
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitGuess();
          }}
        >
          <input
            type="text"
            list="country-list"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Which country is it?"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <datalist id="country-list">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.name} />
            ))}
          </datalist>
          <button type="submit">Guess</button>
        </form>
      ) : (
        <div className="result">
          <p className="answer-line">
            {won ? "🎉 Correct!" : "😔 Out of guesses."} It was{" "}
            <strong>{answer.name}</strong>.
          </p>
          {mode === "daily" ? (
            <>
              <button className="share" onClick={share}>
                {copied ? "Copied! 📋" : "Share result"}
              </button>
              <p className="stats-line">
                Played {stats.played} · Win {winPct}% · Streak{" "}
                {stats.currentStreak} 🔥 · Best {stats.maxStreak}
              </p>
              <p className="next-line">New flag every day at midnight.</p>
              {!pro && (
                <div className="ad-slot">
                  <span className="ad-label">Ad</span>
                  <p>
                    Enjoying FlagZoom? <strong>Pro</strong> removes ads and
                    unlocks unlimited Practice mode.
                  </p>
                  <button className="pro" onClick={goPro}>
                    Go Pro
                  </button>
                </div>
              )}
            </>
          ) : (
            <button className="share" onClick={startPractice}>
              Next flag →
            </button>
          )}
        </div>
      )}

      {message && <p className="message">{message}</p>}

      <footer>
        <a href={APP_URL}>FlagZoom</a> — a Labinate app
      </footer>
    </main>
  );
}
