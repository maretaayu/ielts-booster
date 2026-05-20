"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  Sparkles,
} from "lucide-react";
import type { MockSectionId, MockTestSession } from "@ielts/shared";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { bandColor, cn, formatBand } from "@/lib/utils";

const META: Record<
  MockSectionId,
  { label: string; icon: React.ReactNode; resultHref: (id?: string) => string | null }
> = {
  listening: {
    label: "Listening",
    icon: <Headphones className="h-4 w-4" />,
    resultHref: () => null,
  },
  reading: {
    label: "Reading",
    icon: <BookOpen className="h-4 w-4" />,
    resultHref: () => null,
  },
  writing: {
    label: "Writing",
    icon: <PenLine className="h-4 w-4" />,
    resultHref: (id) => (id ? `/result/${id}` : null),
  },
  speaking: {
    label: "Speaking",
    icon: <Mic className="h-4 w-4" />,
    resultHref: (id) => (id ? `/speak/result/${id}` : null),
  },
};

export default function MockResultPage() {
  const params = useParams<{ id: string }>();
  const [mock, setMock] = useState<MockTestSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMockTest(params.id).then(setMock).catch((e) => setError(e.message));
  }, [params.id]);

  const sectionRows = useMemo(() => {
    if (!mock) return [];
    return (Object.keys(META) as MockSectionId[]).map((s) => {
      const state = mock.sections[s];
      const attemptId =
        s === "writing"
          ? state.writingAttemptId
          : s === "speaking"
            ? state.speakingSessionId
            : undefined;
      return {
        id: s,
        label: META[s].label,
        icon: META[s].icon,
        band: state.band ?? null,
        raw:
          state.rawScore != null && state.rawTotal != null
            ? `${state.rawScore} / ${state.rawTotal}`
            : null,
        href: META[s].resultHref(attemptId),
      };
    });
  }, [mock]);

  if (error) {
    return (
      <AppShell back="/mock" greeting="Result unavailable">
        <div className="rounded-2xl bg-rose-100 border border-rose-200 p-4 text-rose-800">
          {error}
        </div>
      </AppShell>
    );
  }
  if (!mock) {
    return (
      <AppShell back="/mock" greeting="Loading…">
        <div className="flex items-center gap-2 text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching your mock result…
        </div>
      </AppShell>
    );
  }

  const overall = mock.overallBand;

  return (
    <AppShell back="/mock" greeting="Mock test result" active="practice">
      <section className="rounded-3xl bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-50 border border-white/60 shadow-soft p-6">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          Overall band
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span
            className={cn(
              "text-6xl font-bold tracking-tight",
              overall != null && bandColor(overall),
            )}
          >
            {overall != null ? formatBand(overall) : "—"}
          </span>
          <span className="text-sm text-ink/55">
            averaged from all 4 sections, rounded to the nearest 0.5
          </span>
        </div>
        <div className="mt-2 text-xs text-ink/55">
          {mock.completedAt
            ? `Completed ${new Date(mock.completedAt).toLocaleString()}`
            : "Not yet completed"}
        </div>
      </section>

      <section className="mt-6 rounded-3xl bg-white border border-black/[0.06] shadow-soft overflow-hidden">
        <ul className="divide-y divide-black/[0.05]">
          {sectionRows.map((row) => {
            const Row = (
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="h-10 w-10 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                  {row.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink">{row.label}</div>
                  <div className="text-[11px] text-ink/55 mt-0.5">
                    {row.raw ? `${row.raw} correct` : null}
                    {row.raw && row.href ? " · " : null}
                    {row.href ? "Full feedback available" : null}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xl font-bold tracking-tight tabular-nums",
                    row.band != null ? bandColor(row.band) : "text-ink/30",
                  )}
                >
                  {row.band != null ? formatBand(row.band) : "—"}
                </span>
                {row.href && <ArrowRight className="h-4 w-4 text-ink/40" />}
              </div>
            );
            return (
              <li key={row.id}>
                {row.href ? (
                  <Link href={row.href} className="hover:bg-stone-50 block">
                    {Row}
                  </Link>
                ) : (
                  Row
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5 text-sm text-ink/70 leading-relaxed">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          <Sparkles className="h-3.5 w-3.5" /> What to do next
        </div>
        <p className="mt-2">
          Open each section's detailed feedback above. Your weakest section is the one to target
          for the next study block — head to the{" "}
          <Link href="/plan" className="text-violet-600 font-semibold">
            study plan
          </Link>{" "}
          to schedule focused practice this week.
        </p>
      </section>

      <div className="mt-6 flex gap-3">
        <Link
          href="/mock"
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-2xl border border-black/[0.08] bg-white text-ink/80 font-semibold"
        >
          All mock tests
        </Link>
        <Link
          href="/dashboard"
          className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-2xl bg-ink text-white font-semibold"
        >
          Band trajectory
        </Link>
      </div>
    </AppShell>
  );
}
