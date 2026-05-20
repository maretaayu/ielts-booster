"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play, Send } from "lucide-react";
import type { ListeningSection, ListeningTest } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  testId: string;
  startedAt: number;
  onComplete: (result: { attemptId: string; band: number; rawScore: number; rawTotal: number }) => void;
  expireSignal: number;
}

type SectionWithScript = ListeningSection & { script: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchAudioUrl(text: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/tts/speak`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function ListeningRunner({ testId, startedAt, onComplete, expireSignal }: Props) {
  const [test, setTest] = useState<(ListeningTest & { sections: SectionWithScript[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [audioUrls, setAudioUrls] = useState<(string | null)[]>([]);
  const [playing, setPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState<boolean[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getListeningTest(testId)
      .then((t) => {
        setTest(t as ListeningTest & { sections: SectionWithScript[] });
        setAudioReady(new Array(t.sections.length).fill(false));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [testId]);

  useEffect(() => {
    if (!test) return;
    (async () => {
      const urls: (string | null)[] = [];
      for (const section of test.sections) {
        const url = await fetchAudioUrl(section.script);
        urls.push(url);
      }
      setAudioUrls(urls);
      setAudioReady(urls.map((u) => u != null));
    })();
  }, [test]);

  const allQuestions = useMemo(() => {
    if (!test) return [];
    return test.sections.flatMap((s) => s.questions.map((q) => ({ section: s, q })));
  }, [test]);

  const handleSubmit = async (auto = false) => {
    if (!test || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await api.submitListening({
        userId: getOrCreateUserId(),
        testId,
        answers,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000),
      });
      onComplete({
        attemptId: r.attempt.id,
        band: r.band,
        rawScore: r.attempt.score,
        rawTotal: r.attempt.total,
      });
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

  const onPlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading listening test…
      </div>
    );
  }
  if (!test || error) {
    return (
      <div className="rounded-2xl bg-rose-100 border border-rose-200 p-4 text-sm text-rose-800">
        {error ?? "Listening test unavailable"}
      </div>
    );
  }

  const section = test.sections[currentSectionIdx]!;
  const sectionUrl = audioUrls[currentSectionIdx];
  const answered = Object.keys(answers).filter((k) => answers[k]?.trim()).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
              Section {section.sectionIndex} of {test.sections.length}
            </div>
            <h3 className="mt-1 text-lg font-bold tracking-tight">{section.title}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {test.sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setCurrentSectionIdx(i)}
                className={cn(
                  "h-7 w-7 rounded-full text-xs font-semibold border",
                  i === currentSectionIdx
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink/60 border-black/[0.08] hover:bg-stone-50",
                )}
              >
                {s.sectionIndex}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-stone-50 p-4 flex items-center gap-3">
          <button
            onClick={onPlay}
            disabled={!sectionUrl}
            className={cn(
              "h-11 w-11 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40",
              playing ? "bg-rose-500" : "bg-ink",
            )}
            aria-label={playing ? "Pause audio" : "Play audio"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink/55 inline-flex items-center gap-1">
              <Headphones className="h-3 w-3" /> Audio
            </div>
            <div className="text-xs text-ink/55 mt-0.5">
              {sectionUrl
                ? "Tap play. You can replay the audio as many times as you need before the section timer ends."
                : audioReady[currentSectionIdx]
                  ? "Generating audio…"
                  : "Audio unavailable — set ELEVENLABS_API_KEY in apps/api/.env to enable. Transcript below."}
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              key={section.id}
              src={sectionUrl ?? undefined}
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              className="hidden"
            />
          </div>
        </div>

        {!sectionUrl && section.script && (
          <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed max-h-40 overflow-y-auto">
            {section.script}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {section.questions.map((q, i) => {
          const qNumber =
            test.sections.slice(0, currentSectionIdx).reduce((n, s) => n + s.questions.length, 0) +
            i +
            1;
          return (
            <div
              key={q.id}
              className="rounded-2xl bg-white border border-black/[0.06] shadow-soft p-4"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/55">
                Q{qNumber}
              </div>
              <p className="mt-1.5 text-sm text-ink/85">{q.prompt}</p>
              <div className="mt-3">
                {q.type === "multiple-choice" && q.options ? (
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(oi) }))}
                        className={cn(
                          "w-full text-left rounded-xl border px-3 py-2 text-sm transition",
                          answers[q.id] === String(oi)
                            ? "border-violet-400 bg-violet-50 text-ink"
                            : "border-black/[0.06] bg-white hover:bg-stone-50 text-ink/75",
                        )}
                      >
                        <span className="font-semibold text-ink/70 mr-2">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Type your answer"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm text-ink/85"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-2 z-10">
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
              Submit listening · {answered}/{allQuestions.length} answered{" "}
              <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
