"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Mic, PenLine } from "lucide-react";
import type { Attempt, SpeakingSession } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";
import { bandColor, cn, formatBand } from "@/lib/utils";

type HistoryItem =
  | {
      kind: "writing";
      id: string;
      title: string;
      createdAt: string;
      band: number | null;
      meta: string;
    }
  | {
      kind: "speaking";
      id: string;
      title: string;
      createdAt: string;
      band: number | null;
      meta: string;
    };

export default function History() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [speaking, setSpeaking] = useState<SpeakingSession[]>([]);
  const [filter, setFilter] = useState<"all" | "writing" | "speaking">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getOrCreateUserId();
    Promise.allSettled([api.listAttempts(userId), api.listSpeakingSessions(userId)]).then(
      ([a, s]) => {
        if (a.status === "fulfilled") setAttempts(a.value.attempts);
        if (s.status === "fulfilled") setSpeaking(s.value.sessions);
        setLoading(false);
      },
    );
  }, []);

  const items = useMemo<HistoryItem[]>(() => {
    const w: HistoryItem[] = attempts.map((a) => ({
      kind: "writing" as const,
      id: a.id,
      title: a.promptSnapshot.title,
      createdAt: a.createdAt,
      band: a.result?.overallBand ?? null,
      meta:
        a.status === "graded"
          ? `${a.wordCount} words`
          : a.status === "grading"
            ? "Grading…"
            : a.status,
    }));
    const s: HistoryItem[] = speaking.map((sess) => ({
      kind: "speaking" as const,
      id: sess.id,
      title: sess.topicSnapshot.title,
      createdAt: sess.createdAt,
      band: sess.score?.overallBand ?? null,
      meta:
        sess.status === "scored"
          ? `${Math.round(sess.totalSeconds / 60)} min · ${sess.topicSnapshot.part.toUpperCase()}`
          : sess.status === "scoring"
            ? "Scoring…"
            : sess.status,
    }));
    const all = [...w, ...s].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter === "writing") return all.filter((i) => i.kind === "writing");
    if (filter === "speaking") return all.filter((i) => i.kind === "speaking");
    return all;
  }, [attempts, speaking, filter]);

  const graded = items.filter((i) => i.band != null);
  const avg =
    graded.length > 0 ? graded.reduce((s, i) => s + (i.band ?? 0), 0) / graded.length : 0;
  const latest = graded[0]?.band ?? null;

  return (
    <div className="mx-auto max-w-md sm:max-w-lg px-6 pt-7 pb-32 sm:pb-28">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <div className="text-xs text-ink/55">{items.length} entries</div>
      </header>

      {/* Headline stats */}
      <section className="mt-5 grid grid-cols-3 gap-2">
        <StatCell label="Latest" value={latest != null ? formatBand(latest) : "—"} tone={latest != null ? bandColor(latest) : ""} />
        <StatCell label="Average" value={graded.length ? formatBand(avg) : "—"} tone={graded.length ? bandColor(avg) : ""} />
        <StatCell label="Total" value={String(items.length)} />
      </section>

      {/* Filter chips */}
      <section className="mt-5 flex gap-2">
        {(["all", "writing", "speaking"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium border transition capitalize",
              filter === f
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink/70 border-black/[0.08] hover:bg-stone-50",
            )}
          >
            {f}
          </button>
        ))}
      </section>

      {/* List */}
      <section className="mt-4 bg-white rounded-3xl border border-black/[0.06] shadow-soft overflow-hidden">
        {loading && <div className="p-6 text-sm text-ink/50">Loading…</div>}
        {!loading && items.length === 0 && (
          <div className="p-8 text-center text-sm text-ink/55">
            No attempts yet.
            <div className="mt-3 flex gap-2 justify-center">
              <Link href="/write" className="btn-pill text-xs px-4 py-2">
                Try writing
              </Link>
              <Link href="/speak" className="btn-pill-ghost text-xs px-4 py-2">
                Try speaking
              </Link>
            </div>
          </div>
        )}
        <ul className="divide-y divide-black/[0.05]">
          {items.map((it) => (
            <li key={`${it.kind}:${it.id}`}>
              <Link
                href={it.kind === "writing" ? `/result/${it.id}` : `/speak/result/${it.id}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition"
              >
                <div
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                    it.kind === "writing"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700",
                  )}
                >
                  {it.kind === "writing" ? (
                    <PenLine className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink truncate">{it.title}</div>
                  <div className="text-[11px] text-ink/50 mt-0.5">
                    {new Date(it.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {it.meta}
                  </div>
                </div>
                {it.band != null ? (
                  <span className={cn("text-xl font-bold tracking-tight", bandColor(it.band))}>
                    {formatBand(it.band)}
                  </span>
                ) : (
                  <span className="text-[11px] text-ink/40 italic">no score</span>
                )}
                <ChevronRight className="h-4 w-4 text-ink/30 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <BottomNav active="history" />
    </div>
  );
}

function StatCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-soft p-3">
      <div className="text-[10px] uppercase tracking-wider text-ink/45">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tracking-tight", tone || "text-ink")}>
        {value}
      </div>
    </div>
  );
}
