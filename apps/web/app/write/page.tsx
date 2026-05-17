"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IeltsModule, Prompt, TaskType } from "@ielts/shared";
import { ArrowRight, Clock, Type } from "lucide-react";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";

const TYPE_LABEL: Record<TaskType, string> = {
  "task1-academic": "Task 1 — Academic",
  "task1-gt": "Task 1 — General Training",
  task2: "Task 2 — Essay",
};

export default function WritePicker() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filter, setFilter] = useState<TaskType | "all">("all");
  const [module, setModule] = useState<IeltsModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProfile(getOrCreateUserId())
      .then((p) => setModule(p.module))
      .catch(() => {
        // No profile yet — leave module null so all options show.
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listPrompts(filter === "all" ? undefined : filter)
      .then((r) => setPrompts(r.prompts))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  const tabs = useMemo(() => {
    const base: Array<TaskType | "all"> = ["all", "task2"];
    if (module === "academic") base.push("task1-academic");
    else if (module === "general-training") base.push("task1-gt");
    else base.push("task1-academic", "task1-gt");
    return base;
  }, [module]);

  const visiblePrompts = useMemo(() => {
    if (module === "academic") return prompts.filter((p) => p.type !== "task1-gt");
    if (module === "general-training") return prompts.filter((p) => p.type !== "task1-academic");
    return prompts;
  }, [prompts, module]);

  return (
    <AppShell
      greeting="Pick a writing prompt"
      subtitle={
        module
          ? `Tailored for ${module === "academic" ? "Academic" : "General Training"}. Timed scoring on submit.`
          : "Choose a task type. We'll time you and grade the moment you submit."
      }
      active="practice"
    >
      <div className="flex gap-2 flex-wrap mb-6 sm:mb-8 overflow-x-auto -mx-1 px-1 pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition border",
              filter === t
                ? "bg-ink text-white border-ink"
                : "bg-white border-black/[0.08] text-ink/70 hover:bg-stone-50",
            )}
          >
            {t === "all" ? "All" : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 mb-6">
          {error}. Make sure the API is running at {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 sm:h-52 rounded-3xl bg-white border border-black/[0.06] animate-pulse" />
            ))
          : visiblePrompts.map((p) => (
              <Link
                key={p.id}
                href={`/write/${p.id}`}
                className="group bg-white rounded-3xl p-5 sm:p-6 border border-black/[0.06] shadow-soft hover:shadow-pop active:scale-[0.99] transition relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/60 bg-stone-100 px-2.5 py-1 rounded-full">
                    {TYPE_LABEL[p.type]}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full",
                      p.difficulty === "easy" && "bg-emerald-100 text-emerald-700",
                      p.difficulty === "medium" && "bg-amber-100 text-amber-700",
                      p.difficulty === "hard" && "bg-rose-100 text-rose-700",
                    )}
                  >
                    {p.difficulty}
                  </span>
                </div>
                <h3 className="mt-4 sm:mt-5 text-lg sm:text-xl font-bold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm text-ink/60 line-clamp-3 leading-relaxed">{p.question}</p>
                <div className="mt-4 sm:mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-ink/55">
                    <span className="inline-flex items-center gap-1">
                      <Type className="h-3.5 w-3.5" /> {p.minWords}+ words
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {p.timeMinutes} min
                    </span>
                  </div>
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-ink text-white group-hover:scale-110 transition">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </AppShell>
  );
}
