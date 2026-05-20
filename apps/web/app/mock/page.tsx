"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  ShieldAlert,
} from "lucide-react";
import type { MockTestSession } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { bandColor, cn, formatBand } from "@/lib/utils";

const SECTION_PALETTE: Array<{
  key: "listening" | "reading" | "writing" | "speaking";
  label: string;
  minutes: number;
  icon: React.ReactNode;
  bg: string;
}> = [
  {
    key: "listening",
    label: "Listening",
    minutes: 30,
    icon: <Headphones className="h-4 w-4" />,
    bg: "bg-emerald-100",
  },
  {
    key: "reading",
    label: "Reading",
    minutes: 60,
    icon: <BookOpen className="h-4 w-4" />,
    bg: "bg-amber-100",
  },
  {
    key: "writing",
    label: "Writing",
    minutes: 60,
    icon: <PenLine className="h-4 w-4" />,
    bg: "bg-rose-100",
  },
  {
    key: "speaking",
    label: "Speaking",
    minutes: 14,
    icon: <Mic className="h-4 w-4" />,
    bg: "bg-violet-100",
  },
];

const TOTAL_MINUTES = SECTION_PALETTE.reduce((s, x) => s + x.minutes, 0);

export default function MockTestHome() {
  const router = useRouter();
  const [history, setHistory] = useState<MockTestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listMockTests(getOrCreateUserId())
      .then((r) => setHistory(r.sessions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function startMock() {
    setStarting(true);
    setError(null);
    try {
      const session = await api.startMockTest({ userId: getOrCreateUserId() });
      router.push(`/mock/${session.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  return (
    <AppShell
      greeting="Full mock test"
      subtitle={`Simulates the real exam: 4 timed sections, ~${Math.floor(TOTAL_MINUTES / 60)} h ${TOTAL_MINUTES % 60} min total. Once you start, sections auto-advance — no pause.`}
      active="practice"
    >
      <section className="rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5 sm:p-6">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          What you'll do
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SECTION_PALETTE.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "rounded-2xl p-3 border border-white/60 shadow-soft",
                s.bg,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="h-7 w-7 rounded-lg bg-white/80 flex items-center justify-center">
                  {s.icon}
                </span>
                <span className="text-[10px] font-mono tracking-wider text-ink/55">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold tracking-tight">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-ink/55 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {s.minutes} min
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            Strict exam simulation — you can't pause mid-section, and the timer keeps running if
            you close the tab. Find a quiet 2.5-hour block before starting.
          </div>
        </div>

        <button
          onClick={startMock}
          disabled={starting}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-ink text-white font-semibold disabled:opacity-50"
        >
          {starting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing your mock test…
            </>
          ) : (
            <>
              Start full mock test <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        {error && (
          <div className="mt-3 text-sm text-rose-700">{error}</div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-xl font-bold tracking-tight">Past attempts</h3>
        </div>
        {loading ? (
          <div className="h-24 rounded-3xl bg-white/60 animate-pulse" />
        ) : history.length === 0 ? (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 text-sm text-ink/60">
            You haven't taken a mock test yet — when you do, every attempt with its band trajectory
            will show up here.
          </div>
        ) : (
          <ul className="bg-white rounded-3xl border border-black/[0.06] shadow-soft divide-y divide-black/[0.05] overflow-hidden">
            {history.map((s) => (
              <li key={s.id}>
                <Link
                  href={
                    s.status === "completed" ? `/mock/${s.id}/result` : `/mock/${s.id}`
                  }
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50 transition"
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                      s.status === "completed"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {s.status === "completed" ? (
                      <span className="text-xs font-bold">✓</span>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">
                      {s.status === "completed" ? "Completed mock" : "In progress"}
                    </div>
                    <div className="text-[11px] text-ink/50 mt-0.5">
                      {new Date(s.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  {s.overallBand != null && (
                    <span
                      className={cn(
                        "text-lg font-bold tracking-tight",
                        bandColor(s.overallBand),
                      )}
                    >
                      {formatBand(s.overallBand)}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-ink/30" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
