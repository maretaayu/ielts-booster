"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Mic, MessageCircle, Sparkles } from "lucide-react";
import type { SpeakingPart, SpeakingTopic } from "@ielts/shared";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

const PART_LABEL: Record<SpeakingPart, string> = {
  part1: "Part 1 · Interview",
  part2: "Part 2 · Cue Card",
  part3: "Part 3 · Discussion",
};

const PART_DESC: Record<SpeakingPart, string> = {
  part1: "4-5 short personal questions (~4 min). Warm-up style.",
  part2: "1 cue card, 1 min prep + 2 min monologue. Most challenging for many.",
  part3: "Deeper discussion linked to Part 2 (~5 min). Abstract opinions, longer answers.",
};

const CARD_BY_PART: Record<SpeakingPart, string> = {
  part1: "bg-card-mint",
  part2: "bg-card-lavender",
  part3: "bg-card-peach",
};

export default function SpeakPicker() {
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [filter, setFilter] = useState<SpeakingPart | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listSpeakingTopics()
      .then((r) => setTopics(r.topics))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? topics : topics.filter((t) => t.part === filter)),
    [filter, topics],
  );

  return (
    <AppShell
      greeting="Speaking mock interview"
      subtitle="Voice-based practice with an AI examiner. We score Fluency, Lexical Resource, Grammar & Pronunciation."
    >
      <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-3 text-sm text-ink/70">
        <Mic className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0" />
        <div>
          Make sure your browser has microphone permission. Works best in <strong>Chrome</strong> or{" "}
          <strong>Edge</strong> (Safari supported, Firefox not).
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {(["all", "part1", "part2", "part3"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition border",
              filter === p
                ? "bg-ink text-white border-ink"
                : "bg-white/60 backdrop-blur border-white/60 text-ink/70 hover:bg-white",
            )}
          >
            {p === "all" ? "All parts" : PART_LABEL[p]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-sm text-rose-800 mb-6">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-3xl glass animate-pulse" />
            ))
          : filtered.map((t) => (
              <Link
                key={t.id}
                href={`/speak/${t.id}`}
                className={cn(
                  CARD_BY_PART[t.part],
                  "group rounded-3xl p-6 border border-white/60 shadow-soft hover:shadow-pop transition",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/60 bg-white/60 px-2.5 py-1 rounded-full">
                    {PART_LABEL[t.part]}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full",
                      t.difficulty === "easy" && "bg-emerald-100 text-emerald-700",
                      t.difficulty === "medium" && "bg-amber-100 text-amber-700",
                      t.difficulty === "hard" && "bg-rose-100 text-rose-700",
                    )}
                  >
                    {t.difficulty}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{t.title}</h3>
                <p className="mt-1 text-xs text-ink/60">{PART_DESC[t.part]}</p>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-ink/55">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~{t.estimatedMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" /> {t.questions.length} question
                      {t.questions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-ink text-white group-hover:scale-110 transition">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
      </div>

      <div className="mt-8 glass rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
        <Sparkles className="h-6 w-6 text-violet-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold tracking-tight">How scoring works</h3>
          <p className="mt-1 text-sm text-ink/65 leading-relaxed">
            We transcribe your speech in the browser (no audio leaves your device until scoring),
            then Gemini grades your transcript against the official IELTS Speaking band descriptors.
            Pronunciation is estimated from transcript proxies — for a true pronunciation score, a
            human examiner is still gold standard.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
