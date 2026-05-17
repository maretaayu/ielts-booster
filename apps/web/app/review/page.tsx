"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Frown,
  Loader2,
  PartyPopper,
  Sparkles,
  Volume2,
  Zap,
} from "lucide-react";
import type { ReviewRating, VocabEntry } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

type Phase = "loading" | "empty" | "reviewing" | "done";

interface Summary {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

const INITIAL_SUMMARY: Summary = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

export default function ReviewPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<VocabEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [summary, setSummary] = useState<Summary>(INITIAL_SUMMARY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = getOrCreateUserId();
    api
      .dueVocab(userId)
      .then((r) => {
        if (r.due.length === 0) setPhase("empty");
        else {
          setQueue(r.due);
          setIndex(0);
          setPhase("reviewing");
        }
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const card = queue[index];
  const progress = queue.length === 0 ? 0 : (index / queue.length) * 100;

  async function rate(rating: ReviewRating) {
    if (!card) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.reviewVocab(card.id, { userId: getOrCreateUserId(), rating });
      setSummary((s) => ({
        ...s,
        reviewed: s.reviewed + 1,
        [rating]: s[rating] + 1,
      }));
      const nextIdx = index + 1;
      if (nextIdx >= queue.length) {
        setPhase("done");
      } else {
        setIndex(nextIdx);
        setRevealed(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function speak(word: string) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // Keyboard shortcuts: space = reveal, 1/2/3/4 = rate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "reviewing" || submitting) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setRevealed((r) => !r);
        return;
      }
      if (!revealed) return;
      if (e.key === "1") rate("again");
      if (e.key === "2") rate("hard");
      if (e.key === "3") rate("good");
      if (e.key === "4") rate("easy");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, revealed, submitting, card?.id]);

  return (
    <div className="min-h-[100dvh] flex flex-col px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/vocab" className="icon-pill" aria-label="Back to vocab">
          <ArrowLeft className="h-4 w-4 text-ink/70" />
        </Link>
        <div className="text-xs text-ink/50 font-medium">
          {phase === "reviewing" && `${index + 1} / ${queue.length}`}
        </div>
        <div className="w-10" />
      </div>

      {/* Progress bar */}
      {phase === "reviewing" && (
        <div className="h-1 rounded-full bg-ink/10 mb-6 overflow-hidden">
          <div
            className="h-full bg-ink transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center">
        {phase === "loading" && (
          <div className="flex items-center justify-center gap-2 text-ink/60">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading your deck…
          </div>
        )}

        {phase === "empty" && <EmptyState />}

        {phase === "reviewing" && card && (
          <Flashcard
            card={card}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onSpeak={() => speak(card.word)}
          />
        )}

        {phase === "done" && <DoneState summary={summary} />}
      </div>

      {phase === "reviewing" && card && (
        <div className="mt-6 space-y-2">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="btn-pill w-full justify-center py-3 text-base"
            >
              Show answer <Sparkles className="h-4 w-4" />
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <RatingButton
                label="Again"
                hint="<1m"
                color="rose"
                disabled={submitting}
                onClick={() => rate("again")}
                shortcut="1"
              />
              <RatingButton
                label="Hard"
                hint="~1d"
                color="amber"
                disabled={submitting}
                onClick={() => rate("hard")}
                shortcut="2"
              />
              <RatingButton
                label="Good"
                hint={daysHint(card, "good")}
                color="emerald"
                disabled={submitting}
                onClick={() => rate("good")}
                shortcut="3"
              />
              <RatingButton
                label="Easy"
                hint={daysHint(card, "easy")}
                color="violet"
                disabled={submitting}
                onClick={() => rate("easy")}
                shortcut="4"
              />
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-rose-100/70 border border-rose-200 p-2 text-xs text-rose-800">
              {error}
            </div>
          )}
          <p className="text-center text-[11px] text-ink/40 mt-2">
            Tap or press space to flip. 1-4 to rate.
          </p>
        </div>
      )}
    </div>
  );
}

function Flashcard({
  card,
  revealed,
  onReveal,
  onSpeak,
}: {
  card: VocabEntry;
  revealed: boolean;
  onReveal: () => void;
  onSpeak: () => void;
}) {
  return (
    <div
      onClick={onReveal}
      className="glass-strong rounded-3xl p-6 sm:p-8 border border-white/60 cursor-pointer min-h-[60vh] flex flex-col"
    >
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-wider text-ink/45 font-semibold">
          {card.definition.partOfSpeech}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpeak();
          }}
          className="icon-pill !h-8 !w-8"
          aria-label="Pronounce"
        >
          <Volume2 className="h-3.5 w-3.5 text-ink/70" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">{card.word}</h2>
        {!revealed && (
          <p className="mt-6 text-xs text-ink/40">Tap to reveal meaning</p>
        )}
      </div>

      {revealed && (
        <div className="mt-4 space-y-3 border-t border-white/60 pt-4">
          {card.definition.indonesian && (
            <div className="rounded-xl bg-rose-50/80 border border-rose-100 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">
                Bahasa Indonesia
              </div>
              <div className="mt-0.5 text-ink/85 font-medium text-lg">
                {card.definition.indonesian}
              </div>
            </div>
          )}
          <p className="text-sm text-ink/80 leading-relaxed">{card.definition.meaning}</p>
          {card.definition.synonyms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.definition.synonyms.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-[11px] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="rounded-xl bg-white/70 border border-white/60 p-2.5 text-[13px] leading-relaxed">
            <div className="italic text-ink/75">“{card.definition.exampleSentence}”</div>
            {card.definition.indonesianExample && (
              <div className="mt-1 text-ink/55 text-[12px]">
                “{card.definition.indonesianExample}”
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const COLOR_CLASS: Record<string, string> = {
  rose: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  amber: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  emerald: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  violet: "bg-violet-100 text-violet-800 hover:bg-violet-200",
};

function RatingButton({
  label,
  hint,
  color,
  disabled,
  onClick,
  shortcut,
}: {
  label: string;
  hint: string;
  color: "rose" | "amber" | "emerald" | "violet";
  disabled?: boolean;
  onClick: () => void;
  shortcut: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-2xl py-3 px-2 text-center transition font-semibold border border-white/60",
        COLOR_CLASS[color],
        disabled && "opacity-50",
      )}
    >
      <div className="text-sm">{label}</div>
      <div className="text-[10px] font-medium opacity-70 mt-0.5">{hint}</div>
      <div className="text-[9px] opacity-50 mt-0.5">[{shortcut}]</div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center">
      <PartyPopper className="h-12 w-12 mx-auto text-violet-500" />
      <h2 className="mt-4 text-2xl font-bold tracking-tight">All caught up!</h2>
      <p className="mt-2 text-sm text-ink/60">
        No words are due for review today. Open a reading passage to add more vocab — they&apos;ll
        show up here tomorrow.
      </p>
      <div className="mt-6 flex gap-2 justify-center">
        <Link href="/read" className="btn-pill">
          Read a passage
        </Link>
        <Link href="/vocab" className="btn-pill-ghost">
          See vocab list
        </Link>
      </div>
    </div>
  );
}

function DoneState({ summary }: { summary: Summary }) {
  return (
    <div className="text-center">
      <Zap className="h-12 w-12 mx-auto text-amber-500" />
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Session complete</h2>
      <p className="mt-2 text-sm text-ink/60">
        Reviewed {summary.reviewed} card{summary.reviewed === 1 ? "" : "s"}.
      </p>
      <div className="mt-6 grid grid-cols-4 gap-2 text-center">
        <StatChip label="Again" value={summary.again} color="rose" icon={<Frown className="h-3.5 w-3.5" />} />
        <StatChip label="Hard" value={summary.hard} color="amber" />
        <StatChip label="Good" value={summary.good} color="emerald" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <StatChip label="Easy" value={summary.easy} color="violet" />
      </div>
      <div className="mt-8 flex gap-2 justify-center">
        <Link href="/read" className="btn-pill">
          More reading
        </Link>
        <Link href="/vocab" className="btn-pill-ghost">
          Back to vocab
        </Link>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "rose" | "amber" | "emerald" | "violet";
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/60 p-3", COLOR_CLASS[color])}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70 inline-flex items-center gap-1">
        {icon} {label}
      </div>
    </div>
  );
}

function daysHint(card: VocabEntry, rating: "good" | "easy"): string {
  const ease = card.ease ?? 2.5;
  const interval = card.interval ?? 0;
  const reps = card.reps ?? 0;
  let next: number;
  if (rating === "good") {
    if (reps === 0) next = 1;
    else if (reps === 1) next = 3;
    else next = Math.round((interval || 1) * ease);
  } else {
    if (reps === 0) next = 3;
    else next = Math.round((interval || 1) * ease * 1.3);
  }
  if (next < 1) next = 1;
  if (next >= 30) return `~${Math.round(next / 30)}mo`;
  if (next >= 7) return `~${Math.round(next / 7)}w`;
  return `${next}d`;
}

/** Wrapper to satisfy the `Summary[rating]` indexed access in `setSummary`. */
type _SummaryKey = keyof Omit<Summary, "reviewed">;
const _: _SummaryKey = "again";
void _;
