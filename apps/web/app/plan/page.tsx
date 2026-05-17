"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { SkillArea, StudyPlan } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

const SKILLS: { value: SkillArea; label: string; bg: string }[] = [
  { value: "writing", label: "Writing", bg: "bg-card-rose" },
  { value: "reading", label: "Reading", bg: "bg-card-lavender" },
  { value: "listening", label: "Listening", bg: "bg-card-peach" },
  { value: "speaking", label: "Speaking", bg: "bg-card-mint" },
  { value: "vocabulary", label: "Vocabulary", bg: "bg-card-rose" },
  { value: "grammar", label: "Grammar", bg: "bg-card-lavender" },
];

const BAND_OPTIONS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5];

export default function PlanForm() {
  const router = useRouter();
  const [targetBand, setTargetBand] = useState(7);
  const [currentBand, setCurrentBand] = useState<number | "">(6);
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [weakAreas, setWeakAreas] = useState<SkillArea[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentPlans, setRecentPlans] = useState<StudyPlan[]>([]);

  useEffect(() => {
    const userId = getOrCreateUserId();
    api.listStudyPlans(userId).then((r) => setRecentPlans(r.plans)).catch(() => {});
  }, []);

  function toggleSkill(s: SkillArea) {
    setWeakAreas((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const plan = await api.createStudyPlan({
        userId: getOrCreateUserId(),
        targetBand,
        currentBand: currentBand === "" ? undefined : Number(currentBand),
        examDate,
        weakAreas,
        dailyMinutes,
      });
      router.push(`/plan/${plan.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      greeting="Build your study plan"
      subtitle="Tell us where you're heading. We'll generate a personalized daily schedule."
    >
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 border border-white/60 shadow-soft space-y-7">
          <Field label="Target band score">
            <div className="flex flex-wrap gap-2">
              {BAND_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => setTargetBand(b)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition border",
                    targetBand === b
                      ? "bg-ink text-white border-ink"
                      : "bg-white/60 backdrop-blur border-white/60 text-ink/70 hover:bg-white",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Your current band (rough estimate)">
            <div className="flex flex-wrap gap-2">
              {[4, 4.5, 5, 5.5, 6, 6.5, 7].map((b) => (
                <button
                  key={b}
                  onClick={() => setCurrentBand(b)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition border",
                    currentBand === b
                      ? "bg-ink text-white border-ink"
                      : "bg-white/60 backdrop-blur border-white/60 text-ink/70 hover:bg-white",
                  )}
                >
                  {b}
                </button>
              ))}
              <button
                onClick={() => setCurrentBand("")}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition border",
                  currentBand === ""
                    ? "bg-ink text-white border-ink"
                    : "bg-white/60 backdrop-blur border-white/60 text-ink/70 hover:bg-white",
                )}
              >
                Not sure
              </button>
            </div>
          </Field>

          <Field label="Exam date">
            <input
              type="date"
              value={examDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExamDate(e.target.value)}
              className="rounded-full bg-white/70 backdrop-blur border border-white/60 px-5 py-2.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span className="ml-3 text-xs text-ink/50">Max 90 days from today.</span>
          </Field>

          <Field label="Daily study time">
            <div className="flex flex-wrap gap-2">
              {[30, 45, 60, 90, 120].map((m) => (
                <button
                  key={m}
                  onClick={() => setDailyMinutes(m)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition border",
                    dailyMinutes === m
                      ? "bg-ink text-white border-ink"
                      : "bg-white/60 backdrop-blur border-white/60 text-ink/70 hover:bg-white",
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Weak areas"
            hint="Pick the skills you struggle with most. Leave empty if you're not sure."
          >
            <div className="flex flex-wrap gap-2">
              {SKILLS.map((s) => {
                const selected = weakAreas.includes(s.value);
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSkill(s.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition border",
                      selected
                        ? "bg-ink text-white border-ink"
                        : "bg-white/60 backdrop-blur border-white/60 text-ink/70 hover:bg-white",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="pt-2">
            <button onClick={submit} disabled={submitting} className="btn-pill disabled:opacity-50">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating your plan…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate my plan
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 rounded-2xl bg-rose-100/70 border border-rose-200 p-3 text-sm text-rose-800">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card-lavender rounded-3xl p-6 border border-white/60 shadow-soft">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <h3 className="mt-3 text-lg font-bold tracking-tight">How it works</h3>
            <ol className="mt-3 space-y-2 text-sm text-ink/70">
              <li>1. Tell us your target band, current level, and exam date</li>
              <li>2. AI builds a day-by-day schedule prioritising your weak spots</li>
              <li>3. Each day has concrete tasks under your daily time budget</li>
              <li>4. Weekly milestones keep you on track</li>
            </ol>
          </div>

          {recentPlans.length > 0 && (
            <div className="glass rounded-3xl p-6 border border-white/60">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/50">
                Your previous plans
              </h3>
              <div className="mt-3 divide-y divide-white/60">
                {recentPlans.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/plan/${p.id}`}
                    className="flex items-center justify-between py-3 group"
                  >
                    <div>
                      <div className="font-medium text-ink">Target band {p.targetBand}</div>
                      <div className="text-xs text-ink/50">
                        {p.days.length} days · exam {p.examDate}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink/30 group-hover:text-ink/70 transition" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-semibold text-ink">{label}</label>
        {hint && <span className="text-xs text-ink/50">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
