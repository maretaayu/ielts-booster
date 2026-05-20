"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { ReadingPassage, ReadingQuestion } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

const TF = ["True", "False", "Not Given"];
const YN = ["Yes", "No", "Not Given"];

interface Props {
  passageId: string;
  startedAt: number;
  onComplete: (result: { attemptId: string; band: number; rawScore: number; rawTotal: number }) => void;
  expireSignal: number;
}

function readingBandFromRaw(score: number, total: number): number {
  if (total <= 0) return 0;
  const pct = score / total;
  const table: Array<[number, number]> = [
    [0.97, 9],
    [0.92, 8.5],
    [0.87, 8],
    [0.82, 7.5],
    [0.75, 7],
    [0.65, 6.5],
    [0.57, 6],
    [0.45, 5.5],
    [0.4, 5],
    [0.32, 4.5],
    [0.25, 4],
    [0, 3.5],
  ];
  for (const [t, b] of table) if (pct >= t) return b;
  return 0;
}

export function ReadingRunner({ passageId, startedAt, onComplete, expireSignal }: Props) {
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPassage(passageId).then(setPassage).catch((e) => setError(e.message));
  }, [passageId]);

  const paragraphs = useMemo(() => {
    if (!passage) return [];
    return passage.body.split(/\n{2,}/).map((p) => {
      const m = p.match(/^\[(P\d+)\]\s*(.*)$/s);
      return m ? { ref: m[1]!, text: m[2]! } : { ref: "", text: p };
    });
  }, [passage]);

  const handleSubmit = async (auto = false) => {
    if (!passage || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.submitReading({
        userId: getOrCreateUserId(),
        passageId,
        answers,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
      });
      const band = readingBandFromRaw(r.attempt.score, r.attempt.total);
      onComplete({ attemptId: r.attempt.id, band, rawScore: r.attempt.score, rawTotal: r.attempt.total });
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
      if (auto) onComplete({ attemptId: "", band: 0, rawScore: 0, rawTotal: 0 });
    }
  };

  useEffect(() => {
    if (expireSignal > 0) handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expireSignal]);

  if (!passage) {
    return (
      <div className="flex items-center gap-2 text-ink/60">
        {error ? error : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading passage…
          </>
        )}
      </div>
    );
  }

  const answered = Object.keys(answers).filter((k) => answers[k]?.trim()).length;

  return (
    <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
      <article className="rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5 sm:p-6 max-h-[70vh] overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          {passage.tags.join(" · ")}
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{passage.title}</h2>
        <div className="mt-5 space-y-4">
          {paragraphs.map((p, i) => (
            <div key={i}>
              {p.ref && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ink/40 mb-1">
                  Paragraph {p.ref}
                </div>
              )}
              <p className="text-[15px] leading-relaxed text-ink/85">{p.text}</p>
            </div>
          ))}
        </div>
      </article>

      <aside className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {passage.questions.map((q, idx) => (
          <ReadingQ
            key={q.id}
            q={q}
            idx={idx}
            value={answers[q.id] ?? ""}
            allHeadings={passage.headings ?? []}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        ))}
        <div className="sticky bottom-0 pt-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-ink text-white font-semibold disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit reading · {answered}/{passage.questions.length} answered{" "}
                <Send className="h-4 w-4" />
              </>
            )}
          </button>
          {error && <div className="mt-2 text-sm text-rose-700">{error}</div>}
        </div>
      </aside>
    </div>
  );
}

function ReadingQ({
  q,
  idx,
  value,
  onChange,
  allHeadings,
}: {
  q: ReadingQuestion;
  idx: number;
  value: string;
  onChange: (v: string) => void;
  allHeadings: string[];
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-soft p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
        Q{idx + 1}
      </div>
      <p className="mt-1.5 text-sm text-ink/85">{q.prompt}</p>
      <div className="mt-3">
        {q.type === "true-false-notgiven" && (
          <Chips options={TF} value={value} onChange={onChange} />
        )}
        {q.type === "yes-no-notgiven" && (
          <Chips options={YN} value={value} onChange={onChange} />
        )}
        {q.type === "multiple-choice" && q.options && (
          <div className="space-y-1.5">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(String(i))}
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                  value === String(i)
                    ? "border-violet-400 bg-violet-50 text-ink"
                    : "border-black/[0.06] bg-white hover:bg-stone-50 text-ink/75",
                )}
              >
                <span className="font-semibold text-ink/70 mr-2">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            ))}
          </div>
        )}
        {q.type === "matching-headings" && (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm text-ink/85"
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm text-ink/85"
          />
        )}
      </div>
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium border transition",
            value === o
              ? "bg-ink text-white border-ink"
              : "bg-white text-ink/75 border-black/[0.08] hover:bg-stone-50",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
