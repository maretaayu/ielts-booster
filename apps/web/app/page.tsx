"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bell, BookOpen, Mic, PenLine, Sparkles } from "lucide-react";
import type { Attempt, StudyPlan, UserProfile } from "@ielts/shared";
import {
  api,
  getActivePlanId,
  getOrCreateUserId,
  isOnboarded,
} from "@/lib/api";
import { cn } from "@/lib/utils";
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
  // Pre-fetch attempts (used to compute completion %) but don't render a list.
  useLoad<{ attempts: Attempt[] } | null>(() => (onboarded ? api.listAttempts(userId) : null));

  return (
    <div className="mx-auto max-w-md sm:max-w-lg px-6 pt-7 pb-32 sm:pb-28">
      <TopBar name={profile.data?.name} />
      <ContinueCard profileState={profile} planState={plan} />
      <PracticeGrid />
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
