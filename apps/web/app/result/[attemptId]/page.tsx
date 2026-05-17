"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import type { Attempt, CriterionFeedback } from "@ielts/shared";
import { api } from "@/lib/api";
import { bandColor, formatBand } from "@/lib/utils";
import { AnnotatedEssay } from "@/components/AnnotatedEssay";
import { AppShell } from "@/components/AppShell";

type CriterionKey =
  | "taskAchievement"
  | "coherenceCohesion"
  | "lexicalResource"
  | "grammaticalRangeAccuracy";

const CRITERIA: Array<{ key: CriterionKey; label: string; bg: string }> = [
  { key: "taskAchievement", label: "Task Achievement", bg: "bg-card-rose" },
  { key: "coherenceCohesion", label: "Coherence & Cohesion", bg: "bg-card-lavender" },
  { key: "lexicalResource", label: "Lexical Resource", bg: "bg-card-peach" },
  { key: "grammaticalRangeAccuracy", label: "Grammar Range", bg: "bg-card-mint" },
];

export default function ResultPage() {
  const params = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAttempt(params.attemptId).then(setAttempt).catch((e) => setError(e.message));
  }, [params.attemptId]);

  if (error) {
    return (
      <AppShell greeting="Result">
        <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-rose-800">{error}</div>
      </AppShell>
    );
  }

  if (!attempt) {
    return (
      <AppShell greeting="Result">
        <div className="text-ink/50">Loading result…</div>
      </AppShell>
    );
  }

  if (attempt.status !== "graded" || !attempt.result) {
    return (
      <AppShell greeting="Result">
        <div className="text-ink/60">
          Status: {attempt.status}. {attempt.status === "failed" && "Grading failed — try again."}
        </div>
      </AppShell>
    );
  }

  const r = attempt.result;
  const criteriaMap: Record<CriterionKey, CriterionFeedback> = r.criteria;

  return (
    <AppShell>
      {/* HERO: Band score */}
      <section className="grid md:grid-cols-[1.1fr_1fr] gap-4">
        <div className="bg-card-lavender rounded-3xl p-8 sm:p-10 border border-white/60 shadow-soft">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">
            Your overall band
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div
              className={`text-[120px] sm:text-[160px] leading-none font-bold tracking-tighter bg-gradient-to-br from-violet-600 to-rose-500 bg-clip-text text-transparent`}
            >
              {formatBand(r.overallBand)}
            </div>
            <div className="text-2xl text-ink/40 font-medium">/ 9</div>
          </div>
          <p className="mt-4 text-ink/70 leading-relaxed max-w-md">{r.summary}</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
              <BarChart3 className="h-3.5 w-3.5" /> Band breakdown
            </div>
            <div className="mt-5 space-y-3">
              {CRITERIA.map((c) => {
                const cr = criteriaMap[c.key];
                return (
                  <div key={c.key}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium">{c.label}</span>
                      <span className={`text-lg font-bold ${bandColor(cr.band)}`}>
                        {formatBand(cr.band)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-white/70 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-rose-400 transition-all"
                        style={{ width: `${(cr.band / 9) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-ink/50">
            <span>{attempt.wordCount} words</span> · <span>{Math.round(attempt.timeSpentSeconds / 60)} min</span>
          </div>
        </div>
      </section>

      {/* CRITERIA DETAIL CARDS */}
      <section className="mt-4 grid md:grid-cols-2 gap-4">
        {CRITERIA.map((c) => {
          const cr = criteriaMap[c.key];
          return (
            <div key={c.key} className={`${c.bg} rounded-3xl p-6 border border-white/60 shadow-soft`}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold tracking-tight">{c.label}</h3>
                <span className={`text-2xl font-bold ${bandColor(cr.band)}`}>
                  {formatBand(cr.band)}
                </span>
              </div>
              <div className="mt-4 text-sm">
                <div className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                  Strengths
                </div>
                <ul className="list-disc pl-5 text-ink/75 mt-1 space-y-0.5">
                  {cr.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <div className="mt-3 text-amber-700 text-xs font-semibold uppercase tracking-wider">
                  Improvements
                </div>
                <ul className="list-disc pl-5 text-ink/75 mt-1 space-y-0.5">
                  {cr.improvements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </section>

      {/* INLINE ANNOTATED ESSAY */}
      <section className="mt-4">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 border border-white/60 shadow-soft">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold tracking-tight">Your essay — with inline feedback</h2>
            <div className="flex gap-2 text-xs text-ink/60">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-300" /> error
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300" /> suggestion
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-300" /> strength
              </span>
            </div>
          </div>
          <p className="text-xs text-ink/50 mt-1">Hover or tap a highlight to see the comment.</p>
          <div className="mt-5">
            <AnnotatedEssay essay={attempt.essay} annotations={r.annotations} />
          </div>
        </div>
      </section>

      {/* SENTENCE STRUCTURE TIPS */}
      {r.sentenceStructureTips.length > 0 && (
        <section className="mt-4">
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/60">
            <h2 className="text-xl font-bold tracking-tight">Sentence structures to learn next</h2>
            <p className="text-sm text-ink/55 mt-1">
              Grammar patterns that will lift your Grammar Range &amp; Accuracy band.
            </p>
            <div className="mt-5 grid md:grid-cols-2 gap-3">
              {r.sentenceStructureTips.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/70 backdrop-blur border border-white/70 p-5"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                    {t.pattern}
                  </div>
                  <p className="mt-3 italic text-ink leading-relaxed">&ldquo;{t.example}&rdquo;</p>
                  <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                    Why it helps
                  </div>
                  <p className="text-sm text-ink/70 mt-0.5">{t.whyItHelps}</p>
                  <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                    Where to use
                  </div>
                  <p className="text-sm text-ink/70 mt-0.5">{t.whereToUse}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VOCAB UPGRADES */}
      {r.vocabularyUpgrades.length > 0 && (
        <section className="mt-4">
          <div className="bg-card-peach rounded-3xl p-6 sm:p-8 border border-white/60 shadow-soft">
            <h2 className="text-xl font-bold tracking-tight">Vocabulary upgrades</h2>
            <p className="text-sm text-ink/55 mt-1">Swap basic words for more academic ones.</p>
            <div className="mt-5 grid sm:grid-cols-2 gap-2">
              {r.vocabularyUpgrades.map((v, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/70 backdrop-blur border border-white/70 p-4 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="line-through text-ink/45">{v.original}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink/40" />
                    <span className="font-semibold text-emerald-700">{v.upgraded}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink/55">{v.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SAMPLE ANSWER */}
      <section className="mt-4">
        <details className="glass rounded-3xl border border-white/60 group">
          <summary className="list-none cursor-pointer p-6 sm:p-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Band 9 sample answer</h2>
              <p className="text-sm text-ink/55 mt-1">See how a perfect-band response is structured.</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/50 group-open:hidden">
              Show
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/50 hidden group-open:inline">
              Hide
            </span>
          </summary>
          <div className="px-6 sm:px-8 pb-8 whitespace-pre-wrap text-ink/80 leading-relaxed">
            {r.sampleAnswer}
          </div>
        </details>
      </section>

      {/* CTA */}
      <section className="mt-6 flex flex-wrap gap-3">
        <Link href="/write" className="btn-pill">
          Practice another <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/dashboard" className="btn-pill-ghost">
          View history
        </Link>
      </section>
    </AppShell>
  );
}
