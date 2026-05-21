"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  GraduationCap,
  Headphones,
  Loader2,
  Mic,
  PenLine,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { IeltsModule, PlacementResult, SkillArea } from "@ielts/shared";
import { api, getOrCreateUserId, markOnboarded } from "@/lib/api";
import { cn } from "@/lib/utils";

const PLACEMENT_PENDING_KEY = "ielts.placement.pending";
const WIZARD_KEY = "ielts.wizard";
const STAGE_KEY = "ielts.wizard.stage";

interface Wizard {
  name: string;
  module: IeltsModule | "";
  currentBand: number;
  targetBand: number;
  examDate: string;
  dailyMinutes: number;
  weakAreas: SkillArea[];
  placement: PlacementResult | null;
  placementSkipped: boolean;
}

type SubmitMode = "withPlan" | "withoutPlan";

type Stage =
  | "welcome"
  | "name"
  | "module"
  | "placement"
  | "placement-celebration"
  | "plan-offer"
  | "target"
  | "date"
  | "time"
  | "weak"
  | "ready";

const DEFAULTS: Wizard = {
  name: "",
  module: "academic",
  currentBand: 0,
  targetBand: 7,
  examDate: "",
  dailyMinutes: 45,
  weakAreas: [],
  placement: null,
  placementSkipped: false,
};

const PLAN_BUILDER_PHRASES = [
  "You've got this. ✨",
  "Band 9 is built one day at a time.",
  "Future you is already cheering.",
  "Show up. The rest follows.",
  "Tiny wins → big bands.",
  "Hard now, easy on exam day.",
  "Mistakes = free upgrades.",
  "Keep going. You're closer than you think.",
];

const NAME_AFFIRMATIONS = ["Lovely name!", "Nice to meet you!", "Hi there!", "Hello!"];
const TARGET_AFFIRMATIONS = [
  "Love the ambition!",
  "Bold goal — let's chase it!",
  "That's a great stretch!",
  "Future-you will thank you!",
];
const DATE_AFFIRMATIONS = [
  "Marked the calendar!",
  "Locked in!",
  "Let's start the countdown!",
];
const TIME_AFFIRMATIONS = [
  "Consistency wins.",
  "Solid commitment!",
  "Day by day, band by band.",
];
const SKILLS_AFFIRMATIONS = [
  "Focused plan incoming!",
  "Smart focus.",
  "Got it — let's lock it in.",
];
const PLACEMENT_AFFIRMATIONS = [
  "You crushed it!",
  "Amazing work!",
  "Look at you go!",
  "Beautifully done!",
];

function pickPhrase(arr: string[], seed: string): string {
  if (arr.length === 0) return "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length]!;
}

const STAGE_ORDER: Stage[] = [
  "welcome",
  "name",
  "placement",
  "placement-celebration",
  "target",
  "date",
  "plan-offer",
  "time",
  "weak",
  "ready",
];

function stageIdx(s: Stage): number {
  return STAGE_ORDER.indexOf(s);
}

function currentVisibleStep(stage: Stage): number {
  switch (stage) {
    case "welcome":
      return 1;
    case "name":
      return 2;
    case "placement":
    case "placement-celebration":
      return 3;
    case "target":
      return 4;
    case "date":
      return 5;
    case "plan-offer":
    case "time":
    case "weak":
    case "ready":
      return 6;
    default:
      return 1;
  }
}

function stageForVisibleStep(step: number): Stage {
  switch (step) {
    case 1:
      return "welcome";
    case 2:
      return "name";
    case 3:
      return "placement";
    case 4:
      return "target";
    case 5:
      return "date";
    default:
      return "plan-offer";
  }
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#050008]" />}>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const router = useRouter();
  const [data, setData] = useState<Wizard>(DEFAULTS);
  const [stage, setStage] = useState<Stage>("welcome");
  const [autoAdvancePlacement, setAutoAdvancePlacement] = useState(false);
  const [submitting, setSubmitting] = useState<SubmitMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ---- Hydrate ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    let next: Wizard = DEFAULTS;
    const saved = localStorage.getItem(WIZARD_KEY);
    if (saved) {
      try {
        next = { ...DEFAULTS, ...(JSON.parse(saved) as Partial<Wizard>) };
      } catch {}
    }
    let justReturnedFromPlacement = false;
    const pending = localStorage.getItem(PLACEMENT_PENDING_KEY);
    if (pending) {
      try {
        const placement = JSON.parse(pending) as PlacementResult;
        next = {
          ...next,
          placement,
          currentBand: placement.estimatedBand,
          placementSkipped: false,
        };
        justReturnedFromPlacement = true;
      } catch {}
    }
    setData(next);

    const savedStage = localStorage.getItem(STAGE_KEY) as Stage | null;
    if (justReturnedFromPlacement) {
      setAutoAdvancePlacement(true);
      setStage("placement-celebration");
    } else {
      let nextStage = savedStage === "module" ? "placement" : savedStage ?? "welcome";
      if ((nextStage === "plan-offer" || nextStage === "time" || nextStage === "weak" || nextStage === "ready") && !next.examDate) {
        nextStage = "target";
      }
      if (nextStage === "time" || nextStage === "weak" || nextStage === "ready") {
        nextStage = "plan-offer";
      }
      setStage(nextStage);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(WIZARD_KEY, JSON.stringify(data));
  }, [data, hydrated]);
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(STAGE_KEY, stage);
  }, [stage, hydrated]);

  useEffect(() => {
    if (stage !== "placement-celebration" || !autoAdvancePlacement) return;
    const id = setTimeout(() => {
      setAutoAdvancePlacement(false);
      setStage("target");
    }, 2400);
    return () => clearTimeout(id);
  }, [stage, autoAdvancePlacement]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function back() {
    const i = stageIdx(stage);
    if (i <= 0) return;
    const prev = STAGE_ORDER[i - 1];
    if (prev === "placement-celebration" && i - 2 >= 0) {
      setAutoAdvancePlacement(false);
      setStage(data.placement ? "placement-celebration" : STAGE_ORDER[i - 2]!);
    } else if (prev) {
      setAutoAdvancePlacement(false);
      setStage(prev);
    }
  }

  function pickStep(step: number) {
    setAutoAdvancePlacement(false);
    if (step === 3 && data.placement) {
      setStage("placement-celebration");
      return;
    }
    setStage(stageForVisibleStep(step));
  }

  function retakePlacement() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PLACEMENT_PENDING_KEY);
    }
    setAutoAdvancePlacement(false);
    setData((d) => ({ ...d, placement: null, placementSkipped: false, currentBand: 0 }));
    router.push("/placement?from=onboarding&retake=1");
  }

  async function submit(mode: SubmitMode) {
    setSubmitting(mode);
    setError(null);
    try {
      const userId = getOrCreateUserId();
      const examDate =
        data.examDate ||
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const weakAreas =
        data.weakAreas.length > 0 ? data.weakAreas : (["writing", "speaking"] as SkillArea[]);

      await api.saveProfile({
        userId,
        name: data.name.trim(),
        module: (data.module || "academic") as IeltsModule,
        currentBand: data.currentBand,
        targetBand: data.targetBand,
        examDate,
        dailyMinutes: data.dailyMinutes,
        weakAreas,
      });

      if (data.placement) {
        try {
          await api.savePlacement(userId, {
            cefr: data.placement.cefr,
            estimatedBand: data.placement.estimatedBand,
            mcqCorrect: data.placement.mcqCorrect,
            mcqAsked: data.placement.mcqAsked,
            writingBand: data.placement.writingBand,
            skillBreakdown: data.placement.skillBreakdown,
          });
        } catch {}
        if (typeof window !== "undefined") {
          localStorage.removeItem(PLACEMENT_PENDING_KEY);
        }
      }

      if (mode === "withoutPlan") {
        markOnboarded("");
        router.push("/");
        return;
      }

      const plan = await api.createStudyPlan({
        userId,
        targetBand: data.targetBand,
        examDate,
        currentBand: data.currentBand > 0 ? data.currentBand : undefined,
        weakAreas,
        dailyMinutes: data.dailyMinutes,
      });
      markOnboarded(plan.id);
      router.push("/?welcome=plan-ready");
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(null);
    }
  }

  if (submitting === "withPlan") {
    return <BuildingPlanScreen name={data.name.trim()} />;
  }

  const visibleStages: Stage[] = [
    "name",
    "placement",
    "plan-offer",
    "target",
    "date",
    "time",
    "weak",
    "ready",
  ];
  const progress =
    stage === "welcome"
      ? 0
      : stage === "placement-celebration"
      ? (visibleStages.indexOf("plan-offer") / visibleStages.length) * 100
      : Math.max(0, (visibleStages.indexOf(stage) / visibleStages.length) * 100);

  const showHeader = stage !== "placement-celebration" || !autoAdvancePlacement;

  return (
    <div className="onboarding-dark min-h-[100dvh] flex flex-col bg-[#050008] relative overflow-hidden">
      <DynamicBackground stage={stage} />

      <VisualKeyframes />
      {showHeader && (
        <TopBar
          currentStep={currentVisibleStep(stage)}
          totalSteps={6}
          onBack={back}
          onStepPick={pickStep}
          canBack={stageIdx(stage) > stageIdx("name")}
        />
      )}

      <main className="flex-1 flex flex-col px-5 pt-2 pb-6 relative z-10">
        <div className="max-w-md w-full mx-auto flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 15, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col overflow-y-auto custom-scrollbar overflow-x-hidden"
            >
              <ScreenRouter
                stage={stage}
                setStage={setStage}
                data={data}
                setData={setData}
                today={today}
                submitting={submitting}
                error={error}
                onSubmitWithPlan={() => submit("withPlan")}
                onSubmitWithoutPlan={() => submit("withoutPlan")}
                autoAdvancePlacement={autoAdvancePlacement}
                onRetakePlacement={retakePlacement}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// Top bar
// ============================================================

function TopBar({
  currentStep,
  totalSteps,
  onBack,
  onStepPick,
  canBack,
}: {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onStepPick: (step: number) => void;
  canBack: boolean;
}) {
  return (
    <header className="px-5 pt-5 sm:pt-7 relative z-10">
      <div className="max-w-md mx-auto flex items-center gap-4">
        <button
          onClick={onBack}
          disabled={!canBack}
          aria-label="Back"
          className="h-9 w-9 rounded-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
        >
          <X className="h-5 w-5" />
        </button>
        <StepRail currentStep={currentStep} totalSteps={totalSteps} onStepPick={onStepPick} />
      </div>
    </header>
  );
}

function StepRail({
  currentStep,
  totalSteps,
  onStepPick,
}: {
  currentStep: number;
  totalSteps: number;
  onStepPick: (step: number) => void;
}) {
  return (
    <div className="relative flex-1 py-3">
      <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#331149]" />
      <div
        className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-fuchsia-300 to-violet-300 transition-all duration-500"
        style={{ width: `${((currentStep - 1) / Math.max(1, totalSteps - 1)) * 100}%` }}
      />
      <div className="relative flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const n = i + 1;
          const active = n <= currentStep;
          const current = n === currentStep;
          return (
            <button
              key={n}
              type="button"
              onClick={() => active && onStepPick(n)}
              disabled={!active}
              aria-label={`Go to onboarding step ${n}`}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition-all",
                active ? "bg-fuchsia-200 text-[#2b063d]" : "bg-[#1d0b28] text-white/45",
                current && "scale-110 ring-2 ring-fuchsia-200/50",
                active && "cursor-pointer hover:scale-110",
                !active && "cursor-not-allowed",
              )}
            >
              {n === totalSteps ? <Check className="h-3 w-3" strokeWidth={4} /> : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Screen router
// ============================================================

function ScreenRouter({
  stage,
  setStage,
  data,
  setData,
  today,
  submitting,
  error,
  onSubmitWithPlan,
  onSubmitWithoutPlan,
  autoAdvancePlacement,
  onRetakePlacement,
}: {
  stage: Stage;
  setStage: (s: Stage) => void;
  data: Wizard;
  setData: (u: (prev: Wizard) => Wizard) => void;
  today: string;
  submitting: SubmitMode | null;
  error: string | null;
  onSubmitWithPlan: () => void;
  onSubmitWithoutPlan: () => void;
  autoAdvancePlacement: boolean;
  onRetakePlacement: () => void;
}) {
  switch (stage) {
    case "welcome":
      return <WelcomeScreen onStart={() => setStage("name")} />;
    case "name":
      return (
        <NameScreen
          value={data.name}
          onChange={(v) => setData((d) => ({ ...d, name: v }))}
          onContinue={() => {
            setData((d) => ({ ...d, module: "academic" }));
            setStage("placement");
          }}
        />
      );
    case "module":
      return (
        <ModuleScreen
          name={data.name.trim()}
          onPick={(m) => {
            setData((d) => ({ ...d, module: m }));
            setStage("placement");
          }}
        />
      );
    case "placement":
      return (
        <PlacementScreen
          onSkip={() => {
            setData((d) => ({
              ...d,
              placement: null,
              placementSkipped: true,
              currentBand: 0,
            }));
            setStage("target");
          }}
        />
      );
    case "placement-celebration":
      return data.placement ? (
        <PlacementCelebrationScreen
          placement={data.placement}
          name={data.name.trim()}
          reviewMode={!autoAdvancePlacement}
          onContinue={() => setStage("target")}
          onRetake={onRetakePlacement}
        />
      ) : (
        <WelcomeScreen onStart={() => setStage("target")} />
      );
    case "plan-offer":
      return (
        <PlanOfferScreen
          placement={data.placement}
          name={data.name.trim()}
          submitting={submitting}
          onBuild={onSubmitWithPlan}
          onSkip={onSubmitWithoutPlan}
        />
      );
    case "target":
      return (
        <TargetScreen
          value={data.targetBand}
          minBand={4}
          onChange={(v) => setData((d) => ({ ...d, targetBand: v }))}
          onContinue={() => setStage("date")}
          onSkip={() => setStage("date")}
        />
      );
    case "date":
      return (
        <DateScreen
          value={data.examDate}
          today={today}
          onChange={(v) => setData((d) => ({ ...d, examDate: v }))}
          onContinue={() => setStage("plan-offer")}
          onSkip={() => setStage("plan-offer")}
        />
      );
    case "time":
      return (
        <TimeScreen
          value={data.dailyMinutes}
          onPick={(m) => {
            setData((d) => ({ ...d, dailyMinutes: m }));
            setStage("weak");
          }}
          onSkip={onSubmitWithoutPlan}
          submitting={submitting}
        />
      );
    case "weak":
      return (
        <WeakScreen
          selected={data.weakAreas}
          onToggle={(k) =>
            setData((d) => ({
              ...d,
              weakAreas: d.weakAreas.includes(k)
                ? d.weakAreas.filter((x) => x !== k)
                : [...d.weakAreas, k],
            }))
          }
          onContinue={() => setStage("ready")}
        />
      );
    case "ready":
      return (
        <ReadyScreen
          name={data.name.trim()}
          targetBand={data.targetBand}
          examDate={data.examDate}
          submitting={submitting}
          error={error}
          onGenerate={onSubmitWithPlan}
          onSkip={onSubmitWithoutPlan}
        />
      );
  }
}

// ============================================================
// Screens
// ============================================================

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex h-full w-full flex-1 flex-col px-1 pt-1">
      <div className="relative flex flex-1 flex-col items-center justify-center pb-8">
        <div className="relative h-[310px] w-full">
          <div className="absolute left-1/2 top-[56px] h-[190px] w-[210px] -translate-x-1/2 rotate-[-8deg] rounded-[28px] bg-white shadow-[0_28px_55px_rgba(0,0,0,0.36)]" />
          <div className="absolute left-1/2 top-[40px] h-[210px] w-[238px] -translate-x-1/2 rotate-[8deg] rounded-[32px] border border-white/10 bg-gradient-to-br from-fuchsia-400/24 to-indigo-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
          <div className="absolute left-1/2 top-[12px] -translate-x-1/2">
            <FriendlyMascot mood="wave" size="xxl" />
          </div>
          <DecorStar className="left-[46px] top-[90px] text-white" delay={0.1} size={18} />
          <DecorStar className="right-[62px] top-[32px] text-amber-200" delay={0.8} size={14} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          className="-mt-2 text-center"
        >
          <h1 className="text-[2.35rem] font-black tracking-tight leading-[1.02] text-white">
            Meet Lumi.
          </h1>
          <p className="mx-auto mt-4 max-w-[270px] text-[15px] font-semibold leading-relaxed text-white/70">
            Turn IELTS prep into a band quest.
          </p>
        </motion.div>
      </div>

      <div className="relative mt-auto px-1 pb-6">
        <PrimaryButton variant="light" onClick={onStart}>LET'S GO</PrimaryButton>
      </div>
    </div>
  );
}

function DynamicBackground({ stage }: { stage: string }) {
  const orbs: Record<string, { color1: string; color2: string; color3: string }> = {
    welcome: { color1: "#7e22ce", color2: "#3b0764", color3: "#a21caf" },
    name: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    module: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    placement: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    "placement-celebration": { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    "plan-offer": { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    target: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    date: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    time: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    weak: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
    ready: { color1: "#7e22ce", color2: "#4c1d95", color3: "#c026d3" },
  };

  const current = orbs[stage] || orbs.welcome;
  const isDark = true;

  return (
    <motion.div 
      animate={{ backgroundColor: isDark ? "#050008" : "#faf7ff" }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      aria-hidden 
      className="absolute inset-0 pointer-events-none overflow-hidden -z-0"
    >
      <motion.div
        animate={{ backgroundColor: current.color1, x: [0, 40, -20, 0], y: [0, -40, 20, 0] }}
        transition={{ backgroundColor: { duration: 1.2, ease: "easeInOut" }, x: { duration: 20, repeat: Infinity, ease: "easeInOut" }, y: { duration: 25, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute top-[-18%] left-1/2 h-[58vw] w-[78vw] -translate-x-1/2 rounded-full blur-[95px] opacity-75"
      />
      <motion.div
        animate={{ backgroundColor: current.color2, x: [0, -30, 30, 0], y: [0, 30, -30, 0] }}
        transition={{ backgroundColor: { duration: 1.2, ease: "easeInOut" }, x: { duration: 25, repeat: Infinity, ease: "easeInOut" }, y: { duration: 20, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-[-18%] left-[-10%] h-[70vw] w-[70vw] rounded-full blur-[120px] opacity-65"
      />
      <motion.div
        animate={{ backgroundColor: current.color3, x: [0, 50, -50, 0], y: [0, 50, -50, 0] }}
        transition={{ backgroundColor: { duration: 1.2, ease: "easeInOut" }, x: { duration: 30, repeat: Infinity, ease: "easeInOut" }, y: { duration: 30, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute right-[-12%] top-[18%] h-[52vw] w-[52vw] rounded-full blur-[105px] opacity-45"
      />
      
      {/* Subtle grid texture to prevent flatness */}
      <div 
        className={cn(
          "absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)] pointer-events-none",
          isDark ? "opacity-10" : "opacity-[0.03]"
        )}
        style={{ backgroundImage: `radial-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} 
      />

      {/* Frosted glass overlay that adapts to dark/light mode */}
      <motion.div 
        animate={{ backgroundColor: isDark ? "rgba(5, 0, 8, 0.28)" : "rgba(255, 255, 255, 0.52)" }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="absolute inset-0 backdrop-blur-[54px]" 
      />
    </motion.div>
  );
}

/** A floating stack of band cards with overlap + drop shadows + slight tilt.
    Soft, layered, modern — gives the page a "fresh" hero visual without 3D assets. */
function FloatingBandStack() {
  return (
    <div className="relative h-[260px] w-[280px]">
      {/* Background glow behind the stack */}
      <div
        aria-hidden
        className="absolute inset-6 rounded-[44px] bg-gradient-to-br from-sky-200/60 via-sky-100/30 to-amber-100/40 blur-2xl"
      />

      {/* Cards — layered with progressive rotation and y-offset */}
      <BandCard
        band="6.0"
        label="Modest"
        tint="rose"
        className="absolute left-0 top-[148px] rotate-[-9deg] z-[1]"
        scale={0.85}
      />
      <BandCard
        band="7.0"
        label="Good"
        tint="sky"
        className="absolute left-[34px] top-[96px] rotate-[-4deg] z-[2]"
        scale={0.92}
      />
      <BandCard
        band="8.0"
        label="Very good"
        tint="violet"
        className="absolute left-[78px] top-[50px] rotate-[2deg] z-[3]"
      />
      <BandCard
        band="9.0"
        label="Expert"
        tint="gold"
        className="absolute left-[130px] top-[6px] rotate-[8deg] z-[4]"
        hero
      />

      {/* Subtle "you're here" pointer near the lower card */}
      <div className="absolute left-[-12px] top-[200px] z-[5]">
        <div className="inline-flex items-center gap-1.5 bg-ink text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-md">
          You're here
        </div>
      </div>
    </div>
  );
}

function BandCard({
  band,
  label,
  tint,
  className,
  hero = false,
  scale = 1,
}: {
  band: string;
  label: string;
  tint: "sky" | "rose" | "violet" | "gold";
  className?: string;
  hero?: boolean;
  scale?: number;
}) {
  const tones: Record<typeof tint, { bg: string; ring: string; numColor: string; labelColor: string }> = {
    sky: {
      bg: "bg-gradient-to-br from-white to-sky-50",
      ring: "ring-sky-200/70",
      numColor: "text-sky-700",
      labelColor: "text-sky-600/70",
    },
    rose: {
      bg: "bg-gradient-to-br from-white to-rose-50",
      ring: "ring-rose-200/60",
      numColor: "text-rose-600",
      labelColor: "text-rose-500/70",
    },
    violet: {
      bg: "bg-gradient-to-br from-white to-violet-50",
      ring: "ring-violet-200/60",
      numColor: "text-violet-700",
      labelColor: "text-violet-600/70",
    },
    gold: {
      bg: "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500",
      ring: "ring-amber-200/70",
      numColor: "text-white drop-shadow-sm",
      labelColor: "text-white/80",
    },
  };
  const t = tones[tint];
  return (
    <div
      className={cn(
        "w-[100px] rounded-3xl px-4 py-3.5 flex flex-col items-center ring-1",
        "shadow-[0_18px_38px_-12px_rgba(15,23,42,0.18)]",
        t.bg,
        t.ring,
        hero && "shadow-[0_22px_48px_-12px_rgba(245,158,11,0.55)]",
        className,
      )}
      style={{ transform: `${className?.includes("rotate") ? "" : ""} scale(${scale})` }}
    >
      <span className={cn("text-[34px] font-extrabold tabular-nums leading-none", t.numColor)}>
        {band}
      </span>
      <span className={cn("mt-1 text-[10px] font-bold uppercase tracking-[0.1em]", t.labelColor)}>
        {label}
      </span>
      {hero && <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-amber-200 drop-shadow-md" />}
    </div>
  );
}

/* === Decorative micro-elements floating around the hero === */
function DecorStar({
  className,
  delay = 0,
  size = 16,
}: {
  className: string;
  delay?: number;
  size?: number;
}) {
  return (
    <Sparkles
      aria-hidden
      className={cn("absolute animate-[twinkle_2.6s_ease-in-out_infinite] drop-shadow", className)}
      style={{ animationDelay: `${delay}s`, height: size, width: size }}
    />
  );
}

function NameScreen({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
}) {
  const valid = value.trim().length >= 2;
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col items-center justify-center text-center mt-10">
        <LumiScene mood="wave" size="sm" variant="name" />
        <h1 className="mt-8 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
          What should I call you?
        </h1>
        <p className="mt-2 text-sm text-ink/55 font-medium">I'll get the spelling right, promise.</p>
        <input
          autoFocus
          type="text"
          maxLength={40}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) onContinue();
          }}
          placeholder="Your name"
          className="mt-8 w-full max-w-xs text-center text-xl font-bold py-4 rounded-2xl bg-white border-2 border-ink/10 focus:border-violet-400 focus:outline-none placeholder:text-ink/25 shadow-[0_8px_24px_-12px_rgba(139,92,246,0.25)]"
        />
      </div>
      <Footer>
        <PrimaryButton onClick={onContinue} disabled={!valid}>
          Continue
        </PrimaryButton>
      </Footer>
    </ScreenShell>
  );
}

function ModuleScreen({
  name,
  onPick,
}: {
  name: string;
  onPick: (m: IeltsModule) => void;
}) {
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col justify-center mt-10">
        <div className="flex flex-col items-center text-center">
          <LumiScene mood="wave" size="sm" variant="name" compact />
          <h1 className="mt-6 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
            Nice to meet you, <span className="bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">{name}</span>!
          </h1>
          <p className="mt-3 text-base text-ink/55 font-medium">
            Which IELTS are you taking?
          </p>
        </div>
        <div className="mt-8 space-y-3">
          <BigChoice
            onClick={() => onPick("academic")}
            icon={GraduationCap}
            label="Academic"
            sub="For university & professional registration"
          />
          <BigChoice
            onClick={() => onPick("general-training")}
            icon={Briefcase}
            label="General Training"
            sub="For migration, work & vocational"
          />
        </div>
      </div>
    </ScreenShell>
  );
}

function PlacementScreen({ onSkip }: { onSkip: () => void }) {
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col items-center justify-center text-center mt-10">
        <LumiScene size="xxl" mood="thinking" variant="placement" />
        <h1 className="mt-7 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
          The important bit.
        </h1>
        <p className="mt-3 text-base text-ink/60 font-medium leading-relaxed max-w-xs">
          A quick <strong className="text-ink">5-minute test</strong> so I can actually
          personalize your lessons — instead of guessing.
        </p>

      </div>
      <Footer>
        <PrimaryLink href="/placement?from=onboarding">Start placement</PrimaryLink>
        <button
          onClick={onSkip}
          className="mt-3 w-full text-center text-xs font-semibold text-white/40 hover:text-white/75 py-2"
        >
          I'll do it later
        </button>
      </Footer>
    </ScreenShell>
  );
}

function PlacementCelebrationScreen({
  placement,
  name,
  reviewMode,
  onContinue,
  onRetake,
}: {
  placement: PlacementResult;
  name: string;
  reviewMode: boolean;
  onContinue: () => void;
  onRetake: () => void;
}) {
  const affirmation = pickPhrase(PLACEMENT_AFFIRMATIONS, placement.cefr + name);
  return (
    <div className="flex-1 flex flex-col text-center px-6 animate-[fadeIn_320ms_ease-out] relative overflow-hidden">
      <ConfettiBurst />
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative">
          <SunRays />
          <LumiScene size="xxl" mood="celebrate" variant="celebrate" />
          <SparkleParticles />
        </div>
        <div className="mt-7 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-[#2b063d] shadow-[0_10px_22px_rgba(0,0,0,0.18)] animate-[bounceIn_500ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          {affirmation}
        </div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-[1.05] animate-[fadeUp_500ms_300ms_both]">
          You're at <span className="text-sky-600">{placement.cefr}</span>, {name}!
        </h1>
        <div className="mt-6 inline-flex items-baseline gap-3 bg-white rounded-3xl px-7 py-4 border-2 border-sky-200 shadow-[0_4px_0_rgba(14,165,233,0.08)] animate-[bounceIn_550ms_550ms_cubic-bezier(0.34,1.56,0.64,1)_both]">
          <span className="text-5xl font-extrabold text-sky-600 tabular-nums">
            {placement.cefr}
          </span>
          <span className="text-base font-semibold text-ink/60">
            ≈ Band {placement.estimatedBand.toFixed(1)}
          </span>
        </div>
        <p className="mt-7 text-base text-ink/65 font-medium max-w-xs animate-[fadeUp_500ms_800ms_both]">
          That's your starting line. Let's chart the path up.
        </p>
      </div>
      {reviewMode ? (
        <Footer>
          <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
          <button
            onClick={onRetake}
            className="mt-3 w-full text-center text-xs font-semibold text-white/40 hover:text-white/75 py-2"
          >
            Retake placement
          </button>
        </Footer>
      ) : null}
    </div>
  );
}

function PlanOfferScreen({
  placement,
  name,
  submitting,
  onBuild,
  onSkip,
}: {
  placement: PlacementResult | null;
  name: string;
  submitting: SubmitMode | null;
  onBuild: () => void;
  onSkip: () => void;
}) {
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col items-center justify-center text-center mt-10">
        <LumiScene size="xxl" mood="wave" variant="plan" />
        <h1 className="mt-7 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
          {placement ? "Want a daily plan?" : `Ready when you are, ${name}.`}
        </h1>
        <p className="mt-4 text-base text-white/70 font-medium leading-relaxed max-w-xs">
          {placement
            ? "I'll map a step-by-step path from where you are to your target band."
            : "We can refine your placement later. Want a daily plan now, or jump in?"}
        </p>
      </div>
      <Footer>
        <PrimaryButton onClick={onBuild}>Build my daily plan</PrimaryButton>
        <SkipLink onSkip={onSkip} submitting={submitting} label="Skip — just take me in" />
      </Footer>
    </ScreenShell>
  );
}

function TargetScreen({
  value,
  minBand,
  onChange,
  onContinue,
  onSkip,
}: {
  value: number;
  minBand: number;
  onChange: (v: number) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const maxBand = 9;
  const progress = ((value - minBand) / (maxBand - minBand)) * 100;
  const marks = [4, 5, 6, 7, 8, 9];
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col items-center justify-center mt-10">
        <LumiScene size="sm" mood="writing" variant="target" compact />
        <h1 className="mt-5 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink text-center leading-[1.1]">
          What band are you aiming for?
        </h1>
        <motion.div 
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mt-10 flex flex-col items-center"
        >
          <div className="text-[5.5rem] font-extrabold tabular-nums tracking-tight bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent leading-none drop-shadow-sm">
            {value.toFixed(1)}
          </div>
          <p className="mt-2 text-xs font-bold text-violet-500 uppercase tracking-[0.18em]">
            {bandLabel(value)}
          </p>
        </motion.div>
        <div className="mt-10 w-full max-w-xs">
          <div className="relative px-1 pb-8 pt-4">
            <input
              type="range"
              min={minBand}
              max={maxBand}
              step={0.5}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              aria-label="Target IELTS band"
              className="band-slider relative z-10 w-full"
              style={{
                background: `linear-gradient(90deg, #f0abfc 0%, #a855f7 ${progress}%, rgba(255,255,255,0.14) ${progress}%, rgba(255,255,255,0.14) 100%)`,
              }}
            />
            <div className="pointer-events-none absolute left-1 right-1 top-[21px] flex justify-between">
              {marks.map((mark) => (
                <span
                  key={mark}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border border-[#12031d]",
                    mark <= value ? "bg-fuchsia-200" : "bg-[#1d0b28]",
                  )}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-between text-[11px] font-black tabular-nums text-white/55">
              {marks.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  onClick={() => onChange(mark)}
                  className={cn(
                    "rounded-full px-1.5 py-1 transition",
                    Math.floor(value) === mark
                      ? "text-fuchsia-100"
                      : "hover:text-white",
                  )}
                >
                  {mark.toFixed(0)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer>
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        <SkipLink onSkip={onSkip} submitting={null} label="Skip for now" />
      </Footer>
    </ScreenShell>
  );
}

function DateScreen({
  value,
  today,
  onChange,
  onContinue,
  onSkip,
}: {
  value: string;
  today: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;
  const days = valid ? daysUntil(value) : null;
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col items-center justify-center mt-10">
        <LumiScene size="md" mood="thinking" variant="date" />
        <h1 className="mt-6 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink text-center leading-[1.1]">
          When's your exam?
        </h1>
        <input
          type="date"
          min={today}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-7 w-full max-w-xs text-center text-xl font-bold py-4 rounded-2xl bg-white border-2 border-ink/10 focus:border-violet-400 focus:outline-none shadow-[0_8px_24px_-12px_rgba(139,92,246,0.25)] transition-shadow"
        />
        <AnimatePresence>
          {days !== null && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 text-sm font-semibold text-ink/55"
            >
              <span className="text-3xl font-extrabold bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent tabular-nums">
                {days}
              </span>{" "}
              days to go
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <Footer>
        <PrimaryButton onClick={onContinue} disabled={!valid}>
          Continue
        </PrimaryButton>
        <SkipLink onSkip={onSkip} submitting={null} label="Skip for now" />
      </Footer>
    </ScreenShell>
  );
}

const TIME_TIERS: Array<{ minutes: number; emoji: string; label: string; sub: string }> = [
  { minutes: 15, emoji: "☕", label: "Casual", sub: "15 minutes / day" },
  { minutes: 45, emoji: "📚", label: "Regular", sub: "45 minutes / day" },
  { minutes: 90, emoji: "⚡", label: "Serious", sub: "90 minutes / day" },
  { minutes: 120, emoji: "🔥", label: "Intense", sub: "2+ hours / day" },
];

function TimeScreen({
  value,
  onPick,
  onSkip,
  submitting,
}: {
  value: number;
  onPick: (m: number) => void;
  onSkip: () => void;
  submitting: SubmitMode | null;
}) {
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col justify-center mt-10">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <LumiScene size="sm" mood="default" variant="time" compact />
          </div>
          <h1 className="text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
            How much time daily?
          </h1>
          <p className="mt-3 text-sm font-semibold text-ink/55">
            Consistency &gt; intensity.
          </p>
        </div>
        <div className="mt-8 space-y-2.5">
          {TIME_TIERS.map((tier, idx) => {
            const active = value === tier.minutes;
            return (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={tier.minutes}
                onClick={() => onPick(tier.minutes)}
                className={cn(
                  "w-full text-left rounded-2xl p-4 flex items-center gap-4 transition-all border-2",
                  "shadow-[0_8px_24px_-16px_rgba(139,92,246,0.25)] active:scale-[0.98]",
                  active
                    ? "bg-violet-50 border-violet-400 scale-[1.02]"
                    : "bg-white/80 backdrop-blur-sm border-ink/8 hover:border-violet-200 hover:bg-white",
                )}
              >
                <div className="text-3xl">{tier.emoji}</div>
                <div className="flex-1">
                  <div className="font-extrabold text-base text-ink">{tier.label}</div>
                  <div className="text-xs font-semibold text-ink/55 mt-0.5">{tier.sub}</div>
                </div>
                {active && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"
                  >
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
      <Footer>
        <SkipLink onSkip={onSkip} submitting={submitting} />
      </Footer>
    </ScreenShell>
  );
}

const SKILL_META: Array<{
  key: SkillArea;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "writing", label: "Writing", icon: PenLine },
  { key: "speaking", label: "Speaking", icon: Mic },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "vocabulary", label: "Vocabulary", icon: Sparkles },
  { key: "grammar", label: "Grammar", icon: GraduationCap },
];

function WeakScreen({
  selected,
  onToggle,
  onContinue,
}: {
  selected: SkillArea[];
  onToggle: (k: SkillArea) => void;
  onContinue: () => void;
}) {
  const valid = selected.length >= 1;
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col justify-center mt-10">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <LumiScene size="md" mood="writing" variant="weak" />
          </div>
          <h1 className="text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
            Which skills need work?
          </h1>
          <p className="mt-3 text-sm font-semibold text-ink/55">
            Pick one or more. I'll focus your plan here.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {SKILL_META.map(({ key, label, icon: Icon }, idx) => {
            const active = selected.includes(key);
            return (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={key}
                onClick={() => onToggle(key)}
                className={cn(
                  "rounded-2xl p-5 flex flex-col items-center gap-2.5 transition-all border-2",
                  "shadow-[0_8px_24px_-16px_rgba(139,92,246,0.25)] active:scale-[0.98]",
                  active
                    ? "bg-violet-50 border-violet-400 text-violet-700 scale-[1.02]"
                    : "bg-white/80 backdrop-blur-sm border-ink/8 text-ink/65 hover:border-violet-200 hover:bg-white",
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-extrabold">{label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <Footer>
        <PrimaryButton onClick={onContinue} disabled={!valid}>
          Continue
        </PrimaryButton>
      </Footer>
    </ScreenShell>
  );
}

function ReadyScreen({
  name,
  targetBand,
  examDate,
  submitting,
  error,
  onGenerate,
  onSkip,
}: {
  name: string;
  targetBand: number;
  examDate: string;
  submitting: SubmitMode | null;
  error: string | null;
  onGenerate: () => void;
  onSkip: () => void;
}) {
  return (
    <ScreenShell>
      <div className="relative flex-1 flex flex-col items-center justify-center text-center mt-10">
        <LumiScene size="xxl" mood="celebrate" variant="ready" />
        <h1 className="mt-7 text-3xl sm:text-[2.4rem] font-extrabold tracking-tight text-ink leading-[1.1]">
          You're all set, <span className="bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">{name}</span>!
        </h1>
        <p className="mt-4 text-base text-ink/60 font-medium leading-relaxed max-w-xs bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white/80 shadow-sm">
          Targeting{" "}
          <strong className="bg-gradient-to-br from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Band {targetBand.toFixed(1)}
          </strong>
          {examDate && (
            <>
              {" "}by <strong className="text-ink">{humanDate(examDate)}</strong>
            </>
          )}
          .
        </p>
        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 max-w-xs">
            {error}
          </div>
        )}
      </div>
      <Footer>
        <PrimaryButton onClick={onGenerate} disabled={submitting !== null}>
          {submitting === "withPlan" ? "Building…" : "Generate my plan ✨"}
        </PrimaryButton>
        <SkipLink
          onSkip={onSkip}
          submitting={submitting}
          label="Just save my profile for now"
        />
      </Footer>
    </ScreenShell>
  );
}

// ============================================================
// Visual primitives
// ============================================================

function ScreenShell({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col w-full h-full">{children}</div>;
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="pt-4">{children}</div>;
}

/** CSS-only confetti rain — 24 colored pieces, randomized trajectories. */
function ConfettiBurst() {
  const pieces = useMemo(() => {
    const colors = ["#0ea5e9", "#38bdf8", "#fbbf24", "#fb7185", "#a78bfa", "#34d399"];
    return Array.from({ length: 24 }, (_, i) => ({
      left: `${(i * 4.2 + 6) % 100}%`,
      bg: colors[i % colors.length]!,
      delay: (i % 8) * 0.12,
      duration: 2 + ((i * 7) % 100) / 100,
      size: 6 + (i % 4) * 2,
      isCircle: i % 3 === 0,
    }));
  }, []);
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-10%] animate-[confettiFall_2.5s_linear_forwards]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.bg,
            borderRadius: p.isCircle ? "9999px" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Rotating ray halo, used behind celebration mascots. */
function SunRays() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -m-16 flex items-center justify-center pointer-events-none"
    >
      <svg
        width="240"
        height="240"
        viewBox="0 0 240 240"
        className="animate-[raysSpin_16s_linear_infinite]"
      >
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 120 + Math.cos(angle) * 60;
          const y1 = 120 + Math.sin(angle) * 60;
          const x2 = 120 + Math.cos(angle) * 110;
          const y2 = 120 + Math.sin(angle) * 110;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 2 === 0 ? "#fbbf24" : "#0ea5e9"}
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.55"
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Staggered floating sparkles orbiting a hero element. */
function SparkleParticles() {
  const sparkles = [
    { className: "-top-3 -right-3 h-7 w-7", delay: 0, color: "text-amber-400" },
    { className: "-bottom-2 -left-3 h-5 w-5", delay: 0.4, color: "text-amber-400" },
    { className: "top-1/2 -right-7 h-4 w-4", delay: 0.8, color: "text-sky-400" },
    { className: "-top-5 left-1/2 h-4 w-4", delay: 1.2, color: "text-amber-300" },
    { className: "bottom-0 -right-5 h-3 w-3", delay: 1.6, color: "text-sky-300" },
  ];
  return (
    <>
      {sparkles.map((s, i) => (
        <Sparkles
          key={i}
          aria-hidden
          className={cn(
            "absolute drop-shadow-md animate-[twinkle_2.4s_ease-in-out_infinite]",
            s.className,
            s.color,
          )}
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
    </>
  );
}

function LumiScene({
  mood,
  size,
  variant,
  compact = false,
}: {
  mood: "default" | "wave" | "thinking" | "celebrate" | "writing";
  size: "sm" | "md" | "lg" | "xl" | "xxl";
  variant: "name" | "placement" | "celebrate" | "plan" | "target" | "date" | "time" | "weak" | "ready";
  compact?: boolean;
}) {
  const propsByVariant: Record<typeof variant, React.ReactNode> = {
    name: (
      <>
        <span className="absolute bottom-8 left-8 h-8 w-14 -rotate-12 rounded-[10px] bg-white/18" />
      </>
    ),
    placement: (
      <>
        <span className="absolute bottom-9 left-8 h-9 w-20 -rotate-6 rounded-xl border border-violet-300/50 bg-[#2a0d3b]" />
        <span className="absolute bottom-12 left-12 h-2 w-10 rounded-full bg-fuchsia-300" />
        <span className="absolute right-8 top-10 text-2xl font-black text-amber-200">?</span>
      </>
    ),
    celebrate: (
      <>
        <span className="absolute left-5 top-10 h-10 w-10 rotate-12 rounded-xl bg-amber-300/90" />
        <span className="absolute bottom-11 right-8 h-8 w-8 -rotate-12 rounded-lg bg-fuchsia-300/85" />
      </>
    ),
    plan: (
      <>
        <span className="absolute bottom-8 left-10 h-11 w-16 -rotate-12 rounded-xl bg-white/18" />
        <span className="absolute bottom-14 right-10 h-7 w-12 rotate-12 rounded-lg border border-fuchsia-200/50 bg-fuchsia-300/20" />
      </>
    ),
    target: (
      <>
        <span className="absolute bottom-8 left-9 h-12 w-12 rounded-full border-[6px] border-amber-200/90" />
        <span className="absolute bottom-[50px] left-[54px] h-4 w-4 rounded-full bg-amber-200" />
      </>
    ),
    date: (
      <>
        <span className="absolute bottom-8 left-8 h-14 w-16 rotate-[-8deg] rounded-2xl bg-white/18" />
        <span className="absolute bottom-[58px] left-12 h-1.5 w-8 rounded-full bg-fuchsia-300" />
        <span className="absolute bottom-[46px] left-12 h-1.5 w-10 rounded-full bg-white/45" />
      </>
    ),
    time: (
      <>
        <span className="absolute bottom-8 left-10 h-12 w-12 rounded-full border-[5px] border-fuchsia-200/70" />
        <span className="absolute bottom-[53px] left-[62px] h-5 w-1.5 origin-bottom rotate-45 rounded-full bg-fuchsia-200" />
      </>
    ),
    weak: (
      <>
        <span className="absolute bottom-8 left-7 h-10 w-20 -rotate-6 rounded-xl bg-[#2a0d3b] ring-1 ring-fuchsia-300/35" />
        <span className="absolute bottom-[50px] left-10 h-2 w-11 rounded-full bg-amber-200" />
      </>
    ),
    ready: (
      <>
        <span className="absolute bottom-9 left-8 h-10 w-16 -rotate-12 rounded-xl bg-amber-300/90" />
        <span className="absolute bottom-9 right-8 h-10 w-16 rotate-12 rounded-xl bg-fuchsia-300/80" />
      </>
    ),
  };

  return (
    <div className={cn("relative mx-auto", compact ? "h-[132px] w-[170px]" : size === "xxl" ? "h-[280px] w-[340px]" : "h-[220px] w-[260px]")}>
      <div
        aria-hidden
        className="absolute bottom-3 left-1/2 h-10 w-[70%] -translate-x-1/2 rounded-full bg-fuchsia-300/18 blur-xl"
      />
      <div className="absolute inset-0">{propsByVariant[variant]}</div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[58%]">
        <FriendlyMascot mood={mood} size={size} />
      </div>
    </div>
  );
}

/** Inline keyframes shared across visual primitives. */
function VisualKeyframes() {
  return (
    <style jsx global>{`
      .onboarding-dark .text-ink {
        color: rgba(255, 255, 255, 0.96) !important;
      }
      .onboarding-dark h1,
      .onboarding-dark h2,
      .onboarding-dark h3,
      .onboarding-dark strong {
        color: rgba(255, 255, 255, 0.96);
      }
      .onboarding-dark p {
        color: rgba(255, 255, 255, 0.66);
      }
      .onboarding-dark .text-ink\\/25 {
        color: rgba(255, 255, 255, 0.25) !important;
      }
      .onboarding-dark .text-ink\\/40 {
        color: rgba(255, 255, 255, 0.4) !important;
      }
      .onboarding-dark .text-ink\\/45 {
        color: rgba(255, 255, 255, 0.45) !important;
      }
      .onboarding-dark .text-ink\\/50 {
        color: rgba(255, 255, 255, 0.5) !important;
      }
      .onboarding-dark .text-ink\\/55 {
        color: rgba(255, 255, 255, 0.55) !important;
      }
      .onboarding-dark .text-ink\\/60 {
        color: rgba(255, 255, 255, 0.6) !important;
      }
      .onboarding-dark .text-ink\\/65 {
        color: rgba(255, 255, 255, 0.65) !important;
      }
      .onboarding-dark .text-ink\\/70 {
        color: rgba(255, 255, 255, 0.7) !important;
      }
      .onboarding-dark .text-ink\\/75 {
        color: rgba(255, 255, 255, 0.75) !important;
      }
      .onboarding-dark .bg-white\\/50,
      .onboarding-dark .bg-white\\/60,
      .onboarding-dark .bg-white\\/80,
      .onboarding-dark .bg-white\\/90 {
        background-color: rgba(45, 17, 65, 0.72) !important;
      }
      .onboarding-dark .border-ink\\/8,
      .onboarding-dark .border-ink\\/10 {
        border-color: rgba(216, 180, 254, 0.24) !important;
      }
      .band-slider {
        height: 12px;
        border-radius: 999px;
        appearance: none;
        -webkit-appearance: none;
        outline: none;
        box-shadow: inset 0 0 0 1px rgba(216, 180, 254, 0.12);
      }
      .band-slider::-webkit-slider-runnable-track {
        height: 12px;
        border-radius: 999px;
      }
      .band-slider::-webkit-slider-thumb {
        appearance: none;
        -webkit-appearance: none;
        height: 34px;
        width: 34px;
        margin-top: -11px;
        border-radius: 999px;
        border: 5px solid #f5d0fe;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(168, 85, 247, 0.44), 0 0 0 5px rgba(240, 171, 252, 0.14);
        cursor: grab;
      }
      .band-slider:active::-webkit-slider-thumb {
        cursor: grabbing;
        transform: scale(1.05);
      }
      .band-slider::-moz-range-track {
        height: 12px;
        border-radius: 999px;
        background: transparent;
      }
      .band-slider::-moz-range-thumb {
        height: 24px;
        width: 24px;
        border-radius: 999px;
        border: 5px solid #f5d0fe;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(168, 85, 247, 0.44), 0 0 0 5px rgba(240, 171, 252, 0.14);
        cursor: grab;
      }
      @keyframes confettiFall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
        60% { opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0.2; }
      }
      @keyframes raysSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes twinkle {
        0%, 100% { opacity: 0.4; transform: scale(0.85); }
        50% { opacity: 1; transform: scale(1.1); }
      }
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.6); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}

/**
 * Lumi — our friendly character mascot.
 * A soft rounded blob with a face — gives the product a consistent personality
 * across every screen. Mood/accessory variants let it adapt to context.
 */
function FriendlyMascot({
  mood = "default",
  size = "md",
}: {
  mood?: "default" | "wave" | "thinking" | "celebrate" | "writing";
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
}) {
  const dims = {
    sm: { w: 96, h: 110 },
    md: { w: 130, h: 150 },
    lg: { w: 170, h: 195 },
    xl: { w: 200, h: 230 },
    xxl: { w: 260, h: 300 },
  } as const;
  const { w, h } = dims[size];

  return (
    <motion.div 
      initial={{ scale: 0.9, y: 10 }}
      animate={{ scale: 1, y: [0, -8, 0] }}
      transition={{ 
        scale: { type: "spring", stiffness: 300, damping: 20 },
        y: { duration: 3.6, ease: "easeInOut", repeat: Infinity } 
      }}
      className="relative" 
      style={{ width: w, height: h }}
    >
      <svg width={w} height={h} viewBox="0 0 200 230" fill="none" className="drop-shadow-[0_18px_24px_rgba(139,92,246,0.28)]">
        <defs>
          <linearGradient id="lumiBody" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#e9d5ff" />
            <stop offset="55%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <radialGradient id="lumiCheek" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lumiHighlight" x1="0.3" y1="0.1" x2="0.6" y2="0.6">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft ground shadow */}
        <ellipse cx="100" cy="218" rx="52" ry="6" fill="#8b5cf6" opacity="0.16" />

        {/* Body — squashed-rounded blob */}
        <path
          d="M40 110
             C 40 50, 70 30, 100 30
             C 130 30, 160 50, 160 110
             C 160 175, 130 195, 100 195
             C 70 195, 40 175, 40 110 Z"
          fill="url(#lumiBody)"
        />

        {/* Glossy highlight */}
        <path
          d="M55 75
             C 60 55, 80 45, 95 50
             C 80 60, 70 75, 70 95 Z"
          fill="url(#lumiHighlight)"
        />

        {/* Cheeks */}
        <ellipse cx="68" cy="130" rx="10" ry="6" fill="url(#lumiCheek)" />
        <ellipse cx="132" cy="130" rx="10" ry="6" fill="url(#lumiCheek)" />

        {/* Eyes */}
        {mood === "thinking" ? (
          <>
            <path d="M75 108 Q83 102 91 108" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M109 108 Q117 102 125 108" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="83" cy="108" rx="5" ry="7" fill="white" />
            <ellipse cx="117" cy="108" rx="5" ry="7" fill="white" />
            <circle cx="84" cy="110" r="2.5" fill="#1e1b4b" />
            <circle cx="118" cy="110" r="2.5" fill="#1e1b4b" />
          </>
        )}

        {/* Mouth */}
        {mood === "celebrate" ? (
          // Open happy mouth
          <ellipse cx="100" cy="138" rx="11" ry="9" fill="#1e1b4b" />
        ) : (
          // Default smile
          <path
            d="M85 135 Q100 152 115 135"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Tiny waving arm for wave mood */}
        {mood === "wave" && (
          <g transform="translate(155 95)" className="origin-bottom-left">
            <motion.path
              animate={{ rotate: [0, 20, 0, 20, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              d="M0 0 Q 10 -15 20 -5"
              stroke="#8b5cf6"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              style={{ transformOrigin: "0% 100%" }}
            />
            <motion.circle 
              animate={{ rotate: [0, 20, 0, 20, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              cx="22" cy="-5" r="7" fill="#c4b5fd" 
              style={{ transformOrigin: "-22px 5px" }}
            />
          </g>
        )}

        {/* Pencil for writing mood */}
        {mood === "writing" && (
          <g transform="translate(132 145) rotate(-30)">
            <rect x="0" y="0" width="32" height="6" rx="2" fill="#fbbf24" />
            <polygon points="32,0 38,3 32,6" fill="#1f2937" />
          </g>
        )}
      </svg>

      {/* Accent sparkles around */}
      <Sparkles
        aria-hidden
        className="absolute -top-2 -right-1 h-5 w-5 text-amber-400 animate-[twinkle_2.6s_ease-in-out_infinite] drop-shadow"
      />
      <Sparkles
        aria-hidden
        className="absolute top-6 -left-3 h-3 w-3 text-violet-400 animate-[twinkle_2.6s_ease-in-out_infinite] drop-shadow"
        style={{ animationDelay: "0.8s" }}
      />
    </motion.div>
  );
}

/**
 * Brand mascot — consistent across the flow:
 *   - Default: solid sky-blue gradient (brand)
 *   - accent=true: sky + amber for hero / celebration moments
 *   - size lg: 128px for major celebrations
 */
function Mascot({
  icon: Icon,
  size = "md",
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  size?: "md" | "lg";
  accent?: boolean;
}) {
  const dim = size === "lg" ? "h-32 w-32" : "h-24 w-24";
  const iconDim = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const gradient = accent ? "from-sky-400 to-sky-600" : "from-sky-400 to-sky-600";
  const ringTint = accent ? "bg-amber-300/30" : "bg-sky-300/30";
  return (
    <div className="relative animate-[bob_3.4s_ease-in-out_infinite]">
      <div
        aria-hidden
        className={cn("absolute inset-0 rounded-full blur-2xl -z-10", ringTint)}
      />
      <div
        className={cn(
          "relative rounded-full bg-gradient-to-br flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(14,165,233,0.5)]",
          gradient,
          dim,
        )}
      >
        <Icon className={cn("text-white drop-shadow-sm", iconDim)} />
        {accent && (
          <div className="absolute inset-1.5 rounded-full ring-2 ring-white/30 pointer-events-none" />
        )}
      </div>
    </div>
  );
}

/**
 * Modern primary CTA: gradient pill with layered highlight + colored glow.
 * Linear / Apple Intelligence vibe — feels premium and inviting.
 */
function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = "dark",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "dark" | "light";
}) {
  const baseStyle = "bg-white hover:bg-slate-50 text-[#11051c] shadow-white/10";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative w-full rounded-full py-[1.15rem] px-6 text-[15px] font-extrabold transition-all overflow-hidden tracking-tight shadow-lg",
        disabled ? "opacity-45 cursor-not-allowed bg-white/35 text-[#11051c]/45 shadow-none" : `${baseStyle} hover:-translate-y-0.5 active:translate-y-0`,
      )}
    >
      <span className="relative inline-flex items-center justify-center gap-1.5">
        {children}
      </span>
    </button>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative block w-full text-center rounded-full bg-white py-[1.15rem] px-6 text-[15px] font-extrabold text-[#11051c] tracking-tight transition-all overflow-hidden hover:-translate-y-0.5 hover:bg-slate-50 shadow-lg shadow-white/10"
    >
      <span className="relative">{children}</span>
    </Link>
  );
}

/**
 * Big tappable choice — pillowy card with soft colored shadow tinted by tone.
 * Brand tone = sky (cool primary); accent tone = amber (warm secondary).
 */
function BigChoice({
  onClick,
  icon: Icon,
  label,
  sub,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-3xl p-5 flex items-center gap-4 bg-white/90 backdrop-blur-sm border-[1.5px] border-slate-100 transition-all",
        "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_32px_-12px_rgba(0,0,0,0.1)]",
        "hover:-translate-y-0.5 active:translate-y-0.5 hover:border-slate-200"
      )}
    >
      <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#F7F9FA] text-slate-600 transition-colors group-hover:bg-slate-100 group-hover:text-ink">
        <Icon className="w-[22px] h-[22px]" />
      </div>
      <div className="flex-1">
        <h3 className="font-extrabold text-[17px] text-ink tracking-tight transition-colors">{label}</h3>
        <p className="text-[13.5px] text-ink/50 font-medium leading-snug mt-0.5">{sub}</p>
      </div>
      <div className="text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-400">
        <ArrowRight className="w-5 h-5 opacity-70" />
      </div>
    </button>
  );
}

function BulletCheck({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm font-semibold text-ink/75">
      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-sm">
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </div>
      {children}
    </div>
  );
}

function SkipLink({
  onSkip,
  submitting,
  label = "Skip rest — take me to the app",
}: {
  onSkip: () => void;
  submitting: SubmitMode | null;
  label?: string;
}) {
  return (
    <button
      onClick={onSkip}
      disabled={submitting !== null}
      className="mt-3 w-full text-center text-xs font-semibold text-white/40 hover:text-white/75 py-2 disabled:opacity-40"
    >
      {submitting === "withoutPlan" ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// ============================================================
// Plan-build loading screen
// ============================================================

function BuildingPlanScreen({ name }: { name: string }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % PLAN_BUILDER_PHRASES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="onboarding-dark min-h-[100dvh] flex items-center justify-center px-6 bg-[#050008] relative overflow-hidden">
      <VisualKeyframes />
      <DynamicBackground stage="plan-offer" />

      <div className="relative max-w-sm w-full text-center z-10">
        <div className="relative mx-auto mb-7 h-[220px] w-[280px]">
          <div
            aria-hidden
            className="absolute left-1/2 top-[48%] h-[168px] w-[168px] -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
              className="h-full w-full rounded-full border-[10px] border-fuchsia-200/12 border-t-fuchsia-200"
            />
          </div>
          <div
            aria-hidden
            className="absolute left-1/2 top-[48%] h-[208px] w-[208px] -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "linear" }}
              className="h-full w-full rounded-full border border-violet-200/20 border-b-fuchsia-300/60"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FriendlyMascot mood="writing" size="xl" />
          </div>
          <motion.div
            aria-hidden
            animate={{ y: [0, -7, 0], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-9 left-1/2 h-6 w-36 -translate-x-1/2 rounded-full bg-fuchsia-300/18 blur-xl"
          />
        </div>

        <h1 className="text-3xl font-black tracking-tight leading-tight text-white">
          {name ? `Hang tight, ${name} —` : "Hang tight —"}
        </h1>
        <p key={phraseIdx} className="mx-auto mt-3 max-w-[290px] text-[1.35rem] font-black leading-snug text-white animate-[fadeIn_400ms_ease-out]">
          {PLAN_BUILDER_PHRASES[phraseIdx]}
        </p>
        <p className="mt-3 text-sm font-semibold text-white/48">
          Building your lesson path
        </p>

        <div className="mx-auto mt-8 h-2 max-w-[260px] overflow-hidden rounded-full bg-white/12">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-300 to-violet-300"
            animate={{ x: ["-85%", "120%"] }}
            transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: "70%" }}
          />
        </div>

        <p className="mt-10 text-[11px] font-semibold text-white/30 leading-relaxed">
          Please keep this screen open.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function bandLabel(band: number): string {
  if (band >= 8.5) return "Expert";
  if (band >= 7.5) return "Very good";
  if (band >= 6.5) return "Good";
  if (band >= 5.5) return "Competent";
  if (band >= 4.5) return "Modest";
  return "Limited";
}

function daysUntil(yyyyMmDd: string): number {
  const target = new Date(yyyyMmDd + "T00:00:00").getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return Math.max(0, Math.round((target - today) / 86_400_000));
}

function humanDate(yyyyMmDd: string): string {
  const d = new Date(yyyyMmDd + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
