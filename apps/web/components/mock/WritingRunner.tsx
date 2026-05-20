"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { Prompt } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";

interface Props {
  promptId: string;
  startedAt: number;
  onComplete: (result: { attemptId: string; band: number }) => void;
  expireSignal: number;
}

export function WritingRunner({ promptId, startedAt, onComplete, expireSignal }: Props) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [essay, setEssay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getPrompt(promptId).then(setPrompt).catch((e) => setError(e.message));
  }, [promptId]);

  const wordCount = useMemo(() => essay.trim().split(/\s+/).filter(Boolean).length, [essay]);

  const handleSubmit = async (auto = false) => {
    if (!prompt || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // The grader rejects essays under 20 chars — short-circuit and submit a placeholder so
      // an auto-timeout still produces a (low) band rather than blowing up the mock test flow.
      const text = essay.trim().length >= 20 ? essay : "(no answer provided in time)".padEnd(40, " .");
      const { attemptId, result } = await api.grade({
        promptId: prompt.id,
        essay: text,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
        userId: getOrCreateUserId(),
      });
      onComplete({ attemptId, band: result.overallBand });
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
      if (auto) onComplete({ attemptId: "", band: 0 });
    }
  };

  useEffect(() => {
    if (expireSignal > 0) handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expireSignal]);

  if (!prompt) {
    return (
      <div className="flex items-center gap-2 text-ink/60">
        {error ? error : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Loading prompt…
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5 sm:p-6">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          {prompt.title}
        </div>
        <p className="mt-3 text-base text-ink leading-relaxed">{prompt.question}</p>
        <div className="mt-2 text-[11px] text-ink/55">
          Write at least {prompt.minWords} words.
        </div>
      </div>

      <textarea
        value={essay}
        onChange={(e) => setEssay(e.target.value)}
        placeholder="Start writing your response here…"
        className="w-full min-h-[440px] rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5 sm:p-6 focus:outline-none focus:ring-2 focus:ring-violet-300 leading-relaxed text-ink text-base resize-y"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-ink/55">
          Words: <span className="font-mono font-semibold text-ink/80">{wordCount}</span> /{" "}
          {prompt.minWords}
        </div>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting || wordCount < prompt.minWords}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-ink text-white font-semibold disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Grading…
            </>
          ) : (
            <>
              Submit writing <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      {error && <div className="text-sm text-rose-700">{error}</div>}
    </div>
  );
}
