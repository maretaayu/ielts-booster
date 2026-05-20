"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  Headphones,
  Mic,
  PenLine,
  Sparkles,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";

type SkillKey = "listening" | "reading" | "writing" | "speaking";

const SKILLS: Array<{
  key: SkillKey;
  label: string;
  duration: string;
  questions: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  blurb: string;
}> = [
  {
    key: "listening",
    label: "Listening",
    duration: "30 min + 10 min transfer",
    questions: "40 questions, 4 sections",
    icon: Headphones,
    tint: "bg-sky-100 text-sky-700",
    blurb: "Recordings played once. Mix of conversations, monologues, and lectures.",
  },
  {
    key: "reading",
    label: "Reading",
    duration: "60 min",
    questions: "40 questions, 3 passages",
    icon: BookOpen,
    tint: "bg-emerald-100 text-emerald-700",
    blurb:
      "Academic: longer, journal-style texts. General: workplace & everyday articles.",
  },
  {
    key: "writing",
    label: "Writing",
    duration: "60 min",
    questions: "2 tasks (150 + 250 words)",
    icon: PenLine,
    tint: "bg-violet-100 text-violet-700",
    blurb:
      "Task 1: describe a chart/letter. Task 2: essay on opinion or argument.",
  },
  {
    key: "speaking",
    label: "Speaking",
    duration: "11–14 min",
    questions: "3 parts, 1-on-1 with examiner",
    icon: Mic,
    tint: "bg-rose-100 text-rose-700",
    blurb:
      "Part 1: warm-up questions. Part 2: 2-min cue card talk. Part 3: discussion.",
  },
];

const BANDS: Array<{ band: number; label: string; descriptor: string }> = [
  { band: 9, label: "Expert", descriptor: "Fully operational command of English." },
  { band: 8, label: "Very Good", descriptor: "Fully fluent with only occasional small slips." },
  { band: 7, label: "Good", descriptor: "Operational command with some inaccuracies." },
  { band: 6, label: "Competent", descriptor: "Generally effective despite some errors." },
  { band: 5, label: "Modest", descriptor: "Partial command — copes with basic communication." },
  { band: 4, label: "Limited", descriptor: "Basic competence limited to familiar situations." },
  { band: 3, label: "Extremely Limited", descriptor: "Conveys & understands only general meaning." },
  { band: 2, label: "Intermittent", descriptor: "Very limited — only isolated words." },
  { band: 1, label: "Non-user", descriptor: "Essentially no ability beyond a few words." },
  { band: 0, label: "Did not attempt", descriptor: "No assessable information provided." },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How is the overall band calculated?",
    a: "Each of the 4 skills gets its own band (0–9 in 0.5 steps). The overall band is the average of all four, rounded to the nearest 0.5 (a .25 rounds up).",
  },
  {
    q: "What's the difference between Academic and General Training?",
    a: "Academic is for university, professional registration, or study abroad — texts and tasks are more formal. General Training is for migration, work visas, or vocational study — content is everyday and workplace-oriented. Listening and Speaking are the same; only Reading and Writing differ.",
  },
  {
    q: "Is there a passing score?",
    a: "No pass/fail. Institutions and visa programs set their own minimums — commonly 6.0–7.5 overall, sometimes with a per-skill floor (e.g., no skill below 6.5).",
  },
  {
    q: "Can I retake just one skill?",
    a: "Yes — IELTS One Skill Retake lets you retake a single section within 60 days of your original test (computer-delivered only, available in many countries).",
  },
  {
    q: "How long is an IELTS score valid?",
    a: "Two years from your test date. Most universities and visa programs require a score issued within that window.",
  },
];

export default function GettingStartedPage() {
  return (
    <AppShell
      active="learn"
      greeting="Get to know IELTS"
      subtitle="A 3-minute overview so the rest of the app makes sense."
    >
      <div className="space-y-6">
        <WhatIsIelts />
        <TestStructure />
        <ModuleComparison />
        <BandScale />
        <ScoringExplainer />
        <Faqs />
        <NextSteps />
      </div>
    </AppShell>
  );
}

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl bg-white/65 border border-white/70 backdrop-blur-sm p-5 sm:p-6 shadow-soft",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-1">
          {eyebrow}
        </div>
      )}
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-violet-500" />}
        <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function WhatIsIelts() {
  return (
    <SectionCard className="bg-gradient-to-br from-violet-100/80 via-fuchsia-50/60 to-rose-50/80">
      <SectionHeader eyebrow="The basics" title="What is IELTS?" icon={Sparkles} />
      <p className="text-sm sm:text-base text-ink/75 leading-relaxed">
        The <strong>International English Language Testing System</strong> is the world's
        most-recognized English proficiency exam — accepted by 12,000+ universities,
        employers, and immigration bodies across 140+ countries.
      </p>
      <p className="mt-3 text-sm sm:text-base text-ink/75 leading-relaxed">
        It measures four skills — <strong>Listening, Reading, Writing, Speaking</strong> —
        and gives you a band score from <strong>0 to 9</strong> for each, plus an overall
        band. Total test time: about <strong>2 hours 45 minutes</strong>.
      </p>
    </SectionCard>
  );
}

function TestStructure() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Test format" title="The four sections" icon={Clock} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SKILLS.map(({ key, label, duration, questions, icon: Icon, tint, blurb }) => (
          <div
            key={key}
            className="rounded-2xl bg-white/60 border border-white/60 p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center",
                  tint,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm">{label}</div>
                <div className="text-[11px] text-ink/55">{duration}</div>
              </div>
            </div>
            <div className="text-[11px] font-medium text-ink/60">{questions}</div>
            <p className="text-xs text-ink/65 leading-snug">{blurb}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-ink/55 leading-relaxed">
        Listening, Reading, and Writing are taken back-to-back (about 2h 40m). Speaking
        is a separate 1-on-1 interview, usually scheduled the same day or within a week.
      </div>
    </SectionCard>
  );
}

function ModuleComparison() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Pick your module" title="Academic vs General Training" icon={GraduationCap} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-5 w-5 text-violet-600" />
            <div className="font-semibold">Academic</div>
          </div>
          <ul className="text-xs sm:text-sm text-ink/70 space-y-1.5 leading-snug">
            <li>• University admissions (UG/PG)</li>
            <li>• Professional registration (doctors, nurses, engineers)</li>
            <li>• Reading uses journal/academic texts</li>
            <li>• Writing Task 1: describe a chart/graph/process</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-5 w-5 text-amber-700" />
            <div className="font-semibold">General Training</div>
          </div>
          <ul className="text-xs sm:text-sm text-ink/70 space-y-1.5 leading-snug">
            <li>• Migration (UK, Canada, Australia, NZ)</li>
            <li>• Work visas & vocational training</li>
            <li>• Reading uses workplace/everyday texts</li>
            <li>• Writing Task 1: write a letter</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 text-xs text-ink/55 leading-relaxed">
        Listening and Speaking are identical across both modules.
      </div>
    </SectionCard>
  );
}

function BandScale() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="Scoring" title="The 9-band scale" icon={Target} />
      <div className="space-y-1.5">
        {BANDS.map(({ band, label, descriptor }) => (
          <div
            key={band}
            className="flex items-start gap-3 rounded-xl bg-white/55 border border-white/60 p-2.5 pl-3"
          >
            <div
              className={cn(
                "shrink-0 h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm",
                bandBgColor(band),
              )}
            >
              {band}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-ink/60 leading-snug">{descriptor}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-ink/55 leading-relaxed">
        Half bands (e.g. 6.5, 7.5) are also awarded. Most university programs ask for an
        overall <strong>6.0–7.5</strong>, often with a per-skill minimum.
      </div>
    </SectionCard>
  );
}

function bandBgColor(band: number): string {
  if (band >= 8) return "bg-emerald-200 text-emerald-900";
  if (band >= 7) return "bg-sky-200 text-sky-900";
  if (band >= 6) return "bg-violet-200 text-violet-900";
  if (band >= 5) return "bg-amber-200 text-amber-900";
  if (band >= 3) return "bg-rose-200 text-rose-900";
  return "bg-ink/10 text-ink/60";
}

function ScoringExplainer() {
  return (
    <SectionCard>
      <SectionHeader eyebrow="How scoring works" title="Raw score → band" />
      <div className="space-y-3 text-sm text-ink/75 leading-relaxed">
        <p>
          <strong>Listening & Reading</strong> are scored out of 40. Your raw score is
          mapped to a band — for example, Academic Reading: 30/40 ≈ Band 7.0, 35/40 ≈
          Band 8.0.
        </p>
        <p>
          <strong>Writing & Speaking</strong> are rated on four criteria each (e.g.
          Coherence, Lexical Resource, Grammar, Task Achievement). Each criterion gets a
          band; the section band is their average.
        </p>
        <p>
          Your <strong>overall band</strong> is the average of all four section bands,
          rounded to the nearest half-band (a .25 rounds up).
        </p>
      </div>
    </SectionCard>
  );
}

function Faqs() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <SectionCard>
      <SectionHeader title="Common questions" />
      <div className="space-y-2">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="rounded-2xl bg-white/55 border border-white/60 overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between gap-3 p-3.5 text-left"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-sm">{f.q}</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-ink/50 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-ink/50 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 text-sm text-ink/70 leading-relaxed">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function NextSteps() {
  return (
    <SectionCard className="bg-gradient-to-br from-ink to-ink/85 text-white border-ink/20">
      <h2 className="text-lg sm:text-xl font-bold tracking-tight">
        Ready to find your level?
      </h2>
      <p className="mt-2 text-sm text-white/75 leading-relaxed">
        Take a quick <strong>5-minute placement test</strong> to see where you stand on
        the band scale. We'll use it to recommend your next exercise.
      </p>
      <Link
        href="/placement"
        className="mt-4 inline-flex items-center gap-2 bg-white text-ink font-semibold text-sm rounded-full px-4 py-2.5 hover:bg-white/90 transition"
      >
        Start placement test →
      </Link>
    </SectionCard>
  );
}
