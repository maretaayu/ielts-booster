"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

const DEFAULTS: Wizard = {
  name: "",
  module: "",
  currentBand: 5.5,
  targetBand: 7,
  examDate: "",
  dailyMinutes: 45,
  weakAreas: [],
};

const STEPS = ["signin", "module", "current", "target", "date", "time", "weak"] as const;
type StepKey = (typeof STEPS)[number];

const SKILL_LABEL: Record<SkillArea, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  writing: { label: "Writing", icon: PenLine },
  reading: { label: "Reading", icon: BookOpen },
  listening: { label: "Listening", icon: Headphones },
  speaking: { label: "Speaking", icon: Mic },
  vocabulary: { label: "Vocabulary", icon: Sparkles },
  grammar: { label: "Grammar", icon: GraduationCap },
};

export default function Onboarding() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Wizard>(DEFAULTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // Handle return from Google OAuth: prefill name, clean the querystring, auto-advance.
  useEffect(() => {
    if (!search) return;
    const googleName = search.get("googleName");
    const signin = search.get("signin");
    if (signin === "connected" && googleName) {
      setData((d) => ({ ...d, name: googleName }));
      const url = new URL(window.location.href);
      ["signin", "googleName", "googleEmail", "msg"].forEach((k) => url.searchParams.delete(k));
      router.replace(url.pathname + (url.search ? url.search : ""));
      // Move past the sign-in step.
      setStep((s) => (s === 0 ? 1 : s));
    } else if (signin === "error") {
      setError(`Google sign-in failed${search.get("msg") ? `: ${search.get("msg")}` : "."}`);
    }
  }, [search, router]);

  async function continueWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const userId = getOrCreateUserId();
      const { url } = await api.googleAuthUrl(userId, "/onboarding", "signin");
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setGoogleLoading(false);
    }
  }

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const current: StepKey = STEPS[step] ?? "weak";
  const canAdvance = isStepValid(current, data);
  const isLast = step === STEPS.length - 1;

  function next() {
    if (!canAdvance) return;
    if (!isLast) setStep((s) => s + 1);
    else submit();
  }
  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const userId = getOrCreateUserId();
      await api.saveProfile({
        userId,
        name: data.name,
        module: data.module as IeltsModule,
        currentBand: data.currentBand,
        targetBand: data.targetBand,
        examDate: data.examDate,
        dailyMinutes: data.dailyMinutes,
        weakAreas: data.weakAreas,
      });
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
      setSubmitting(false);
    }
  }

  const isSignin = current === "signin";

  return (
    <div className="min-h-[100dvh] flex flex-col px-4 py-6 sm:py-10 max-w-md mx-auto">
      {!isSignin && (
        <>
          {/* Progress */}
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.filter((s) => s !== "signin").map((_, i) => {
              const realStep = step - 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full flex-1 transition-all",
                    i < realStep ? "bg-ink/80" : i === realStep ? "bg-ink" : "bg-ink/15",
                  )}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-8">
            <button
              onClick={back}
              disabled={step <= 1}
              className="icon-pill disabled:opacity-30"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4 text-ink/70" />
            </button>
            <span className="text-xs text-ink/50 font-medium">
              {step} / {STEPS.length - 1}
            </span>
            <div className="w-10" />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col">
        <StepView
          step={current}
          data={data}
          setData={setData}
          today={today}
          onGoogle={current === "signin" ? continueWithGoogle : undefined}
          googleLoading={googleLoading}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-100/70 border border-rose-200 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {current !== "signin" && (
        <button
          onClick={next}
          disabled={!canAdvance || submitting}
          className="btn-pill mt-6 justify-center w-full text-base py-3 disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Building your plan…
            </>
          ) : isLast ? (
            <>
              Generate my plan <Sparkles className="h-4 w-4" />
            </>
          ) : (
            <>
              Next <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      )}

      {!isSignin && (
        <p className="mt-4 text-center text-[11px] text-ink/40">
          We use these answers to build your daily IELTS schedule.
        </p>
      )}
    </div>
  );
}

function isStepValid(s: StepKey, d: Wizard): boolean {
  switch (s) {
    case "signin":
      return d.name.trim().length >= 1;
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
  onGoogle,
  googleLoading,
}: {
  step: StepKey;
  data: Wizard;
  setData: (u: (prev: Wizard) => Wizard) => void;
  today: string;
  onGoogle?: () => void;
  googleLoading?: boolean;
}) {
  switch (step) {
    case "signin":
      return (
        <div className="flex-1 flex flex-col justify-center items-center text-center pt-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-300 via-fuchsia-300 to-rose-300 flex items-center justify-center text-white font-bold text-xl shadow-soft ring-2 ring-white mb-6">
            IB
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] leading-tight">
            Start your IELTS journey
          </h1>
          <p className="mt-3 text-sm text-ink/55 max-w-xs">
            Sign in to save your progress and access your study plan from anywhere.
          </p>

          <button
            onClick={onGoogle}
            disabled={googleLoading || !onGoogle}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-ink text-white px-4 py-3.5 text-sm font-semibold hover:bg-ink-soft transition disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-5 w-5" />
            )}
            Continue with Google
          </button>

          {data.name && (
            <div className="mt-5 text-xs text-ink/55">
              Welcome back, <span className="font-medium text-ink">{data.name}</span>
            </div>
          )}

          <p className="mt-10 text-[11px] text-ink/40 max-w-xs leading-relaxed">
            By signing in, you agree to let us store your profile, attempts, and study plan.
          </p>
        </div>
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
