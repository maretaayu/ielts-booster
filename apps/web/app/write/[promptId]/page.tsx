"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import type { Prompt } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { PromptChart } from "@/components/PromptChart";

export default function Editor() {
  const params = useParams<{ promptId: string }>();
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [essay, setEssay] = useState("");
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getPrompt(params.promptId).then(setPrompt).catch((e) => setError(e.message));
  }, [params.promptId]);

  useEffect(() => {
    const t = setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const wordCount = useMemo(
    () => essay.trim().split(/\s+/).filter(Boolean).length,
    [essay],
  );

  const minutes = Math.floor(secondsElapsed / 60);
  const seconds = secondsElapsed % 60;

  async function handleSubmit() {
    if (!prompt) return;
    setSubmitting(true);
    setError(null);
    try {
      const userId = getOrCreateUserId();
      const { attemptId } = await api.grade({
        promptId: prompt.id,
        essay,
        timeSpentSeconds: secondsElapsed,
        userId,
      });
      router.push(`/result/${attemptId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (!prompt) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        {error ? (
          <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-rose-800">{error}</div>
        ) : (
          <div className="text-ink/50">Loading prompt…</div>
        )}
      </div>
    );
  }

  const meetsMin = wordCount >= prompt.minWords;
  const timeBudget = prompt.timeMinutes * 60;
  const timePct = Math.min(100, (secondsElapsed / timeBudget) * 100);
  const wordPct = Math.min(100, (wordCount / prompt.minWords) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between">
        <Link href="/write" className="btn-pill-ghost">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="text-xs uppercase tracking-wider text-ink/50 font-semibold hidden sm:block">
          Focus mode
        </div>
      </div>

      <div className="mt-6 bg-white rounded-3xl p-6 sm:p-8 border border-black/[0.06] shadow-soft">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/60">
          {prompt.title}
        </div>
        <p className="mt-3 text-lg text-ink leading-relaxed">{prompt.question}</p>
        {prompt.chartData && (
          <div className="mt-5 rounded-2xl border border-black/[0.06] bg-stone-50 p-4 sm:p-5">
            <PromptChart data={prompt.chartData} />
          </div>
        )}
        {prompt.imageUrl && !prompt.chartData && (
          <div className="mt-5 rounded-2xl overflow-hidden border border-black/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={prompt.imageUrl} alt={prompt.title} className="w-full h-auto" />
          </div>
        )}
      </div>

      <div className="mt-4 sticky top-3 z-10 glass-strong rounded-2xl px-4 sm:px-5 py-3 flex flex-wrap items-center gap-4">
        <Stat
          label="Time"
          value={`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          sub={`/ ${prompt.timeMinutes}:00`}
          pct={timePct}
          accent="from-violet-400 to-indigo-500"
        />
        <Stat
          label="Words"
          value={wordCount.toString()}
          sub={`/ ${prompt.minWords}`}
          pct={wordPct}
          accent={meetsMin ? "from-emerald-400 to-teal-500" : "from-amber-400 to-rose-400"}
        />
        <button
          onClick={handleSubmit}
          disabled={!meetsMin || submitting}
          className="btn-pill ml-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Grading…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit
            </>
          )}
        </button>
      </div>

      <textarea
        value={essay}
        onChange={(e) => setEssay(e.target.value)}
        placeholder="Start writing your response here…"
        className="mt-4 w-full min-h-[520px] rounded-3xl glass-strong p-6 sm:p-8 focus:outline-none focus:ring-2 focus:ring-violet-300 leading-relaxed text-ink text-base sm:text-lg resize-y"
      />

      {error && (
        <div className="mt-4 rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  pct,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  pct: number;
  accent: string;
}) {
  return (
    <div className="min-w-[140px]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">{label}</span>
        <span className="font-mono text-base font-semibold">{value}</span>
        <span className="text-xs text-ink/40">{sub}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/60 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
