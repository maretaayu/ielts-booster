"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronRight,
  Mic,
  PenLine,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { Attempt, SpeakingSession, StudyPlan, UserProfile } from "@ielts/shared";
import {
  api,
  getActivePlanId,
  getOrCreateUserId,
  isOnboarded,
} from "@/lib/api";
import { bandColor, cn, formatBand } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";

type LoadState<T> = { status: "loading" | "ready" | "error"; data: T | null };

function useLoad<T>(fn: () => Promise<T> | null): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading", data: null });
  useEffect(() => {
    let cancelled = false;
    const p = fn();
    if (!p) {
      setState({ status: "ready", data: null });
      return;
    }
    p.then((d) => {
      if (!cancelled) setState({ status: "ready", data: d });
    }).catch(() => {
      if (!cancelled) setState({ status: "error", data: null });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

export default function Home() {
  const onboarded = typeof window !== "undefined" ? isOnboarded() : true;
  const userId = typeof window !== "undefined" ? getOrCreateUserId() : "anon";
  const planId = typeof window !== "undefined" ? getActivePlanId() : null;

  const profile = useLoad<UserProfile | null>(() => (onboarded ? api.getProfile(userId) : null));
  const plan = useLoad<StudyPlan | null>(() =>
    onboarded && planId ? api.getStudyPlan(planId) : null,
  );
  const attempts = useLoad<{ attempts: Attempt[] } | null>(() =>
    onboarded ? api.listAttempts(userId) : null,
  );
  const speaking = useLoad<{ sessions: SpeakingSession[] } | null>(() =>
    onboarded ? api.listSpeakingSessions(userId) : null,
  );

  return (
    <div className="mx-auto max-w-md sm:max-w-lg px-6 pt-7 pb-32 sm:pb-28">
      <TopBar name={profile.data?.name} />
      <ContinueCard profileState={profile} planState={plan} />
      <ProgressCard
        attempts={attempts.data?.attempts ?? []}
        sessions={speaking.data?.sessions ?? []}
        ready={attempts.status !== "loading" && speaking.status !== "loading"}
      />
      <PracticeGrid />
      <RecentStrip
        attempts={attempts.data?.attempts ?? []}
        sessions={speaking.data?.sessions ?? []}
        ready={attempts.status !== "loading" && speaking.status !== "loading"}
      />
      <BottomNav active="home" />
    </div>
  );
}

function TopBar({ name }: { name?: string }) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <header className="flex items-center justify-between">
      <Link href="/profile" className="flex items-center gap-3 min-w-0 group">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-300 via-fuchsia-300 to-rose-300 flex items-center justify-center text-white font-semibold text-lg shadow-soft shrink-0 ring-2 ring-white group-active:scale-95 transition">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-ink/45 leading-tight">Hey,</div>
          <div className="text-base font-semibold leading-tight truncate">
            {name ?? "Student"}
          </div>
        </div>
      </Link>
      <button
        aria-label="Notifications"
        className="h-11 w-11 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-soft relative"
      >
        <Bell className="h-4 w-4 text-ink/70" />
        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500" />
      </button>
    </header>
  );
}


function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysUntil(yyyyMmDd?: string): number | null {
  if (!yyyyMmDd) return null;
  const target = new Date(yyyyMmDd + "T00:00:00").getTime();
  const today = new Date(localDateString() + "T00:00:00").getTime();
  return Math.max(0, Math.round((target - today) / 86_400_000));
}

function ContinueCard({
  profileState,
  planState,
}: {
  profileState: LoadState<UserProfile | null>;
  planState: LoadState<StudyPlan | null>;
}) {
  const profile = profileState.data;
  const plan = planState.data;

  const today = useMemo(() => {
    if (!plan) return null;
    const todayStr = localDateString();
    return (
      plan.days.find((d) => d.date === todayStr) ??
      plan.days.find((d) => d.date >= todayStr) ??
      plan.days[0] ??
      null
    );
  }, [plan]);

  const progressPct = useMemo(() => {
    if (!plan) return 0;
    const total = plan.days.length;
    if (!total) return 0;
    const todayStr = localDateString();
    const completed = plan.days.filter((d) => d.date < todayStr).length;
    return Math.round((completed / total) * 100);
  }, [plan]);

  const firstTask = today?.tasks[0];
  const taskHref = firstTask ? skillHref(firstTask.skill) : plan ? `/plan/${plan.id}` : "/plan";
  const days = daysUntil(profile?.examDate);

  return (
    <section className="mt-7">
      <Link
        href={taskHref}
        className="relative block rounded-[24px] p-5 bg-violet-200/70 border border-white/60 shadow-soft active:scale-[0.99] transition overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-violet-300/60 blur-2xl" />
          <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-rose-200/60 blur-2xl" />
        </div>

        <div className="relative flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
            Continue
          </div>
          {progressPct > 0 && (
            <div className="text-xs font-semibold text-ink/70 bg-white/80 rounded-full px-2.5 py-0.5">
              {progressPct}%
            </div>
          )}
        </div>

        <div className="relative mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-ink/55 truncate">
              {today ? `Day ${today.dayIndex} · ${today.focus}` : "Your study plan"}
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-bold leading-snug tracking-tight line-clamp-2">
              {firstTask?.title ?? (plan ? "Open today's plan" : "Create your plan")}
            </h2>
            <div className="mt-2 text-[11px] text-ink/55">
              {firstTask
                ? `${firstTask.estimatedMinutes} min · ${labelForSkill(firstTask.skill)}`
                : null}
              {firstTask && days !== null ? " · " : ""}
              {days !== null ? `${days} ${days === 1 ? "day" : "days"} to exam` : ""}
            </div>
          </div>
          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-ink text-white shrink-0">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </section>
  );
}

function PracticeGrid() {
  const items = [
    {
      href: "/write",
      label: "Writing",
      hint: "Band-scored essays",
      icon: <PenLine className="h-5 w-5" />,
      bg: "bg-amber-100",
    },
    {
      href: "/read",
      label: "Reading",
      hint: "Tap-to-define passages",
      icon: <BookOpen className="h-5 w-5" />,
      bg: "bg-emerald-100",
    },
    {
      href: "/speak",
      label: "Speaking",
      hint: "Voice mock interview",
      icon: <Mic className="h-5 w-5" />,
      bg: "bg-violet-100",
    },
    {
      href: "/review",
      label: "Vocab",
      hint: "Spaced repetition",
      icon: <Sparkles className="h-5 w-5" />,
      bg: "bg-rose-100",
    },
  ];

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight">Top practice</h3>
        <Link href="/plan" className="text-xs font-medium text-ink/55 hover:text-ink">
          See plan →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "group relative rounded-[26px] p-5 border border-white/60 shadow-soft active:scale-[0.98] transition overflow-hidden min-h-[140px] flex flex-col justify-between",
              it.bg,
            )}
          >
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center text-ink bg-white">
              {it.icon}
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">{it.label}</div>
              <div className="text-xs text-ink/55 mt-0.5">{it.hint}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

type ScoredItem = {
  kind: "writing" | "speaking";
  id: string;
  title: string;
  createdAt: string;
  band: number;
};

function collectScored(attempts: Attempt[], sessions: SpeakingSession[]): ScoredItem[] {
  const w: ScoredItem[] = attempts
    .filter((a) => a.status === "graded" && a.result)
    .map((a) => ({
      kind: "writing" as const,
      id: a.id,
      title: a.promptSnapshot.title,
      createdAt: a.createdAt,
      band: a.result!.overallBand,
    }));
  const s: ScoredItem[] = sessions
    .filter((sess) => sess.status === "scored" && sess.score)
    .map((sess) => ({
      kind: "speaking" as const,
      id: sess.id,
      title: sess.topicSnapshot.title,
      createdAt: sess.createdAt,
      band: sess.score!.overallBand,
    }));
  return [...w, ...s].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function ProgressCard({
  attempts,
  sessions,
  ready,
}: {
  attempts: Attempt[];
  sessions: SpeakingSession[];
  ready: boolean;
}) {
  const scored = useMemo(() => collectScored(attempts, sessions), [attempts, sessions]);
  const recent = scored.slice(-7);
  const latest = recent[recent.length - 1]?.band;
  const prev = recent[recent.length - 2]?.band;
  const delta = latest != null && prev != null ? latest - prev : null;
  const avg =
    recent.length > 0 ? recent.reduce((s, x) => s + x.band, 0) / recent.length : null;

  return (
    <section className="mt-5">
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
            Progress
          </div>
          <Link
            href="/dashboard"
            className="text-[11px] text-ink/55 inline-flex items-center gap-0.5"
          >
            History <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {!ready ? (
          <div className="h-16 rounded-xl bg-stone-100 animate-pulse" />
        ) : latest == null ? (
          <div className="py-3 text-sm text-ink/55">
            No graded attempts yet — start a session to see your trend.
          </div>
        ) : (
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] text-ink/55">Latest band</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className={cn("text-4xl font-bold tracking-tight", bandColor(latest))}>
                  {formatBand(latest)}
                </span>
                {delta != null && delta !== 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-xs font-semibold",
                      delta > 0 ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {delta > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {(delta > 0 ? "+" : "") + delta.toFixed(1)}
                  </span>
                )}
              </div>
              {avg != null && (
                <div className="mt-1 text-[11px] text-ink/55">
                  Avg {formatBand(avg)} over last {recent.length}
                </div>
              )}
            </div>
            <div className="shrink-0">
              <Sparkline values={recent.map((r) => r.band)} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <div className="h-10 w-28 rounded-md bg-stone-100" />;
  }
  const W = 112;
  const H = 40;
  const P = 4;
  const min = Math.min(...values) - 0.25;
  const max = Math.max(...values) + 0.25;
  const range = max - min || 1;
  const xs = values.map((_, i) => P + ((W - P * 2) * i) / (values.length - 1));
  const ys = values.map((v) => H - P - ((H - P * 2) * (v - min)) / range);
  const path = values.map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys[i]}`).join(" ");
  const area = `${path} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="#8b5cf6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={xs[xs.length - 1]}
        cy={ys[ys.length - 1]}
        r={3}
        fill="#8b5cf6"
        stroke="white"
        strokeWidth={2}
      />
    </svg>
  );
}

function RecentStrip({
  attempts,
  sessions,
  ready,
}: {
  attempts: Attempt[];
  sessions: SpeakingSession[];
  ready: boolean;
}) {
  const all = useMemo(() => {
    const w = attempts
      .filter((a) => a.status === "graded" && a.result)
      .map((a) => ({
        kind: "writing" as const,
        id: a.id,
        title: a.promptSnapshot.title,
        createdAt: a.createdAt,
        band: a.result!.overallBand,
      }));
    const s = sessions
      .filter((sess) => sess.status === "scored" && sess.score)
      .map((sess) => ({
        kind: "speaking" as const,
        id: sess.id,
        title: sess.topicSnapshot.title,
        createdAt: sess.createdAt,
        band: sess.score!.overallBand,
      }));
    return [...w, ...s]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
  }, [attempts, sessions]);

  if (!ready) {
    return (
      <section className="mt-8">
        <div className="h-32 rounded-3xl bg-white/55 animate-pulse" />
      </section>
    );
  }
  if (all.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-xl font-bold tracking-tight">Recent</h3>
        <Link href="/dashboard" className="text-xs font-medium text-ink/55 hover:text-ink">
          All →
        </Link>
      </div>
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-soft overflow-hidden">
        <ul className="divide-y divide-black/[0.05]">
          {all.map((it) => (
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
                    })}
                  </div>
                </div>
                <span className={cn("text-lg font-bold tracking-tight", bandColor(it.band))}>
                  {formatBand(it.band)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function skillHref(skill: string): string {
  switch (skill) {
    case "writing":
      return "/write";
    case "reading":
      return "/read";
    case "speaking":
      return "/speak";
    case "vocabulary":
      return "/review";
    case "grammar":
    case "listening":
    default:
      return "/dashboard";
  }
}

function labelForSkill(skill: string): string {
  switch (skill) {
    case "writing":
      return "Writing";
    case "reading":
      return "Reading";
    case "speaking":
      return "Speaking";
    case "listening":
      return "Listening";
    case "vocabulary":
      return "Vocab";
    case "grammar":
      return "Grammar";
    default:
      return skill;
  }
}
