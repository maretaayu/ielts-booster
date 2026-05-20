"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  Attempt,
  IeltsBand,
  MockSectionId,
  MockTestSession,
  SpeakingSession,
} from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";
import { bandColor, cn, formatBand } from "@/lib/utils";

const SECTION_META: Record<
  MockSectionId,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  listening: {
    label: "Listening",
    icon: <Headphones className="h-4 w-4" />,
    color: "#10b981",
    bg: "bg-emerald-50",
  },
  reading: {
    label: "Reading",
    icon: <BookOpen className="h-4 w-4" />,
    color: "#f59e0b",
    bg: "bg-amber-50",
  },
  writing: {
    label: "Writing",
    icon: <PenLine className="h-4 w-4" />,
    color: "#f43f5e",
    bg: "bg-rose-50",
  },
  speaking: {
    label: "Speaking",
    icon: <Mic className="h-4 w-4" />,
    color: "#8b5cf6",
    bg: "bg-violet-50",
  },
};

const SECTION_IDS: MockSectionId[] = ["listening", "reading", "writing", "speaking"];

export default function Report() {
  const [mocks, setMocks] = useState<MockTestSession[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [speaking, setSpeaking] = useState<SpeakingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getOrCreateUserId();
    Promise.allSettled([
      api.listMockTests(userId),
      api.listAttempts(userId),
      api.listSpeakingSessions(userId),
    ]).then(([m, a, s]) => {
      if (m.status === "fulfilled") setMocks(m.value.sessions);
      if (a.status === "fulfilled") setAttempts(a.value.attempts);
      if (s.status === "fulfilled") setSpeaking(s.value.sessions);
      setLoading(false);
    });
  }, []);

  const completedMocks = useMemo(
    () =>
      mocks
        .filter((m) => m.status === "completed")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [mocks],
  );

  return (
    <div className="mx-auto max-w-md sm:max-w-2xl px-6 pt-7 pb-32 sm:pb-28">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report</h1>
          <p className="mt-0.5 text-sm text-ink/55">
            Your IELTS band trajectory, section by section.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </div>
      ) : completedMocks.length === 0 ? (
        <EmptyReport />
      ) : (
        <>
          <OverallCard mocks={completedMocks} />
          <SectionGrid mocks={completedMocks} />
          <InsightsCard mocks={completedMocks} />
          <RecentMocks mocks={completedMocks} />
        </>
      )}

      <PracticeHistory loading={loading} attempts={attempts} speaking={speaking} />

      <BottomNav active="history" />
    </div>
  );
}

function EmptyReport() {
  return (
    <section className="mt-8 rounded-3xl bg-gradient-to-br from-violet-50 via-fuchsia-50 to-rose-50 border border-white/60 shadow-soft p-6 text-center">
      <div className="h-12 w-12 mx-auto rounded-2xl bg-ink text-white flex items-center justify-center">
        <ClipboardCheck className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight">No mocks yet</h2>
      <p className="mt-1 text-sm text-ink/60 max-w-xs mx-auto">
        Take a full mock test to start tracking your overall and section-by-section band over time.
      </p>
      <Link
        href="/mock"
        className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ink text-white font-semibold"
      >
        Take a mock test
      </Link>
    </section>
  );
}

function OverallCard({ mocks }: { mocks: MockTestSession[] }) {
  const series = mocks
    .map((m) => m.overallBand)
    .filter((b): b is IeltsBand => typeof b === "number");
  const latest = series[series.length - 1];
  const prev = series[series.length - 2];
  const delta = latest != null && prev != null ? latest - prev : null;
  const avg = series.length > 0 ? series.reduce<number>((s, b) => s + b, 0) / series.length : null;
  const best = series.length > 0 ? Math.max(...series) : null;

  return (
    <section className="mt-6 rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          Overall band
        </div>
        <div className="text-[11px] text-ink/55">{mocks.length} mock{mocks.length === 1 ? "" : "s"}</div>
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-5xl font-bold tracking-tight", latest != null && bandColor(latest))}>
              {latest != null ? formatBand(latest) : "—"}
            </span>
            {delta != null && delta !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-sm font-semibold",
                  delta > 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {(delta > 0 ? "+" : "") + delta.toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-ink/55">
            {avg != null && best != null
              ? `Avg ${formatBand(avg)} · Best ${formatBand(best)}`
              : "Take more mocks to see your trend"}
          </div>
        </div>
        <LineChart values={series} color="#8b5cf6" width={220} height={68} />
      </div>
    </section>
  );
}

function SectionGrid({ mocks }: { mocks: MockTestSession[] }) {
  return (
    <section className="mt-4 grid grid-cols-2 gap-3">
      {SECTION_IDS.map((sid) => (
        <SectionPanel key={sid} mocks={mocks} sectionId={sid} />
      ))}
    </section>
  );
}

function SectionPanel({
  mocks,
  sectionId,
}: {
  mocks: MockTestSession[];
  sectionId: MockSectionId;
}) {
  const meta = SECTION_META[sectionId];
  const series = mocks
    .map((m) => m.sections[sectionId]?.band)
    .filter((b): b is IeltsBand => typeof b === "number");
  const latest = series[series.length - 1];
  const prev = series[series.length - 2];
  const delta = latest != null && prev != null ? latest - prev : null;

  return (
    <div className={cn("rounded-2xl p-4 border border-white/60 shadow-soft", meta.bg)}>
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-ink/65">
          <span className="h-6 w-6 rounded-lg bg-white/80 flex items-center justify-center">
            {meta.icon}
          </span>
          {meta.label}
        </div>
        {delta != null && delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5",
              delta > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
            )}
          >
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {(delta > 0 ? "+" : "") + delta.toFixed(1)}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div
          className={cn(
            "text-3xl font-bold tracking-tight tabular-nums",
            latest != null ? bandColor(latest) : "text-ink/40",
          )}
        >
          {latest != null ? formatBand(latest) : "—"}
        </div>
        <LineChart values={series} color={meta.color} width={84} height={36} hideEndDot />
      </div>
      <div className="mt-1.5 text-[10px] text-ink/55">
        {series.length === 0
          ? "no data"
          : series.length === 1
            ? "from 1 mock"
            : `from ${series.length} mocks`}
      </div>
    </div>
  );
}

function InsightsCard({ mocks }: { mocks: MockTestSession[] }) {
  const insights = useMemo(() => buildInsights(mocks), [mocks]);
  if (insights.length === 0) return null;

  return (
    <section className="mt-4 rounded-3xl bg-white border border-black/[0.06] shadow-soft p-5">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Insights
      </div>
      <ul className="mt-3 space-y-2 text-sm text-ink/80 leading-snug">
        {insights.map((line, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function buildInsights(mocks: MockTestSession[]): string[] {
  if (mocks.length < 1) return [];
  const insights: string[] = [];

  // Pull latest section bands from the most recent mock with overall.
  const latest = mocks[mocks.length - 1];
  if (!latest) return [];

  const sectionLatest: Array<{ id: MockSectionId; band: number }> = [];
  for (const sid of SECTION_IDS) {
    const b = latest.sections[sid]?.band;
    if (typeof b === "number") sectionLatest.push({ id: sid, band: b });
  }
  if (sectionLatest.length === 4) {
    const sorted = [...sectionLatest].sort((a, b) => b.band - a.band);
    const top = sorted[0]!;
    const bottom = sorted[sorted.length - 1]!;
    insights.push(
      `Your strongest section right now is ${SECTION_META[top.id].label} (${formatBand(top.band)}). Your weakest is ${SECTION_META[bottom.id].label} (${formatBand(bottom.band)}) — that's the highest-leverage place to drill next.`,
    );
  }

  // Per-section trend over last 3 mocks.
  if (mocks.length >= 2) {
    const window = mocks.slice(-3);
    for (const sid of SECTION_IDS) {
      const series = window
        .map((m) => m.sections[sid]?.band)
        .filter((b): b is IeltsBand => typeof b === "number");
      if (series.length < 2) continue;
      const first = series[0]!;
      const last = series[series.length - 1]!;
      const delta = last - first;
      if (Math.abs(delta) >= 0.5) {
        const verb = delta > 0 ? "improved by" : "dropped by";
        insights.push(
          `${SECTION_META[sid].label} ${verb} ${Math.abs(delta).toFixed(1)} over the last ${series.length} mocks.`,
        );
      }
    }
  }

  // Overall trend
  const overall = mocks.map((m) => m.overallBand).filter((b): b is IeltsBand => typeof b === "number");
  if (overall.length >= 3) {
    const first3 = overall.slice(0, Math.min(3, overall.length - 3 || 1));
    const last3 = overall.slice(-3);
    const avgFirst = first3.reduce<number>((s, b) => s + b, 0) / first3.length;
    const avgLast = last3.reduce<number>((s, b) => s + b, 0) / last3.length;
    const diff = avgLast - avgFirst;
    if (Math.abs(diff) >= 0.5) {
      insights.push(
        diff > 0
          ? `Your overall band is trending up — averaging ${formatBand(avgLast)} in your recent mocks (vs ${formatBand(avgFirst)} earlier).`
          : `Your overall band has dipped slightly to an average ${formatBand(avgLast)} (from ${formatBand(avgFirst)}). Worth reviewing what changed.`,
      );
    }
  }

  return insights.slice(0, 4);
}

function RecentMocks({ mocks }: { mocks: MockTestSession[] }) {
  const recent = [...mocks].reverse().slice(0, 5);
  if (recent.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-sm font-bold tracking-tight">Recent mocks</h3>
        <Link href="/mock" className="text-[11px] text-ink/55">
          All mocks
        </Link>
      </div>
      <ul className="bg-white rounded-3xl border border-black/[0.06] shadow-soft divide-y divide-black/[0.05] overflow-hidden">
        {recent.map((m) => (
          <li key={m.id}>
            <Link
              href={`/mock/${m.id}/result`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition"
            >
              <div className="h-9 w-9 rounded-xl bg-stone-50 flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-4 w-4 text-ink/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">Full mock test</div>
                <div className="text-[11px] text-ink/50 mt-0.5">
                  {new Date(m.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              {m.overallBand != null && (
                <span
                  className={cn(
                    "text-lg font-bold tracking-tight tabular-nums",
                    bandColor(m.overallBand),
                  )}
                >
                  {formatBand(m.overallBand)}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-ink/30 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PracticeHistory({
  loading,
  attempts,
  speaking,
}: {
  loading: boolean;
  attempts: Attempt[];
  speaking: SpeakingSession[];
}) {
  const items = useMemo(() => {
    const w = attempts.map((a) => ({
      kind: "writing" as const,
      id: a.id,
      title: a.promptSnapshot.title,
      createdAt: a.createdAt,
      band: a.result?.overallBand ?? null,
    }));
    const s = speaking.map((sess) => ({
      kind: "speaking" as const,
      id: sess.id,
      title: sess.topicSnapshot.title,
      createdAt: sess.createdAt,
      band: sess.score?.overallBand ?? null,
    }));
    return [...w, ...s]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
  }, [attempts, speaking]);

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="text-sm font-bold tracking-tight">Other practice</h3>
        <div className="text-[11px] text-ink/55">{items.length} most recent</div>
      </div>
      <ul className="bg-white rounded-3xl border border-black/[0.06] shadow-soft divide-y divide-black/[0.05] overflow-hidden">
        {items.map((it) => (
          <li key={`${it.kind}:${it.id}`}>
            <Link
              href={it.kind === "writing" ? `/result/${it.id}` : `/speak/result/${it.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition"
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                  it.kind === "writing"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-violet-100 text-violet-700",
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
                  })}{" "}
                  · {it.kind}
                </div>
              </div>
              {it.band != null ? (
                <span className={cn("text-lg font-bold tracking-tight", bandColor(it.band))}>
                  {formatBand(it.band)}
                </span>
              ) : (
                <span className="text-[11px] text-ink/40 italic">no score</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Compact line chart with area fill, designed for tiny inline use. */
function LineChart({
  values,
  color,
  width = 200,
  height = 60,
  hideEndDot = false,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  hideEndDot?: boolean;
}) {
  if (values.length < 2) {
    return (
      <div
        className="rounded-md bg-stone-100"
        style={{ width, height }}
        aria-label="not enough data"
      />
    );
  }
  const P = 4;
  const min = Math.min(...values) - 0.25;
  const max = Math.max(...values) + 0.25;
  const range = max - min || 1;
  const xs = values.map((_, i) => P + ((width - P * 2) * i) / (values.length - 1));
  const ys = values.map((v) => height - P - ((height - P * 2) * (v - min)) / range);
  const path = values.map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys[i]}`).join(" ");
  const area = `${path} L ${xs[xs.length - 1]} ${height} L ${xs[0]} ${height} Z`;
  const fillId = `fill-${color.replace("#", "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!hideEndDot && (
        <circle
          cx={xs[xs.length - 1]}
          cy={ys[ys.length - 1]}
          r={3}
          fill={color}
          stroke="white"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}
