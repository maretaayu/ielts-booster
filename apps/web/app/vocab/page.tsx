"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookmarkX, Loader2, Sparkles, Volume2 } from "lucide-react";
import type { VocabEntry } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { AppShell } from "@/components/AppShell";

export default function VocabPage() {
  const [entries, setEntries] = useState<VocabEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dueCount, setDueCount] = useState<number | null>(null);

  useEffect(() => {
    const userId = getOrCreateUserId();
    api
      .listVocab(userId)
      .then((r) => setEntries(r.entries))
      .catch((e: Error) => setError(e.message));
    api
      .dueVocab(userId)
      .then((r) => setDueCount(r.counts.dueToday))
      .catch(() => setDueCount(null));
  }, []);

  function speak(word: string) {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  async function remove(id: string) {
    const userId = getOrCreateUserId();
    setEntries((cur) => cur?.filter((e) => e.id !== id) ?? null);
    try {
      await api.deleteVocab(id, userId);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const filtered = entries?.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.word.includes(q) ||
      e.definition.meaning.toLowerCase().includes(q) ||
      e.definition.synonyms.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell
      greeting="Your vocab list"
      subtitle="Every word you tapped while reading. Pronounce, review, and remove the ones you've mastered."
    >
      {error && (
        <div className="rounded-2xl bg-rose-100/70 border border-rose-200 p-4 text-sm text-rose-800 mb-6">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl p-3 mb-3 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words, meanings, synonyms…"
          className="flex-1 bg-transparent px-3 py-1.5 text-sm focus:outline-none placeholder:text-ink/40"
        />
        <Link href="/read" className="btn-pill-ghost !py-1.5 !px-3 text-xs whitespace-nowrap">
          Read more <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <Link
        href="/review"
        className="glass-strong rounded-2xl mb-6 p-4 flex items-center gap-3 hover:shadow-pop transition"
      >
        <div className="h-10 w-10 rounded-2xl bg-violet-100 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold tracking-tight">Review with flashcards</div>
          <div className="text-xs text-ink/60">
            {dueCount === null
              ? "Spaced repetition (SM-2) · 4 levels: again/hard/good/easy"
              : dueCount === 0
                ? "All caught up — nothing due today."
                : `${dueCount} card${dueCount === 1 ? "" : "s"} due now.`}
          </div>
        </div>
        {dueCount !== null && dueCount > 0 && (
          <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            {dueCount}
          </span>
        )}
        <ArrowRight className="h-4 w-4 text-ink/50" />
      </Link>

      {entries === null && !error && (
        <div className="flex items-center gap-2 text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {entries !== null && entries.length === 0 && (
        <div className="glass rounded-3xl p-10 text-center">
          <div className="text-lg font-semibold tracking-tight">No words yet.</div>
          <p className="mt-1 text-sm text-ink/60">
            Open a reading passage and tap any unfamiliar word to add it here.
          </p>
          <Link href="/read" className="btn-pill mt-5 inline-flex">
            Browse passages <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered?.map((e) => (
          <div key={e.id} className="glass-strong rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">{e.word}</h3>
                <button
                  onClick={() => speak(e.word)}
                  className="icon-pill !h-7 !w-7"
                  aria-label="Pronounce"
                >
                  <Volume2 className="h-3.5 w-3.5 text-ink/70" />
                </button>
                <span className="text-[11px] uppercase tracking-wider text-ink/45">
                  {e.definition.partOfSpeech}
                </span>
              </div>
              <button
                onClick={() => remove(e.id)}
                className="icon-pill !h-7 !w-7"
                aria-label="Remove from vocab"
                title="Remove"
              >
                <BookmarkX className="h-3.5 w-3.5 text-ink/70" />
              </button>
            </div>
            {e.definition.indonesian && (
              <div className="mt-2 inline-flex items-baseline gap-1.5 rounded-lg bg-rose-50/80 border border-rose-100 px-2 py-0.5">
                <span className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">
                  ID
                </span>
                <span className="text-sm text-ink/85 font-medium">{e.definition.indonesian}</span>
              </div>
            )}
            <p className="mt-2 text-sm text-ink/80 leading-relaxed">{e.definition.meaning}</p>
            {e.definition.synonyms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.definition.synonyms.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-violet-100 text-violet-800 px-2 py-0.5 text-[11px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-xl bg-white/70 border border-white/60 p-2 text-[12px] text-ink/70">
              <div className="italic">“{e.definition.exampleSentence}”</div>
              {e.definition.indonesianExample && (
                <div className="mt-0.5 text-ink/55">“{e.definition.indonesianExample}”</div>
              )}
            </div>
            {e.passageId && (
              <Link
                href={`/read/${e.passageId}`}
                className="mt-2 inline-block text-[11px] text-violet-700 hover:underline"
              >
                from passage →
              </Link>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
