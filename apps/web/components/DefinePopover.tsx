"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookmarkCheck, Loader2, Volume2, X } from "lucide-react";
import type { WordDefinition } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "loading" | "ready" | "error";

export interface DefinePopoverProps {
  word: string;
  context?: string;
  passageId?: string;
  anchor: { top: number; left: number };
  onClose: () => void;
  onSaved?: () => void;
}

export function DefinePopover({
  word,
  context,
  passageId,
  anchor,
  onClose,
  onSaved,
}: DefinePopoverProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setSaved(false);
    api
      .define({
        word,
        context,
        passageId,
        userId: getOrCreateUserId(),
        save: true,
      })
      .then((res) => {
        if (cancelled) return;
        setDefinition(res.definition);
        setSaved(Boolean(res.entry));
        setStatus("ready");
        if (res.entry && onSaved) onSaved();
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [word, context, passageId, onSaved]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function speak() {
    if (typeof window === "undefined") return;
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  // Clamp horizontal so the popover stays in viewport.
  const W = 340;
  const margin = 12;
  const left =
    typeof window === "undefined"
      ? anchor.left
      : Math.max(margin, Math.min(anchor.left, window.innerWidth - W - margin));

  // Render inside document.body via portal so ancestor backdrop-filter
  // stacking contexts can't trap our fixed positioning.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      style={{ top: anchor.top + 8, left, width: W, zIndex: 9999 }}
      className="fixed glass-strong rounded-2xl p-4 shadow-xl text-sm"
      role="dialog"
      aria-label={`Definition of ${word}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">{word}</span>
          <button
            onClick={speak}
            className="icon-pill !h-7 !w-7"
            aria-label="Pronounce"
            type="button"
          >
            <Volume2 className="h-3.5 w-3.5 text-ink/70" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="icon-pill !h-7 !w-7"
          aria-label="Close"
          type="button"
        >
          <X className="h-3.5 w-3.5 text-ink/70" />
        </button>
      </div>

      {status === "loading" && (
        <div className="mt-3 flex items-center gap-2 text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Looking it up…
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 text-rose-600">
          Couldn&apos;t fetch a definition: {error}
        </div>
      )}

      {status === "ready" && definition && (
        <div className="mt-2 space-y-3">
          <div className="text-xs uppercase tracking-wider text-ink/45">
            {definition.partOfSpeech}
          </div>

          {definition.indonesian && (
            <div className="rounded-xl bg-rose-50/80 border border-rose-100 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-rose-500 font-semibold">
                Bahasa Indonesia
              </div>
              <div className="mt-0.5 text-ink/85 font-medium">{definition.indonesian}</div>
            </div>
          )}

          <p className="text-ink/85 leading-relaxed">{definition.meaning}</p>

          {definition.synonyms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {definition.synonyms.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-violet-100 text-violet-800 px-2.5 py-0.5 text-[11px] font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="rounded-xl bg-white/70 border border-white/70 p-2.5 text-[13px] leading-relaxed">
            <div className="italic text-ink/75">“{definition.exampleSentence}”</div>
            {definition.indonesianExample && (
              <div className="mt-1 text-ink/55 text-[12px]">“{definition.indonesianExample}”</div>
            )}
          </div>

          {definition.contextualNote && (
            <p className="text-[12px] text-ink/55 leading-relaxed">
              <span className="font-medium text-ink/70">Catatan:</span> {definition.contextualNote}
            </p>
          )}

          <div
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              saved ? "text-emerald-700" : "text-ink/50",
            )}
          >
            <BookmarkCheck className="h-3.5 w-3.5" />
            {saved ? "Saved to your vocab" : "Not saved"}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
