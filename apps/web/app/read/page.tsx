"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpenText, Clock, ListChecks } from "lucide-react";
import type { ReadingPassage } from "@ielts/shared";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";

type PassageSummary = Omit<ReadingPassage, "questions" | "body"> & {
  questionCount: number;
  preview: string;
};

const CARD_VARIANTS = ["bg-card-peach", "bg-card-mint", "bg-card-lavender", "bg-card-rose"];

export default function ReadPicker() {
  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listPassages()
      .then((r) => setPassages(r.passages))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      greeting="Read like an examiner"
      subtitle="Tap any word in the passage to see meaning, synonyms and an example sentence. Your vocab list builds itself."
    >
      <div className="glass rounded-3xl p-5 mb-8 flex items-center gap-3 text-sm text-ink/70">
        <BookOpenText className="h-5 w-5 text-violet-500" />
        <div>
          Mixed Cambridge-style passages with True/False/Not Given, multiple choice, matching
          headings &amp; short-answer questions.
        </div>
        <Link href="/vocab" className="btn-pill-ghost ml-auto !py-1.5 !px-3 text-xs whitespace-nowrap">
          My vocab list
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-sm text-rose-800 mb-6">
          {error}. Make sure the API is running at{" "}
          {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-56 rounded-3xl glass animate-pulse" />
            ))
          : passages.map((p, i) => (
              <Link
                key={p.id}
                href={`/read/${p.id}`}
                className={cn(
                  CARD_VARIANTS[i % CARD_VARIANTS.length],
                  "group rounded-3xl p-6 border border-white/60 shadow-soft hover:shadow-pop transition",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/60 bg-white/60 px-2.5 py-1 rounded-full">
                    {p.tags[0] ?? "reading"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full",
                      p.difficulty === "easy" && "bg-emerald-100 text-emerald-700",
                      p.difficulty === "medium" && "bg-amber-100 text-amber-700",
                      p.difficulty === "hard" && "bg-rose-100 text-rose-700",
                    )}
                  >
                    {p.difficulty}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm text-ink/65 line-clamp-3 leading-relaxed">{p.preview}</p>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-ink/55">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {p.estimatedMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" /> {p.questionCount} questions
                    </span>
                  </div>
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-ink text-white group-hover:scale-110 transition">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </AppShell>
  );
}
