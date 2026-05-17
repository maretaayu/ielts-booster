"use client";

import { useState } from "react";
import type { InlineAnnotation } from "@ielts/shared";
import { cn } from "@/lib/utils";

const STYLE: Record<InlineAnnotation["type"], string> = {
  error: "bg-rose-200/70 text-rose-900 underline decoration-wavy decoration-rose-400 decoration-2 underline-offset-2",
  suggestion: "bg-amber-200/70 text-amber-900",
  praise: "bg-emerald-200/70 text-emerald-900",
};

const LABEL: Record<InlineAnnotation["type"], string> = {
  error: "Error",
  suggestion: "Suggestion",
  praise: "Strength",
};

type Segment =
  | { kind: "text"; text: string }
  | { kind: "annotation"; text: string; annotation: InlineAnnotation };

function buildSegments(essay: string, annotations: InlineAnnotation[]): Segment[] {
  if (annotations.length === 0) return [{ kind: "text", text: essay }];

  const sorted = [...annotations]
    .filter((a) => a.startIndex >= 0 && a.endIndex <= essay.length && a.endIndex > a.startIndex)
    .sort((a, b) => a.startIndex - b.startIndex);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const a of sorted) {
    if (a.startIndex < cursor) continue;
    if (a.startIndex > cursor) {
      segments.push({ kind: "text", text: essay.slice(cursor, a.startIndex) });
    }
    segments.push({
      kind: "annotation",
      text: essay.slice(a.startIndex, a.endIndex),
      annotation: a,
    });
    cursor = a.endIndex;
  }

  if (cursor < essay.length) {
    segments.push({ kind: "text", text: essay.slice(cursor) });
  }

  return segments;
}

export function AnnotatedEssay({
  essay,
  annotations,
}: {
  essay: string;
  annotations: InlineAnnotation[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const segments = buildSegments(essay, annotations);

  return (
    <div className="rounded-2xl bg-white/70 backdrop-blur border border-white/70 p-6 leading-loose whitespace-pre-wrap text-ink relative">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.text}</span>;
        }
        return (
          <span key={i} className="relative inline">
            <mark
              className={cn(
                "rounded px-0.5 cursor-pointer transition",
                STYLE[seg.annotation.type],
                active === i && "ring-2 ring-offset-1 ring-brand-400",
              )}
              onClick={() => setActive(active === i ? null : i)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((prev) => (prev === i ? null : prev))}
            >
              {seg.text}
            </mark>
            {active === i && (
              <span
                className="absolute z-20 left-0 top-full mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-sm text-slate-800 whitespace-normal"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                      seg.annotation.type === "error" && "bg-rose-100 text-rose-700",
                      seg.annotation.type === "suggestion" && "bg-amber-100 text-amber-700",
                      seg.annotation.type === "praise" && "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    {LABEL[seg.annotation.type]}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    {seg.annotation.category}
                  </span>
                </span>
                <span className="block">{seg.annotation.comment}</span>
                {seg.annotation.suggestion && (
                  <span className="block mt-2 pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Try: </span>
                    <span className="font-medium text-emerald-700">
                      {seg.annotation.suggestion}
                    </span>
                  </span>
                )}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
