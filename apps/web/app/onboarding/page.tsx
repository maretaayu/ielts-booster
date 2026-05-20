"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Clock,
  GraduationCap,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import type { IeltsModule, SkillArea } from "@ielts/shared";
import { api, getOrCreateUserId, markOnboarded } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Wizard {
  name: string;
  module: IeltsModule | "";
  currentBand: number;
  targetBand: number;
  examDate: string;
  dailyMinutes: number;
  weakAreas: SkillArea[];
}

type SubmitMode = "withPlan" | "withoutPlan";

const PLAN_BUILDER_PHRASES = [
  "You've got this. ✨",
  "Band 9 is built one day at a time.",
  "Future you is already cheering.",
  "Show up. The rest follows.",
  "Tiny wins → big bands.",
  "Hard now, easy on exam day.",
  "Mistakes = free upgrades.",
  "Keep going. You're closer than you think.",
  "One more drill. One step closer.",
  "You're not late. You're right on time.",
];

const DEFAULTS: Wizard = {
  name: "",
  module: "",
  currentBand: 5.5,
  targetBand: 7,
  examDate: "",
  dailyMinutes: 45,
  weakAreas: [],
};

const STEPS = ["name", "module", "current", "target", "date", "time", "weak"] as const;
type StepKey = (typeof STEPS)[number];

const SKILL_LABEL: Record<SkillArea, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  writing: { label: "Writing", icon: PenLine },
  reading: { label: "Reading", icon: BookOpen },
  listening: { label: "Listening", icon: Headphones },
  speaking: { label: "Speaking", icon: Mic },
  vocabulary: { label: "Vocabulary", icon: Sparkles },
  grammar: { label: "Grammar", icon: GraduationCap },
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" />}>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Wizard>(DEFAULTS);
  const [submitting, setSubmitting] = useState<SubmitMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ielts.wizard") : null;
    if (saved) {
      try {
        setData({ ...DEFAULTS, ...(JSON.parse(saved) as Wizard) });
      } catch {
        // ignore
      }
    }
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ielts.wizard", JSON.stringify(data));
  }, [data]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const current: StepKey = STEPS[step] ?? "weak";
  const canAdvance = isStepValid(current, data);
  const isLast = step === STEPS.length - 1;

  function next() {
    if (!canAdvance) return;
    if (!isLast) setStep((s) => s + 1);
    else submit("withPlan");
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function submit(mode: SubmitMode) {
    setSubmitting(mode);
    setError(null);
    try {
      const userId = getOrCreateUserId();
      await api.saveProfile({
        userId,
        name: data.name.trim(),
        module: data.module as IeltsModule,
        currentBand: data.currentBand,
        targetBand: data.targetBand,
        examDate: data.examDate,
        dailyMinutes: data.dailyMinutes,
        weakAreas: data.weakAreas,
      });

      if (mode === "withoutPlan") {
        // Profile saved; skip plan generation and explore the app directly.
        markOnboarded("");
        router.push("/");
        return;
      }

      const plan = await api.createStudyPlan({
        userId,
        targetBand: data.targetBand,
        examDate: data.examDate,
        currentBand: data.currentBand,
        weakAreas: data.weakAreas,
        dailyMinutes: data.dailyMinutes,
      });
      markOnboarded(plan.id);
      router.push(`/plan/${plan.id}?welcome=1`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(null);
    }
  }

  if (submitting === "withPlan") {
    return <BuildingPlanScreen name={data.name.trim()} />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-4 py-6 sm:py-10 max-w-md mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full flex-1 transition-all",
              i < step ? "bg-ink/80" : i === step ? "bg-ink" : "bg-ink/15",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={back}
          disabled={step === 0}
          className="icon-pill disabled:opacity-30"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 text-ink/70" />
        </button>
        <span className="text-xs text-ink/50 font-medium">
          {step + 1} / {STEPS.length}
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col">
        <StepView step={current} data={data} setData={setData} today={today} />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-100/70 border border-rose-200 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <button
        onClick={next}
        disabled={!canAdvance || submitting !== null}
        className="btn-pill mt-6 justify-center w-full text-base py-3 disabled:opacity-40"
      >
        {isLast ? (
          <>
            Generate my plan <Sparkles className="h-4 w-4" />
          </>
        ) : (
          <>
            Next <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {isLast && (
        <button
          onClick={() => submit("withoutPlan")}
          disabled={!canAdvance || submitting !== null}
          className="mt-3 w-full text-center text-sm font-semibold text-ink/65 hover:text-ink disabled:opacity-40 underline-offset-4 hover:underline"
        >
          {submitting === "withoutPlan" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving your profile…
            </span>
          ) : (
            "Skip — I'll build my plan later"
          )}
        </button>
      )}

      <p className="mt-4 text-center text-[11px] text-ink/40">
        We use these answers to build your daily IELTS schedule.
      </p>
    </div>
  );
}

function BuildingPlanScreen({ name }: { name: string }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % PLAN_BUILDER_PHRASES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-6 bg-gradient-to-b from-violet-50 via-fuchsia-50 to-rose-50 relative overflow-hidden">
      {/* Animated background blobs */}
      <div
        aria-hidden
        className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl animate-pulse"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-rose-300/40 blur-3xl animate-pulse"
        style={{ animationDelay: "1.4s" }}
      />
      <div
        aria-hidden
        className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl animate-pulse"
        style={{ animationDelay: "0.8s" }}
      />

      <div className="relative max-w-sm w-full text-center">
        {/* Spinner with sparkle */}
        <div className="relative mx-auto h-24 w-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-violet-200" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-9 w-9 text-violet-500 animate-pulse" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {name ? `Hang tight, ${name} —` : "Hang tight —"}
        </h1>
        <p className="mt-1 text-lg font-semibold text-ink/80">
          we're tailoring your IELTS plan
        </p>

        {/* Rotating phrase */}
        <div className="mt-8 min-h-[3em] text-sm text-ink/65 leading-relaxed">
          <span
            key={phraseIdx}
            className="inline-block animate-[fadeIn_400ms_ease-out]"
          >
            {PLAN_BUILDER_PHRASES[phraseIdx]}
          </span>
        </div>

        <p className="mt-10 text-[11px] text-ink/40 leading-relaxed">
          AI generation usually takes 20–60 seconds. Please don't refresh.
        </p>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function isStepValid(s: StepKey, d: Wizard): boolean {
  switch (s) {
    case "name":
      return d.name.trim().length >= 2;
    case "module":
      return d.module !== "";
    case "current":
      return d.currentBand >= 0 && d.currentBand <= 9;
    case "target":
      return d.targetBand >= 4 && d.targetBand <= 9 && d.targetBand >= d.currentBand;
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(d.examDate) && d.examDate >= new Date().toISOString().slice(0, 10);
    case "time":
      return d.dailyMinutes >= 15 && d.dailyMinutes <= 240;
    case "weak":
      return d.weakAreas.length >= 1;
  }
}

function StepView({
  step,
  data,
  setData,
  today,
}: {
  step: StepKey;
  data: Wizard;
  setData: (u: (prev: Wizard) => Wizard) => void;
  today: string;
}) {
  switch (step) {
    case "name":
      return (
        <StepShell title="What should we call you?" subtitle="We use this for greetings and your dashboard avatar.">
          <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white/70 px-4 py-3">
            <UserRound className="h-5 w-5 text-ink/50" />
            <input
              type="text"
              autoFocus
              maxLength={40}
              value={data.name}
              onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Mareta"
              className="flex-1 bg-transparent text-lg focus:outline-none placeholder:text-ink/30"
            />
          </div>
          {data.name.trim().length > 0 && (
            <p className="mt-3 text-xs text-ink/60">
              Hi, <span className="font-semibold text-ink">{data.name.trim()}</span> 👋
            </p>
          )}
        </StepShell>
      );

    case "module":
      return (
        <StepShell title="Academic or General Training?" subtitle="This affects the writing and reading tasks you'll see.">
          <div className="grid grid-cols-1 gap-3">
            <ChoiceCard
              icon={<GraduationCap className="h-5 w-5" />}
              label="Academic"
              hint="For study abroad and university applications."
              active={data.module === "academic"}
              onClick={() => setData((d) => ({ ...d, module: "academic" }))}
            />
            <ChoiceCard
              icon={<Briefcase className="h-5 w-5" />}
              label="General Training"
              hint="For migration, work visas, and vocational training."
              active={data.module === "general-training"}
              onClick={() => setData((d) => ({ ...d, module: "general-training" }))}
            />
          </div>
        </StepShell>
      );

    case "current":
      return (
        <StepShell title="What's your current band?" subtitle="Just an estimate — we'll refine it as you practice.">
          <BandPicker
            value={data.currentBand}
            onChange={(v) => setData((d) => ({ ...d, currentBand: v }))}
            min={3}
            max={9}
          />
        </StepShell>
      );

    case "target":
      return (
        <StepShell title="What band are you aiming for?" subtitle="Pick something realistic but ambitious.">
          <BandPicker
            value={data.targetBand}
            onChange={(v) => setData((d) => ({ ...d, targetBand: v }))}
            min={Math.max(4, data.currentBand)}
            max={9}
          />
          {data.targetBand <= data.currentBand && (
            <p className="mt-3 text-xs text-amber-700">Target should be higher than your current band.</p>
          )}
        </StepShell>
      );

    case "date":
      return (
        <StepShell title="When is your exam?" subtitle="We'll fit the schedule so you finish before exam day.">
          <div className="flex items-center gap-2 rounded-2xl bg-white/70 border border-white/70 px-4 py-3">
            <CalendarDays className="h-5 w-5 text-ink/50" />
            <input
              type="date"
              min={today}
              value={data.examDate}
              onChange={(e) => setData((d) => ({ ...d, examDate: e.target.value }))}
              className="flex-1 bg-transparent text-lg focus:outline-none"
            />
          </div>
          {data.examDate && (
            <p className="mt-3 text-xs text-ink/60">
              {daysUntil(data.examDate)} days from today.
            </p>
          )}
        </StepShell>
      );

    case "time":
      return (
        <StepShell title="How many minutes per day can you study?" subtitle="Consistency beats intensity.">
          <MinutesPicker value={data.dailyMinutes} onChange={(v) => setData((d) => ({ ...d, dailyMinutes: v }))} />
        </StepShell>
      );

    case "weak":
      return (
        <StepShell title="Which skills need the most work?" subtitle="Pick one or more.">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SKILL_LABEL) as SkillArea[]).map((k) => {
              const { label, icon: Icon } = SKILL_LABEL[k];
              const active = data.weakAreas.includes(k);
              return (
                <button
                  key={k}
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      weakAreas: active
                        ? d.weakAreas.filter((x) => x !== k)
                        : [...d.weakAreas, k],
                    }))
                  }
                  className={cn(
                    "rounded-2xl border p-4 flex flex-col items-start gap-2 text-left transition",
                    active
                      ? "border-violet-400 bg-violet-100/70"
                      : "border-white/60 bg-white/55 hover:bg-white/80",
                  )}
                >
                  <Icon className="h-5 w-5 text-ink/70" />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </StepShell>
      );
  }
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-ink/60">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ChoiceCard({
  icon,
  label,
  hint,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-2xl border p-4 transition flex items-start gap-3",
        active
          ? "border-violet-400 bg-violet-100/70"
          : "border-white/60 bg-white/55 hover:bg-white/80",
      )}
    >
      <div className="mt-0.5 h-9 w-9 rounded-xl bg-white/70 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-ink/60 mt-0.5">{hint}</div>
      </div>
    </button>
  );
}

function BandPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const bands: number[] = [];
  for (let b = min; b <= max; b += 0.5) bands.push(b);
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-1 mb-3">
        <Target className="h-5 w-5 text-violet-500 self-center" />
        <span className="text-5xl font-bold tracking-tight">{value.toFixed(1)}</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 w-full">
        {bands.map((b) => (
          <button
            key={b}
            onClick={() => onChange(b)}
            className={cn(
              "rounded-xl py-2 text-sm font-medium transition",
              value === b
                ? "bg-ink text-white"
                : "bg-white/60 border border-white/60 text-ink/70 hover:bg-white",
            )}
          >
            {b.toFixed(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function MinutesPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const choices = [15, 30, 45, 60, 90, 120];
  return (
    <div>
      <div className="flex items-baseline gap-1 mb-4 justify-center">
        <Clock className="h-5 w-5 text-violet-500 self-center" />
        <span className="text-5xl font-bold tracking-tight">{value}</span>
        <span className="text-ink/50 ml-1">min</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {choices.map((m) => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={cn(
              "rounded-xl py-2.5 text-sm font-medium transition",
              value === m
                ? "bg-ink text-white"
                : "bg-white/60 border border-white/60 text-ink/70 hover:bg-white",
            )}
          >
            {m}m
          </button>
        ))}
      </div>
    </div>
  );
}

function daysUntil(yyyyMmDd: string): number {
  const target = new Date(yyyyMmDd + "T00:00:00").getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return Math.max(0, Math.round((target - today) / 86_400_000));
}
