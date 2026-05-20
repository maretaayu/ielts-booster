"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  PenLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {
  CEFR_LADDER,
  CEFR_TO_BAND,
  PLACEMENT_MCQ_BANK,
  type CefrLevel,
  type PlacementCategory,
  type PlacementMcq,
  type PlacementResult,
  type PlacementWritingPrompt,
  pickNextMcq,
  pickWritingPrompt,
  stepCefr,
} from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_MCQ = 10;
const PLACEMENT_PENDING_KEY = "ielts.placement.pending";

type Step =
  | "intro"
  | "mcq"
  | "transition"
  | "writing"
  | "submitting"
  | "result"
  | "error";

interface McqAnswer {
  q: PlacementMcq;
  given: number;
  correct: boolean;
}

export default function PlacementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams?.get("from") === "onboarding";
  const continueHref = fromOnboarding ? "/onboarding" : "/";
  const [step, setStep] = useState<Step>("intro");
  const [error, setError] = useState<string | null>(null);

  // MCQ state
  const [askedIds, setAskedIds] = useState<Set<string>>(() => new Set());
  const [nextLevel, setNextLevel] = useState<CefrLevel>("B1");
  const [history, setHistory] = useState<McqAnswer[]>([]);
  const [currentQ, setCurrentQ] = useState<PlacementMcq | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);

  // Writing state
  const [writingPrompt, setWritingPrompt] = useState<PlacementWritingPrompt | null>(null);
  const [writingText, setWritingText] = useState("");
  const [writingTimeLeft, setWritingTimeLeft] = useState(0);
  const writingDeadlineRef = useRef<number | null>(null);

  // Result state
  const [finalResult, setFinalResult] = useState<PlacementResult | null>(null);
  const [writingSummary, setWritingSummary] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- Lifecycle: load first MCQ when entering mcq state ----
  useEffect(() => {
    if (step !== "mcq" || currentQ) return;
    const q = pickNextMcq(nextLevel, askedIds) ?? findFallbackMcq(nextLevel, askedIds);
    if (!q) {
      // Bank exhausted before reaching MAX_MCQ — finalize early.
      finalizeMcqAndStartWriting(history);
      return;
    }
    setCurrentQ(q);
  }, [step, currentQ, nextLevel, askedIds]);

  // ---- Writing timer ----
  useEffect(() => {
    if (step !== "writing" || writingDeadlineRef.current == null) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((writingDeadlineRef.current! - Date.now()) / 1000),
      );
      setWritingTimeLeft(remaining);
      if (remaining === 0) {
        submitWriting();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---- MCQ answer handler ----
  function answerMcq(idx: number) {
    if (!currentQ || revealed !== null) return;
    setRevealed(idx);
    const isCorrect = idx === currentQ.answer;
    const entry: McqAnswer = { q: currentQ, given: idx, correct: isCorrect };
    const updated = [...history, entry];
    setHistory(updated);

    // Brief reveal pause for feedback, then advance.
    setTimeout(() => {
      const newAsked = new Set(askedIds);
      newAsked.add(currentQ.id);
      setAskedIds(newAsked);

      if (updated.length >= MAX_MCQ) {
        finalizeMcqAndStartWriting(updated);
        return;
      }
      setNextLevel(stepCefr(currentQ.cefr, isCorrect ? "up" : "down"));
      setRevealed(null);
      setCurrentQ(null);
    }, 650);
  }

  // ---- Move from MCQ → writing ----
  function finalizeMcqAndStartWriting(finalHistory: McqAnswer[]) {
    const mcqCefr = deriveFinalCefr(finalHistory);
    const prompt = pickWritingPrompt(mcqCefr);
    setWritingPrompt(prompt);
    writingDeadlineRef.current = Date.now() + prompt.timeMinutes * 60 * 1000;
    setStep("transition");
    setTimeout(() => setStep("writing"), 1400);
  }

  // ---- Skip writing → finalize with MCQ-only result ----
  function skipWriting() {
    void finalizeResult(null);
  }

  // ---- Submit writing → score via /placement/score-writing → finalize ----
  async function submitWriting() {
    if (step === "submitting" || step === "result") return;
    setStep("submitting");
    if (!writingPrompt || writingText.trim().length < 20) {
      // Too short — treat like skip.
      await finalizeResult(null);
      return;
    }
    try {
      const score = await api.scorePlacementWriting({
        essay: writingText.trim(),
        promptText: writingPrompt.prompt,
        targetCefr: writingPrompt.cefr,
      });
      await finalizeResult(score);
    } catch (e) {
      // Writing scoring failed — fall back to MCQ-only result.
      console.error("placement writing scoring failed", e);
      await finalizeResult(null);
    }
  }

  // ---- Combine MCQ + writing → final PlacementResult, persist ----
  async function finalizeResult(
    writingScore: { cefr: CefrLevel; estimatedBand: number; summary: string } | null,
  ) {
    const mcqCefr = deriveFinalCefr(history);
    const mcqCorrect = history.filter((h) => h.correct).length;
    const mcqAsked = history.length;
    const breakdown = deriveBreakdown(history);

    // If writing came back, average it with MCQ (weighted 60/40 toward MCQ for stability).
    const finalCefr = writingScore
      ? averageCefr(mcqCefr, writingScore.cefr, 0.6)
      : mcqCefr;

    const result: PlacementResult = {
      cefr: finalCefr,
      estimatedBand: CEFR_TO_BAND[finalCefr],
      takenAt: new Date().toISOString(),
      mcqCorrect,
      mcqAsked,
      writingBand: writingScore?.estimatedBand,
      skillBreakdown: breakdown,
    };

    setFinalResult(result);
    setWritingSummary(writingScore?.summary ?? null);
    setStep("result");

    // Persist: localStorage always (for onboarding handoff), profile if exists.
    try {
      localStorage.setItem(PLACEMENT_PENDING_KEY, JSON.stringify(result));
    } catch {
      // ignore quota errors
    }
    const userId = getOrCreateUserId();
    try {
      await api.savePlacement(userId, {
        cefr: result.cefr,
        estimatedBand: result.estimatedBand,
        mcqCorrect: result.mcqCorrect,
        mcqAsked: result.mcqAsked,
        writingBand: result.writingBand,
        skillBreakdown: result.skillBreakdown,
      });
    } catch (e) {
      // No profile yet (404) is expected when taken pre-onboarding. Anything else is a real error.
      const msg = (e as Error).message ?? "";
      if (!msg.includes("404")) {
        setSaveError("Saved locally — we'll sync to your profile when you finish onboarding.");
      }
    }
  }

  // ---- Render ----
  if (step === "intro") return <IntroScreen onStart={() => setStep("mcq")} />;
  if (step === "mcq" && currentQ)
    return (
      <McqScreen
        q={currentQ}
        index={history.length}
        total={MAX_MCQ}
        revealed={revealed}
        onAnswer={answerMcq}
      />
    );
  if (step === "transition") return <TransitionScreen />;
  if (step === "writing" && writingPrompt)
    return (
      <WritingScreen
        prompt={writingPrompt}
        text={writingText}
        setText={setWritingText}
        timeLeftSeconds={writingTimeLeft}
        onSubmit={submitWriting}
        onSkip={skipWriting}
      />
    );
  if (step === "submitting") return <SubmittingScreen />;
  if (step === "result" && finalResult)
    return (
      <ResultScreen
        result={finalResult}
        writingSummary={writingSummary}
        saveError={saveError}
        continueLabel={fromOnboarding ? "Back to onboarding" : "Continue"}
        onContinue={() => router.push(continueHref)}
      />
    );
  if (step === "error")
    return <ErrorScreen message={error ?? "Something went wrong"} />;
  return <SubmittingScreen />;
}

// ============================================================
// Screens
// ============================================================

function ScreenShell({
  children,
  centered,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-h-[100dvh] px-4 py-6 sm:py-10 max-w-md mx-auto flex flex-col",
        centered && "items-center justify-center text-center",
      )}
    >
      {children}
    </div>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-300 to-rose-300 flex items-center justify-center mb-5 shadow-soft">
            <Target className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Let's find your level
          </h1>
          <p className="mt-2 text-sm text-ink/65 leading-relaxed">
            A 5-minute mini-test to estimate where you stand on the IELTS band scale.
            We use it to recommend exercises that match you — not too easy, not too hard.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Step
            n={1}
            title="10 quick questions"
            sub="Grammar, vocabulary, and reading. Each gets harder if you get the previous one right."
          />
          <Step
            n={2}
            title="1 short writing sample"
            sub="50–110 words, 5 minutes. Helps us calibrate your productive ability."
          />
          <Step
            n={3}
            title="Your CEFR + IELTS band"
            sub="Plus a starting point for your study plan. You can re-take any time."
          />
        </div>
      </div>

      <button
        onClick={onStart}
        className="btn-pill mt-6 justify-center w-full text-base py-3"
      >
        Start placement <ArrowRight className="h-4 w-4" />
      </button>
      <Link
        href="/getting-started"
        className="mt-3 text-center text-sm font-semibold text-ink/55 hover:text-ink"
      >
        First time hearing about IELTS? Read the intro
      </Link>
    </ScreenShell>
  );
}

function Step({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/65 border border-white/70 p-4">
      <div className="shrink-0 h-7 w-7 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-ink/60 mt-0.5 leading-snug">{sub}</div>
      </div>
    </div>
  );
}

function McqScreen({
  q,
  index,
  total,
  revealed,
  onAnswer,
}: {
  q: PlacementMcq;
  index: number;
  total: number;
  revealed: number | null;
  onAnswer: (idx: number) => void;
}) {
  return (
    <ScreenShell>
      <div className="flex items-center gap-1.5 mb-6">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full flex-1 transition-all",
              i < index ? "bg-ink/70" : i === index ? "bg-ink" : "bg-ink/15",
            )}
          />
        ))}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider text-ink/40 mb-2">
        Question {index + 1} of {total} · {categoryLabel(q.category)}
      </div>
      <h2 className="text-lg sm:text-xl font-semibold leading-snug text-ink">
        {q.prompt}
      </h2>

      <div className="mt-6 flex flex-col gap-2.5">
        {q.options.map((opt, i) => {
          const isRevealed = revealed !== null;
          const isCorrect = i === q.answer;
          const isPicked = i === revealed;
          return (
            <button
              key={i}
              disabled={isRevealed}
              onClick={() => onAnswer(i)}
              className={cn(
                "w-full text-left rounded-2xl border-2 p-3.5 transition flex items-start gap-3",
                !isRevealed && "border-white/70 bg-white/60 hover:bg-white",
                isRevealed && isCorrect && "border-emerald-400 bg-emerald-50",
                isRevealed && !isCorrect && isPicked && "border-rose-400 bg-rose-50",
                isRevealed && !isCorrect && !isPicked && "border-white/60 bg-white/40 opacity-60",
              )}
            >
              <div
                className={cn(
                  "shrink-0 h-7 w-7 rounded-full font-semibold text-xs flex items-center justify-center",
                  !isRevealed && "bg-ink/8 text-ink",
                  isRevealed && isCorrect && "bg-emerald-400 text-white",
                  isRevealed && !isCorrect && isPicked && "bg-rose-400 text-white",
                  isRevealed && !isCorrect && !isPicked && "bg-ink/8 text-ink/50",
                )}
              >
                {String.fromCharCode(65 + i)}
              </div>
              <div className="text-sm sm:text-base text-ink leading-snug pt-0.5">{opt}</div>
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}

function TransitionScreen() {
  return (
    <ScreenShell centered>
      <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold">Nice work.</h2>
      <p className="mt-2 text-sm text-ink/65">
        One short writing sample to go — about 5 minutes.
      </p>
    </ScreenShell>
  );
}

function WritingScreen({
  prompt,
  text,
  setText,
  timeLeftSeconds,
  onSubmit,
  onSkip,
}: {
  prompt: PlacementWritingPrompt;
  text: string;
  setText: (t: string) => void;
  timeLeftSeconds: number;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const wordCount = countWords(text);
  const meetsMin = wordCount >= prompt.minWords;
  const overMax = wordCount > prompt.maxWords;
  const lowTime = timeLeftSeconds <= 30;

  return (
    <ScreenShell>
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink/50">
          <PenLine className="h-3.5 w-3.5" />
          Writing sample
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums px-2.5 py-1 rounded-full",
            lowTime ? "bg-rose-100 text-rose-700" : "bg-ink/8 text-ink/70",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {formatTime(timeLeftSeconds)}
        </div>
      </div>

      <div className="rounded-2xl bg-violet-50/80 border border-violet-200 p-4">
        <p className="text-sm sm:text-base leading-relaxed text-ink">{prompt.prompt}</p>
      </div>

      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start writing here…"
        className="mt-3 w-full flex-1 min-h-[200px] rounded-2xl bg-white/70 border border-white/70 p-4 text-base focus:outline-none focus:border-violet-300 resize-none leading-relaxed"
      />

      <div className="mt-2 flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium",
            !meetsMin && "text-ink/50",
            meetsMin && !overMax && "text-emerald-700",
            overMax && "text-amber-700",
          )}
        >
          {wordCount} / {prompt.minWords}–{prompt.maxWords} words
        </span>
        {overMax && <span className="text-amber-700">A bit over — that's okay.</span>}
      </div>

      <button
        onClick={onSubmit}
        disabled={!meetsMin}
        className="btn-pill mt-5 justify-center w-full text-base py-3 disabled:opacity-40"
      >
        Submit writing <ArrowRight className="h-4 w-4" />
      </button>
      <button
        onClick={onSkip}
        className="mt-3 text-center text-sm font-semibold text-ink/55 hover:text-ink"
      >
        Skip — use MCQ result only
      </button>
    </ScreenShell>
  );
}

function SubmittingScreen() {
  return (
    <ScreenShell centered>
      <div className="mx-auto h-14 w-14 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin mb-4" />
      <h2 className="text-xl font-bold">Reading your writing…</h2>
      <p className="mt-2 text-sm text-ink/65">
        Calibrating your level. Takes about 10 seconds.
      </p>
    </ScreenShell>
  );
}

function ResultScreen({
  result,
  writingSummary,
  saveError,
  continueLabel,
  onContinue,
}: {
  result: PlacementResult;
  writingSummary: string | null;
  saveError: string | null;
  continueLabel: string;
  onContinue: () => void;
}) {
  return (
    <ScreenShell>
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-300 to-rose-300 flex items-center justify-center mb-4 shadow-soft">
            <Trophy className="h-7 w-7 text-white" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-wider text-ink/40 mb-1">
            Your starting level
          </div>
          <div className="text-6xl font-bold tracking-tight">{result.cefr}</div>
          <div className="mt-2 text-base text-ink/70">
            ≈ IELTS band <strong>{result.estimatedBand.toFixed(1)}</strong>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/70 border border-white/70 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/65">Questions correct</span>
            <span className="font-semibold tabular-nums">
              {result.mcqCorrect} / {result.mcqAsked}
            </span>
          </div>
          {result.writingBand !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/65">Writing sample band</span>
              <span className="font-semibold tabular-nums">{result.writingBand.toFixed(1)}</span>
            </div>
          )}
          {result.skillBreakdown && (
            <div className="border-t border-ink/8 pt-3 space-y-1.5">
              {(Object.keys(result.skillBreakdown) as PlacementCategory[]).map((k) => {
                const s = result.skillBreakdown![k]!;
                return (
                  <div key={k} className="flex items-center justify-between text-xs">
                    <span className="text-ink/55">{categoryLabel(k)}</span>
                    <span className="text-ink/70 tabular-nums">
                      {s.correct}/{s.asked}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {writingSummary && (
          <div className="mt-4 rounded-2xl bg-violet-50/80 border border-violet-200 p-4 text-sm text-ink/75 leading-relaxed">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-700 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              On your writing
            </div>
            {writingSummary}
          </div>
        )}

        {saveError && (
          <div className="mt-3 text-xs text-amber-700">{saveError}</div>
        )}
      </div>

      <button
        onClick={onContinue}
        className="btn-pill mt-6 justify-center w-full text-base py-3"
      >
        {continueLabel} <ArrowRight className="h-4 w-4" />
      </button>
    </ScreenShell>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <ScreenShell centered>
      <div className="rounded-2xl bg-rose-100 border border-rose-200 p-4 text-sm text-rose-800 max-w-sm">
        {message}
      </div>
    </ScreenShell>
  );
}

// ============================================================
// Helpers
// ============================================================

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function categoryLabel(c: PlacementCategory): string {
  return c === "grammar" ? "Grammar" : c === "vocabulary" ? "Vocabulary" : "Reading";
}

/**
 * Walk a step in either direction; if the bank has no remaining question at
 * the target level, scan outward (then inward) until we find any unused MCQ.
 */
function findFallbackMcq(
  target: CefrLevel,
  asked: ReadonlySet<string>,
): PlacementMcq | null {
  for (const lvl of CEFR_LADDER) {
    if (lvl === target) continue;
    const q = PLACEMENT_MCQ_BANK.find(
      (mcq) => mcq.cefr === lvl && !asked.has(mcq.id),
    );
    if (q) return q;
  }
  return null;
}

/**
 * Pick the highest CEFR at which the user got ≥50% on at least 2 questions.
 * Falls back to A2 if no level has enough data — a conservative floor since
 * the ladder won't have descended further.
 */
function deriveFinalCefr(history: McqAnswer[]): CefrLevel {
  const byLevel = new Map<CefrLevel, { correct: number; asked: number }>();
  for (const h of history) {
    const cur = byLevel.get(h.q.cefr) ?? { correct: 0, asked: 0 };
    cur.asked += 1;
    if (h.correct) cur.correct += 1;
    byLevel.set(h.q.cefr, cur);
  }
  let best: CefrLevel = "A2";
  for (const lvl of CEFR_LADDER) {
    const stats = byLevel.get(lvl);
    if (stats && stats.asked >= 2 && stats.correct / stats.asked >= 0.5) {
      best = lvl;
    }
  }
  return best;
}

function deriveBreakdown(
  history: McqAnswer[],
): Partial<Record<PlacementCategory, { correct: number; asked: number }>> {
  const out: Partial<Record<PlacementCategory, { correct: number; asked: number }>> = {};
  for (const h of history) {
    const c = h.q.category;
    const cur = out[c] ?? { correct: 0, asked: 0 };
    cur.asked += 1;
    if (h.correct) cur.correct += 1;
    out[c] = cur;
  }
  return out;
}

/** Weighted average of two CEFR levels (weightA on the first). Rounds to nearest rung. */
function averageCefr(a: CefrLevel, b: CefrLevel, weightA: number): CefrLevel {
  const ai = CEFR_LADDER.indexOf(a);
  const bi = CEFR_LADDER.indexOf(b);
  const avg = Math.round(ai * weightA + bi * (1 - weightA));
  return CEFR_LADDER[Math.min(Math.max(avg, 0), CEFR_LADDER.length - 1)]!;
}
