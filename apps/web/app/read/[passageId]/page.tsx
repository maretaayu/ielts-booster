"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import type { ReadingPassage, ReadingQuestion } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TappableParagraph } from "@/components/TappableParagraph";

interface Breakdown {
  questionId: string;
  given: string;
  expected: string;
  correct: boolean;
  explanation?: string;
}

const TF = ["True", "False", "Not Given"] as const;
const YN = ["Yes", "No", "Not Given"] as const;

export default function PassagePage() {
  const params = useParams<{ passageId: string }>();
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; total: number; breakdown: Breakdown[] } | null>(
    null,
  );

  useEffect(() => {
    api.getPassage(params.passageId).then(setPassage).catch((e: Error) => setError(e.message));
  }, [params.passageId]);

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [result]);

  const paragraphs = useMemo(() => {
    if (!passage) return [];
    return passage.body.split(/\n{2,}/).map((para) => {
      const m = para.match(/^\[(P\d+)\]\s*(.*)$/s);
      return m ? { ref: m[1]!, text: m[2]! } : { ref: "", text: para };
    });
  }, [passage]);

  const allHeadings = useMemo(() => passage?.headings ?? [], [passage]);

  async function submit() {
    if (!passage) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.submitReading({
        userId: getOrCreateUserId(),
        passageId: passage.id,
        answers,
        timeSpentSeconds: seconds,
      });
      setResult({ score: r.attempt.score, total: r.attempt.total, breakdown: r.breakdown });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
    setSeconds(0);
  }

  if (!passage) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        {error ? (
          <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-rose-800">{error}</div>
        ) : (
          <div className="flex items-center gap-2 text-ink/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading passage…
          </div>
        )}
      </div>
    );
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const answered = Object.keys(answers).filter((k) => answers[k]?.trim()).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/read" className="inline-flex items-center gap-2 text-sm text-ink/65 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All passages
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-ink/70">
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{secs.toString().padStart(2, "0")}
          </span>
          <span className="inline-flex items-center gap-1.5 glass rounded-full px-3 py-1.5 text-ink/70">
            <ListChecks className="h-3.5 w-3.5" />
            {answered} / {passage.questions.length} answered
          </span>
        </div>
      </div>

      {result && (
        <div className="glass-strong rounded-3xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-ink/50">Your score</div>
            <div className="mt-1 text-4xl font-bold tracking-tight">
              {result.score} <span className="text-ink/40 text-2xl">/ {result.total}</span>
            </div>
            <div className="mt-1 text-sm text-ink/60">
              {Math.round((result.score / result.total) * 100)}% correct · feedback below
            </div>
          </div>
          <button onClick={reset} className="btn-pill-ghost">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Passage column */}
        <article className="glass-strong rounded-3xl p-6 sm:p-8">
          <div className="text-xs uppercase tracking-wider text-ink/45">{passage.tags.join(" · ")}</div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{passage.title}</h1>
          <p className="mt-2 text-xs text-ink/45">
            Tap any word to reveal its meaning, synonyms and an example sentence. Saved automatically to your
            vocab list.
          </p>
          <div className="mt-6 space-y-5">
            {paragraphs.map((p, i) => (
              <div key={i}>
                {p.ref && (
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-1">
                    Paragraph {p.ref}
                  </div>
                )}
                <TappableParagraph text={p.text} passageId={passage.id} />
              </div>
            ))}
          </div>
        </article>

        {/* Questions column */}
        <aside className="space-y-4 lg:sticky lg:top-6 self-start max-h-[calc(100vh-2rem)] lg:overflow-y-auto pr-1">
          {passage.questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              q={q}
              idx={idx}
              value={answers[q.id] ?? ""}
              onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              breakdown={result?.breakdown.find((b) => b.questionId === q.id)}
              allHeadings={allHeadings}
              locked={Boolean(result)}
            />
          ))}

          {!result && (
            <div className="sticky bottom-0 pt-2">
              <button
                onClick={submit}
                disabled={submitting || answered === 0}
                className="btn-pill w-full justify-center disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    Submit answers <Send className="h-4 w-4" />
                  </>
                )}
              </button>
              {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function QuestionCard({
  q,
  idx,
  value,
  onChange,
  breakdown,
  allHeadings,
  locked,
}: {
  q: ReadingQuestion;
  idx: number;
  value: string;
  onChange: (v: string) => void;
  breakdown?: Breakdown;
  allHeadings: string[];
  locked: boolean;
}) {
  const correctClass = breakdown?.correct
    ? "border-emerald-300 bg-emerald-50/70"
    : breakdown && !breakdown.correct
      ? "border-rose-300 bg-rose-50/70"
      : "border-white/60 bg-white/55";

  return (
    <div className={cn("rounded-2xl border shadow-soft p-4 backdrop-blur-xl", correctClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">
          Q{idx + 1} · {labelForType(q.type)}
        </div>
        {breakdown &&
          (breakdown.correct ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-600" />
          ))}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink/85">{q.prompt}</p>

      <div className="mt-3">
        {q.type === "true-false-notgiven" && (
          <ChipGroup options={TF as unknown as string[]} value={value} onChange={onChange} disabled={locked} />
        )}
        {q.type === "yes-no-notgiven" && (
          <ChipGroup options={YN as unknown as string[]} value={value} onChange={onChange} disabled={locked} />
        )}
        {q.type === "multiple-choice" && q.options && (
          <div className="space-y-1.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={locked}
                onClick={() => onChange(String(i))}
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                  value === String(i)
                    ? "border-violet-400 bg-violet-100/70 text-ink"
                    : "border-white/60 bg-white/60 hover:bg-white text-ink/75",
                  locked && "opacity-80 cursor-default",
                )}
              >
                <span className="font-semibold text-ink/70 mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>
        )}
        {q.type === "matching-headings" && (
          <select
            disabled={locked}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-ink/85"
          >
            <option value="">— pick a heading —</option>
            {(q.options ?? allHeadings).map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        )}
        {q.type === "short-answer" && (
          <input
            type="text"
            disabled={locked}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm text-ink/85"
          />
        )}
      </div>

      {breakdown && (
        <div className="mt-3 rounded-xl bg-white/70 border border-white/60 p-3 text-xs text-ink/70 leading-relaxed">
          <div>
            <span className="font-semibold text-ink/85">Correct answer:</span>{" "}
            {displayAnswer(q, breakdown.expected)}
          </div>
          {breakdown.explanation && (
            <div className="mt-1">
              <span className="font-semibold text-ink/85">Why:</span> {breakdown.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium border transition",
            value === o
              ? "bg-ink text-white border-ink"
              : "bg-white/70 text-ink/75 border-white/60 hover:bg-white",
            disabled && "opacity-80 cursor-default",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function labelForType(t: ReadingQuestion["type"]): string {
  switch (t) {
    case "true-false-notgiven":
      return "True / False / Not Given";
    case "yes-no-notgiven":
      return "Yes / No / Not Given";
    case "multiple-choice":
      return "Multiple choice";
    case "matching-headings":
      return "Matching headings";
    case "short-answer":
      return "Short answer";
  }
}

function displayAnswer(q: ReadingQuestion, ans: string): string {
  if (q.type === "multiple-choice" && q.options) {
    const i = Number(ans);
    if (!Number.isNaN(i) && q.options[i]) return `${String.fromCharCode(65 + i)}. ${q.options[i]}`;
  }
  return ans;
}
