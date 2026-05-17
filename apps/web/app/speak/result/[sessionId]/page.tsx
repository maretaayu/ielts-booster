"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Lightbulb,
  Loader2,
  Mic,
  Sparkles,
} from "lucide-react";
import type { SpeakingSession } from "@ielts/shared";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { bandColor, cn, formatBand } from "@/lib/utils";

export default function SpeakResult() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSpeakingSession(params.sessionId)
      .then(setSession)
      .catch((e: Error) => setError(e.message));
  }, [params.sessionId]);

  if (error) {
    return (
      <AppShell greeting="Speaking result">
        <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-rose-800">
          {error}
        </div>
      </AppShell>
    );
  }
  if (!session) {
    return (
      <AppShell greeting="Speaking result">
        <div className="flex items-center gap-2 text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading session…
        </div>
      </AppShell>
    );
  }
  if (session.status !== "scored" || !session.score) {
    return (
      <AppShell greeting="Speaking result">
        <div className="text-ink/60">
          Session status: {session.status}. Try the speaking page again.
        </div>
      </AppShell>
    );
  }

  const s = session.score;
  const overall = s.overallBand;

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/speak" className="inline-flex items-center gap-2 text-sm text-ink/65 hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> All topics
        </Link>
        <Link href={`/speak/${session.topicId}`} className="btn-pill !py-1.5 !px-3 text-xs">
          Try again <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section className="grid md:grid-cols-[1fr_1.4fr] gap-4">
        <div className="bg-card-mint rounded-3xl p-6 sm:p-8 border border-white/60 shadow-soft">
          <div className="text-[11px] uppercase tracking-wider text-ink/55 font-semibold">
            Overall band
          </div>
          <div className={cn("mt-2 text-6xl font-bold tracking-tight", bandColor(overall))}>
            {formatBand(overall)}
          </div>
          <div className="mt-2 text-sm text-ink/65">
            {session.topicSnapshot.title} · {session.topicSnapshot.part.toUpperCase()}
          </div>
          <div className="mt-1 text-xs text-ink/45">
            {Math.round(session.totalSeconds / 60)} min · {session.turns.length} turn
            {session.turns.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 sm:p-8 space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Summary</h2>
          <p className="text-sm text-ink/80 leading-relaxed">{s.summary}</p>
          <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{s.disclaimer}</span>
          </div>
        </div>
      </section>

      {/* Criteria */}
      <section className="mt-6 grid sm:grid-cols-2 gap-3">
        <CriterionCard
          name="Fluency & Coherence"
          band={s.criteria.fluencyCoherence.band}
          feedback={s.criteria.fluencyCoherence.feedback}
          variant="rose"
        />
        <CriterionCard
          name="Lexical Resource"
          band={s.criteria.lexicalResource.band}
          feedback={s.criteria.lexicalResource.feedback}
          variant="lavender"
        />
        <CriterionCard
          name="Grammatical Range & Accuracy"
          band={s.criteria.grammaticalRangeAccuracy.band}
          feedback={s.criteria.grammaticalRangeAccuracy.feedback}
          variant="peach"
        />
        <CriterionCard
          name="Pronunciation (est.)"
          band={s.criteria.pronunciation.band}
          feedback={s.criteria.pronunciation.feedback}
          variant="mint"
        />
      </section>

      {/* Top tips */}
      <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" /> Top 3 tips for you
        </h2>
        <ol className="mt-4 space-y-3">
          {s.topTips.map((tip, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-6 w-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-ink/80 leading-relaxed">{tip}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Vocabulary upgrades */}
      {s.vocabularyUpgrades.length > 0 && (
        <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
          <h2 className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" /> Vocabulary upgrades
          </h2>
          <div className="mt-4 space-y-3">
            {s.vocabularyUpgrades.map((v, i) => (
              <div key={i} className="rounded-2xl bg-white/70 border border-white/60 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ink/55 line-through">{v.original}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-ink/40" />
                  <span className="font-semibold text-violet-700">{v.upgraded}</span>
                </div>
                <p className="text-xs text-ink/60 mt-1.5">{v.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sample answer */}
      <section className="mt-6 glass-strong rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Sample band-8+ answer
        </h2>
        <div className="mt-3 text-xs uppercase tracking-wider text-ink/50 font-semibold">
          Question {s.sampleAnswer.questionIndex + 1}
        </div>
        {session.turns[s.sampleAnswer.questionIndex] && (
          <p className="mt-1 text-sm font-medium text-ink/70 italic">
            {session.turns[s.sampleAnswer.questionIndex]!.question}
          </p>
        )}
        <p className="mt-3 text-sm text-ink/85 leading-relaxed whitespace-pre-wrap">
          {s.sampleAnswer.answer}
        </p>
      </section>

      {/* Full transcript */}
      <section className="mt-6 glass rounded-3xl p-6 sm:p-8">
        <h2 className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
          <Mic className="h-5 w-5" /> Your transcript
        </h2>
        <div className="mt-4 space-y-4">
          {session.turns.map((t, i) => (
            <div key={i} className="rounded-2xl bg-white/70 border border-white/60 p-3">
              <div className="text-xs font-semibold text-ink/55 uppercase tracking-wider">
                Q{i + 1} · {t.durationSeconds}s
              </div>
              <p className="text-sm text-ink/65 italic mt-0.5">{t.question}</p>
              <p className="mt-2 text-sm text-ink/85 leading-relaxed">
                {t.transcript || <span className="text-ink/40 italic">[no response captured]</span>}
              </p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

const VARIANT_BG: Record<string, string> = {
  rose: "bg-card-rose",
  lavender: "bg-card-lavender",
  peach: "bg-card-peach",
  mint: "bg-card-mint",
};

function CriterionCard({
  name,
  band,
  feedback,
  variant,
}: {
  name: string;
  band: number;
  feedback: string;
  variant: "rose" | "lavender" | "peach" | "mint";
}) {
  return (
    <div className={cn(VARIANT_BG[variant], "rounded-3xl p-5 border border-white/60 shadow-soft")}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-semibold text-ink/65 uppercase tracking-wider">{name}</div>
        <div className={cn("text-3xl font-bold tracking-tight", bandColor(band))}>
          {formatBand(band)}
        </div>
      </div>
      <p className="mt-2 text-sm text-ink/75 leading-relaxed">{feedback}</p>
    </div>
  );
}
