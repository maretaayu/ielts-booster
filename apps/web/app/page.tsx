"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  Flame,
  Mic,
  MoreHorizontal,
  PenLine,
  Play,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import type {
  Attempt,
  MockTestSession,
  SpeakingSession,
  StudyPlan,
  UserProfile,
} from "@ielts/shared";
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
  const [hydrated, setHydrated] = useState(false);
  const [showPlanReady, setShowPlanReady] = useState(false);
  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome") !== "plan-ready") return;
    setShowPlanReady(true);
    url.searchParams.delete("welcome");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
  }, [hydrated]);

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
  const mocks = useLoad<{ sessions: MockTestSession[] } | null>(() =>
    onboarded ? api.listMockTests(userId) : null,
  );

  // Don't flash the empty "Hey, Student" shell while OnboardingGate is still
  // deciding whether to redirect to /onboarding.
  if (hydrated && !onboarded) {
    return <div className="mx-auto max-w-md px-6 pt-20 text-center text-ink/40 text-sm">Redirecting…</div>;
  }

  const placementBand = normalizeBand(
    profile.data?.placement?.estimatedBand ?? profile.data?.currentBand,
    5.5,
  );
  const targetBand = normalizeBand(profile.data?.targetBand, 7.0);
  const totalExercises =
    (attempts.data?.attempts.length ?? 0) +
    (speaking.data?.sessions.length ?? 0) +
    (mocks.data?.sessions.filter((m) => m.status === "completed").length ?? 0);

  return (
    <div className="mx-auto max-w-md sm:max-w-lg px-4 pt-5 pb-32 sm:pb-28">
      {showPlanReady ? <PlanReadyOverlay onClose={() => setShowPlanReady(false)} /> : null}
      <TopBar
        name={profile.data?.name}
        targetBand={targetBand}
        daysToExam={daysUntil(profile.data?.examDate)}
      />
      <GamifiedProgressCard
        placementBand={placementBand}
        targetBand={targetBand}
        totalExercises={totalExercises}
        mocks={mocks.data?.sessions ?? []}
        ready={mocks.status !== "loading"}
      />
      <YourPlanCard profileState={profile} planState={plan} />
      <PracticeGrid />
      <MockTestCTA />
      <RecentStrip
        attempts={attempts.data?.attempts ?? []}
        sessions={speaking.data?.sessions ?? []}
        ready={attempts.status !== "loading" && speaking.status !== "loading"}
      />
      <BottomNav active="home" />
    </div>
  );
}

function PlanReadyOverlay({ onClose }: { onClose: () => void }) {
  const confetti = [
    { left: 10, delay: 0, duration: 3.8, color: "#f0abfc", size: 9 },
    { left: 18, delay: 0.4, duration: 4.5, color: "#fde68a", size: 7 },
    { left: 27, delay: 0.9, duration: 4.1, color: "#c4b5fd", size: 8 },
    { left: 36, delay: 0.2, duration: 4.8, color: "#ffffff", size: 6 },
    { left: 48, delay: 0.7, duration: 3.9, color: "#f0abfc", size: 10 },
    { left: 58, delay: 1.1, duration: 4.3, color: "#fde68a", size: 7 },
    { left: 69, delay: 0.5, duration: 4.6, color: "#c4b5fd", size: 9 },
    { left: 81, delay: 1.3, duration: 4.0, color: "#ffffff", size: 6 },
    { left: 91, delay: 0.8, duration: 4.9, color: "#f0abfc", size: 8 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050008] px-5 overflow-hidden">
      <div
        aria-hidden
        className="absolute left-1/2 top-[-18%] h-[58vw] w-[78vw] -translate-x-1/2 rounded-full bg-[#7e22ce] opacity-75 blur-[95px]"
      />
      <div
        aria-hidden
        className="absolute bottom-[-18%] left-[-10%] h-[70vw] w-[70vw] rounded-full bg-[#4c1d95] opacity-65 blur-[120px]"
      />
      <div
        aria-hidden
        className="absolute right-[-12%] top-[18%] h-[52vw] w-[52vw] rounded-full bg-[#c026d3] opacity-45 blur-[105px]"
      />
      {confetti.map((piece, index) => (
        <span
          key={index}
          aria-hidden
          className="plan-confetti absolute top-[-24px] rounded-[3px]"
          style={{
            left: `${piece.left}%`,
            height: piece.size,
            width: piece.size * 0.68,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}

      <div className="relative w-full max-w-sm text-center text-white">
        <div className="relative mx-auto h-[230px] w-[280px]">
          <div className="absolute left-1/2 top-[70px] h-[120px] w-[160px] -translate-x-1/2 rotate-[-8deg] rounded-[28px] bg-white shadow-[0_28px_55px_rgba(0,0,0,0.36)]" />
          <div className="absolute left-1/2 top-[52px] h-[150px] w-[190px] -translate-x-1/2 rotate-[8deg] rounded-[32px] border border-white/10 bg-gradient-to-br from-fuchsia-400/24 to-indigo-500/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative animate-[bob_3.4s_ease-in-out_infinite]">
              <div className="absolute inset-0 rounded-full bg-fuchsia-300/30 blur-2xl" />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-violet-500 shadow-[0_18px_40px_rgba(124,58,237,0.35)]">
                <Sparkles className="h-14 w-14 text-white drop-shadow" />
              </div>
            </div>
          </div>
          <Star className="absolute right-14 top-8 h-6 w-6 fill-amber-300 text-amber-300 drop-shadow" />
          <Sparkles className="absolute left-12 top-20 h-5 w-5 text-fuchsia-200" />
          <Trophy className="absolute bottom-7 right-12 h-8 w-8 text-amber-200" />
        </div>

        <h1 className="mt-2 text-[2.35rem] font-black leading-[1.02] tracking-tight">
          Lesson plan ready.
        </h1>
        <p className="mx-auto mt-4 max-w-[280px] text-[15px] font-semibold leading-relaxed text-white/70">
          Your first lesson path is waiting on the homepage.
        </p>

        <button
          onClick={onClose}
          className="mt-10 w-full rounded-full bg-white px-6 py-[1.15rem] text-[15px] font-extrabold tracking-tight text-[#11051c] shadow-lg shadow-white/10 transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0"
        >
          Explore my plan
        </button>
      </div>
    </div>
  );
}

function TopBar({
  name,
  targetBand,
  daysToExam,
}: {
  name?: string;
  targetBand: number;
  daysToExam: number | null;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <header className="flex items-center justify-between">
      <Link href="/profile" className="flex items-center gap-3 min-w-0 group">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-300 via-indigo-300 to-violet-400 flex items-center justify-center text-white font-semibold text-lg shadow-soft shrink-0 ring-2 ring-white group-active:scale-95 transition">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-ink/45 leading-tight">
            Target {formatBand(targetBand)}
            {daysToExam !== null ? ` · ${daysToExam}d left` : ""}
          </div>
          <div className="text-2xl font-bold leading-tight tracking-tight truncate">
            Hi {name ?? "Student"}
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

function normalizeBand(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(0.5, Math.min(9, value));
}

function YourPlanCard({
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

  const weekDays = useMemo(() => {
    const todayStr = localDateString();
    if (plan?.days.length) {
      const nextIndex = plan.days.findIndex((d) => d.date >= todayStr);
      const sliceStart = nextIndex === -1 ? Math.max(0, plan.days.length - 7) : Math.max(0, nextIndex);
      return plan.days.slice(sliceStart, sliceStart + 7).map((d) => new Date(d.date + "T00:00:00"));
    }

    const base = new Date(localDateString() + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(base);
      date.setDate(base.getDate() + i);
      return date;
    });
  }, [plan]);

  const firstTask = today?.tasks[0];
  const taskHref = firstTask ? skillHref(firstTask.skill) : plan ? `/plan/${plan.id}` : "/plan";
  const days = daysUntil(profile?.examDate);
  const activeDate = today?.date ?? localDateString();

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your plan</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/plan"
            aria-label="Open plan"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink/65 shadow-soft"
          >
            <CalendarDays className="h-4 w-4" />
          </Link>
          <Link
            href={plan ? `/plan/${plan.id}` : "/plan"}
            aria-label="Plan details"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink/65 shadow-soft"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-7 gap-1.5">
        {weekDays.map((date) => {
          const iso = localDateString(date);
          const isActive = iso === activeDate;
          const isPast = iso < localDateString();
          return (
            <div
              key={iso}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center rounded-[18px] text-center transition",
                isActive
                  ? "bg-white text-ink shadow-soft ring-1 ring-black/[0.06]"
                  : "text-ink/45",
              )}
            >
              <div className="text-[10px] font-medium">
                {date.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div className="mt-0.5 text-lg font-semibold tabular-nums leading-none">
                {date.getDate()}
              </div>
              <div
                className={cn(
                  "mt-1 h-1.5 w-1.5 rounded-full",
                  isActive ? "bg-indigo-500" : isPast ? "bg-sky-400" : "bg-transparent",
                )}
              />
            </div>
          );
        })}
      </div>

      <Link
        href={taskHref}
        className="group block rounded-[26px] border border-black/[0.06] bg-white/94 p-5 text-ink shadow-soft active:scale-[0.99] transition hover:shadow-pop"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            {firstTask ? iconForSkill(firstTask.skill) : <CalendarDays className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700">
              {firstTask ? (
                <>
                  {iconForSkill(firstTask.skill, "h-3.5 w-3.5")}
                  {labelForSkill(firstTask.skill)}
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Study plan
                </>
              )}
            </div>
            <h3 className="mt-2 text-lg font-bold leading-snug tracking-tight">
              {firstTask?.title ?? (plan ? "Open plan" : "Create plan")}
            </h3>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-ink/58">
              {firstTask ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {firstTask.estimatedMinutes} min
                </span>
              ) : null}
              {today ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1">
                  Day {today.dayIndex}
                </span>
              ) : null}
              {days !== null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1">
                  {days}d to exam
                </span>
              ) : null}
            </div>
          </div>
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white group-hover:bg-indigo-700 group-hover:translate-x-0.5 transition">
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
      hint: "Essays",
      icon: <PenLine className="h-5 w-5" />,
      iconBg: "bg-amber-100",
      iconText: "text-amber-700",
      accent: "from-amber-100/80",
    },
    {
      href: "/read",
      label: "Reading",
      hint: "Passages",
      icon: <BookOpen className="h-5 w-5" />,
      iconBg: "bg-sky-100",
      iconText: "text-sky-700",
      accent: "from-sky-100/80",
    },
    {
      href: "/speak",
      label: "Speaking",
      hint: "Practice",
      icon: <Mic className="h-5 w-5" />,
      iconBg: "bg-violet-100",
      iconText: "text-violet-700",
      accent: "from-violet-100/80",
    },
    {
      href: "/review",
      label: "Vocab",
      hint: "Review",
      icon: <Sparkles className="h-5 w-5" />,
      iconBg: "bg-rose-100",
      iconText: "text-rose-700",
      accent: "from-rose-100/80",
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
              "group relative rounded-[22px] bg-white/88 p-4 border border-white shadow-soft active:scale-[0.98] transition overflow-hidden min-h-[116px] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-pop",
            )}
          >
            <div
              aria-hidden
              className={cn(
                "absolute inset-y-0 right-0 w-24 bg-gradient-to-l to-transparent opacity-80",
                it.accent,
              )}
            />
            <div
              className={cn(
                "h-11 w-11 rounded-2xl flex items-center justify-center ring-1 ring-white/80 shadow-[0_8px_20px_rgba(23,23,23,0.06)]",
                it.iconBg,
                it.iconText,
              )}
            >
              {it.icon}
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">{it.label}</div>
              <div className="text-xs text-ink/55 mt-0.5">{it.hint}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MockTestCTA() {
  return (
    <section className="mt-8">
      <Link
        href="/mock"
        className="group relative block rounded-[26px] p-5 bg-gradient-to-br from-ink to-stone-800 text-white shadow-pop active:scale-[0.99] transition overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-violet-500 blur-3xl" />
          <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-rose-400 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-white/60">
              New · Mock test
            </div>
            <h3 className="mt-1 text-lg font-bold tracking-tight">Take the full 4-section mock</h3>
            <div className="mt-0.5 text-[11px] text-white/60">Full IELTS simulation</div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-white/70 group-hover:translate-x-0.5 transition" />
        </div>
      </Link>
    </section>
  );
}

function GamifiedProgressCard({
  placementBand,
  targetBand,
  totalExercises,
  mocks,
  ready,
}: {
  placementBand: number;
  targetBand: number;
  totalExercises: number;
  mocks: MockTestSession[];
  ready: boolean;
}) {
  const completed = useMemo(
    () =>
      mocks
        .filter((m) => m.status === "completed" && m.overallBand != null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [mocks],
  );
  const recent = completed.slice(-7);
  const latest = recent[recent.length - 1]?.overallBand;
  const prev = recent[recent.length - 2]?.overallBand;
  const delta = latest != null && prev != null ? latest - prev : null;
  const currentBand = normalizeBand(latest ?? placementBand, placementBand);
  const bandSpan = Math.max(0.5, targetBand - placementBand);
  const bandProgress = Math.max(0, Math.min(1, (currentBand - placementBand) / bandSpan));
  const stars = Math.max(
    120,
    Math.round(totalExercises * 55 + completed.length * 160 + currentBand * 35),
  );
  const bandSteps = makeBandSteps(currentBand, targetBand);
  const activeStepIndex = bandSteps.findIndex((step) => step >= currentBand);
  const currentStepIndex = activeStepIndex === -1 ? bandSteps.length - 1 : activeStepIndex;
  const checkpointProgress =
    bandSteps.length > 1 ? Math.max(0, Math.min(100, (currentStepIndex / (bandSteps.length - 1)) * 100)) : 100;

  return (
    <section className="mt-5">
      <div className="overflow-hidden rounded-[28px] bg-[#121225] p-5 text-white shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold tracking-tight">Your progress</div>
            <div className="mt-0.5 text-xs text-white/50">IELTS Band</div>
          </div>
          <Link
            href="/dashboard"
            aria-label="Open progress report"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/60"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Link>
        </div>

        {!ready ? (
          <div className="mt-5 h-32 rounded-2xl bg-white/10 animate-pulse" />
        ) : (
          <>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    {formatBand(currentBand)}
                  </span>
                  <span className="text-xl font-semibold text-white/45">/{formatBand(targetBand)}</span>
                </div>
                {delta != null && delta !== 0 ? (
                  <div
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      delta > 0 ? "text-sky-300" : "text-rose-300",
                    )}
                  >
                    {(delta > 0 ? "+" : "") + delta.toFixed(1)} from last mock
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl bg-white/8 px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1 text-amber-300">
                  <Star className="h-4 w-4 fill-amber-300" />
                  <span className="text-lg font-bold tabular-nums">{stars}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300"
                style={{ width: `${Math.max(8, bandProgress * 100)}%` }}
              />
            </div>

            <div className="mt-5 rounded-[22px] bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold">Your path to Band {formatBand(targetBand)}</div>
                <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700">
                  {stars} <span className="text-amber-500">★</span>
                </div>
              </div>

              <div className="relative mt-5 h-16">
                <div className="absolute left-4 right-4 top-6 h-2 rounded-full bg-white/80" />
                <div
                  className="absolute left-4 top-6 h-2 rounded-full bg-amber-300"
                  style={{ width: `calc((100% - 2rem) * ${checkpointProgress / 100})` }}
                />
                <div className="absolute inset-x-0 top-0 grid grid-cols-4">
                  {bandSteps.map((step, index) => {
                    const isCurrent = index === currentStepIndex;
                    const complete = index < currentStepIndex;
                    const isGoal = index === bandSteps.length - 1;
                    return (
                      <div key={`${step}-${index}`} className="flex flex-col items-center">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-2xl border-4 text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)]",
                            complete
                              ? "border-white bg-violet-800"
                              : isCurrent
                                ? "border-white bg-white text-indigo-700"
                                : "border-white/80 bg-white/30 backdrop-blur",
                          )}
                        >
                          {complete ? (
                            <Check className="h-4 w-4" />
                          ) : isGoal ? (
                            <Trophy className="h-4 w-4 fill-amber-300 text-amber-400" />
                          ) : isCurrent ? (
                            <Star className="h-4 w-4 fill-amber-300 text-amber-400" />
                          ) : (
                            <Flame className="h-4 w-4 fill-orange-300 text-orange-300" />
                          )}
                        </div>
                        <div className="mt-1 text-[10px] font-bold leading-none">
                          {formatBand(step)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </section>
  );
}

function makeBandSteps(currentBand: number, targetBand: number): number[] {
  const start = clampBand(roundToHalf(currentBand));
  const goal = clampBand(roundToHalf(targetBand));
  if (goal <= start) {
    const previous = [start - 1, start - 0.5, start].map(clampBand);
    return [...new Set([...previous, goal])].slice(-4);
  }

  const allSteps: number[] = [];
  for (let band = start; band <= goal + 0.001; band += 0.5) {
    allSteps.push(clampBand(roundToHalf(band)));
  }

  if (allSteps.length <= 4) return allSteps;
  return [allSteps[0], allSteps[Math.ceil((allSteps.length - 1) / 3)], allSteps[Math.ceil(((allSteps.length - 1) * 2) / 3)], goal];
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function clampBand(value: number): number {
  return Math.max(0, Math.min(9, value));
}

function iconForSkill(skill: string, className = "h-5 w-5"): React.ReactNode {
  switch (skill) {
    case "writing":
      return <PenLine className={className} />;
    case "reading":
      return <BookOpen className={className} />;
    case "speaking":
      return <Mic className={className} />;
    case "vocabulary":
      return <Sparkles className={className} />;
    case "listening":
      return <Play className={className} />;
    default:
      return <ClipboardCheck className={className} />;
  }
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
                      : "bg-sky-100 text-sky-700",
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
