"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, PartyPopper, Target } from "lucide-react";
import type { SkillArea, StudyDay, StudyPlan } from "@ielts/shared";
import { api } from "@/lib/api";
import { CalendarSync } from "@/components/CalendarSync";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";

const SKILL_TINT: Record<SkillArea, string> = {
  writing: "bg-rose-100 text-rose-700",
  reading: "bg-amber-100 text-amber-800",
  listening: "bg-sky-100 text-sky-800",
  speaking: "bg-emerald-100 text-emerald-700",
  vocabulary: "bg-violet-100 text-violet-700",
  grammar: "bg-indigo-100 text-indigo-700",
};

function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PlanView() {
  const params = useParams<{ planId: string }>();
  const search = useSearchParams();
  const isWelcome = search.get("welcome") === "1";
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    api.getStudyPlan(params.planId).then(setPlan).catch((e) => setError(e.message));
  }, [params.planId]);

  const todayIndex = useMemo(() => {
    if (!plan) return 0;
    const today = localDateString();
    const idx = plan.days.findIndex((d) => d.date >= today);
    return idx === -1 ? plan.days.length - 1 : idx;
  }, [plan]);

  useEffect(() => {
    setActiveDay(todayIndex);
  }, [todayIndex]);

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-md sm:max-w-lg px-6 pt-7 pb-32">
        <h1 className="text-2xl font-bold tracking-tight">Study plan</h1>
        <div className="mt-6">
          {error ? (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
              {error}
            </div>
          ) : (
            <div className="text-ink/50 text-sm">Loading…</div>
          )}
        </div>
        <BottomNav active="plan" />
      </div>
    );
  }

  const current = plan.days[activeDay];

  return (
    <div className="mx-auto max-w-md sm:max-w-lg px-6 pt-7 pb-32 sm:pb-28">
      {isWelcome && (
        <div className="mb-4 bg-white border border-black/[0.06] rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-soft">
          <PartyPopper className="h-4 w-4 text-violet-500 shrink-0" />
          <div className="text-xs text-ink/70">
            <span className="font-semibold text-ink">Your plan is ready.</span> Sync it to Google Calendar below.
          </div>
        </div>
      )}

      {/* Hero */}
      <section>
        <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-ink/55">
          Study plan
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] leading-tight">
          Target band{" "}
          <span className="bg-gradient-to-r from-violet-500 to-rose-500 bg-clip-text text-transparent">
            {plan.targetBand}
          </span>
        </h1>
        <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink/55">
          <CalendarDays className="h-3.5 w-3.5" />
          Exam {plan.examDate}
        </div>
        <p className="mt-4 text-sm text-ink/65 leading-relaxed">{plan.overallStrategy}</p>
      </section>

      {/* Stat strip */}
      <section className="mt-5 grid grid-cols-3 gap-2">
        <StatCell
          icon={<Target className="h-3.5 w-3.5" />}
          label="Band"
          value={plan.currentBand ? `${plan.currentBand}→${plan.targetBand}` : `${plan.targetBand}`}
        />
        <StatCell
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          label="Length"
          value={`${plan.days.length}d`}
        />
        <StatCell
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Daily"
          value={`${plan.dailyMinutes}m`}
        />
      </section>

      {/* Day rail */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink/70 uppercase tracking-wider mb-2.5">
          Days
        </h2>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
          {plan.days.map((d, i) => {
            const isToday = i === todayIndex;
            const isActive = activeDay === i;
            return (
              <button
                key={d.dayIndex}
                onClick={() => setActiveDay(i)}
                className={cn(
                  "shrink-0 snap-start rounded-2xl px-3 py-2 min-w-[58px] text-center transition border",
                  isActive
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink/75 border-black/[0.06] hover:border-ink/30",
                )}
              >
                <div className={cn("text-[10px] uppercase tracking-wider", isActive ? "text-white/55" : "text-ink/45")}>
                  D{d.dayIndex}
                </div>
                <div className="text-xs font-semibold mt-0.5">
                  {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </div>
                {isToday && (
                  <div className={cn("mt-1 h-1 w-1 rounded-full mx-auto", isActive ? "bg-white" : "bg-violet-500")} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active day */}
      {current && (
        <section className="mt-5">
          <DayDetail day={current} />
        </section>
      )}

      {/* Weekly milestones */}
      {plan.weeklyMilestones.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink/70 uppercase tracking-wider mb-2.5">
            Milestones
          </h2>
          <div className="space-y-2">
            {plan.weeklyMilestones.map((m) => (
              <div
                key={m.weekIndex}
                className="bg-white rounded-2xl border border-black/[0.06] shadow-soft p-4 flex gap-3"
              >
                <div className="h-7 w-7 rounded-full bg-stone-100 flex items-center justify-center text-[11px] font-bold text-ink/70 shrink-0">
                  W{m.weekIndex}
                </div>
                <p className="text-sm text-ink/75 leading-relaxed">{m.goal}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Calendar sync */}
      <section className="mt-6">
        <CalendarSync planId={plan.id} />
      </section>

      {/* Footer actions */}
      <section className="mt-6 flex gap-2">
        <Link
          href="/write"
          className="btn-pill flex-1 justify-center"
        >
          Start writing <ArrowUpRight className="h-4 w-4" />
        </Link>
        <Link href="/plan" className="btn-pill-ghost">
          New plan
        </Link>
      </section>

      <BottomNav active="plan" />
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-soft px-3 py-3">
      <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink/45">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-bold tracking-tight">{value}</div>
    </div>
  );
}

function DayDetail({ day }: { day: StudyDay }) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-soft">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/45">
            Day {day.dayIndex} ·{" "}
            {new Date(day.date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
          <h3 className="mt-1 text-lg font-bold tracking-tight leading-snug">{day.focus}</h3>
        </div>
        <span className="text-[11px] text-ink/55 shrink-0">~{day.totalMinutes}m</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {day.tasks.map((t, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/[0.06] p-3.5 flex gap-3"
          >
            <span
              className={cn(
                "h-6 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center shrink-0",
                SKILL_TINT[t.skill] ?? "bg-stone-100 text-ink/70",
              )}
            >
              {t.skill}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink leading-snug">{t.title}</div>
              {t.description && (
                <p className="text-xs text-ink/55 mt-1 leading-relaxed">{t.description}</p>
              )}
              <div className="mt-1 text-[11px] text-ink/45">{t.estimatedMinutes} min</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
