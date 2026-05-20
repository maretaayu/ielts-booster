"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reads a deadline (ms since epoch) and returns ms remaining. Uses an interval to
 * tick once a second. Persists nothing — caller manages the deadline storage so the
 * countdown survives reloads.
 */
export function useDeadline(deadline: number | null, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(() =>
    deadline ? Math.max(0, deadline - Date.now()) : 0,
  );

  useEffect(() => {
    if (deadline == null) return;
    setRemaining(Math.max(0, deadline - Date.now()));
    const id = setInterval(() => {
      const r = Math.max(0, deadline - Date.now());
      setRemaining(r);
      if (r === 0) {
        clearInterval(id);
        onExpire();
      }
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  return remaining;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CountdownPill({
  remainingMs,
  totalMs,
}: {
  remainingMs: number;
  totalMs: number;
}) {
  const lowTime = remainingMs > 0 && remainingMs < 60_000;
  const veryLow = remainingMs > 0 && remainingMs < 15_000;
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border shadow-soft transition-colors",
        veryLow
          ? "bg-rose-600 text-white border-rose-700 animate-pulse"
          : lowTime
            ? "bg-amber-100 text-amber-900 border-amber-200"
            : "bg-white text-ink/80 border-black/[0.06]",
      )}
    >
      {veryLow ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      <span className="font-mono tabular-nums">{fmt(remainingMs)}</span>
      <span className="hidden sm:inline-block h-1 w-16 rounded-full bg-black/10 overflow-hidden">
        <span
          className={cn(
            "block h-full rounded-full transition-all",
            veryLow ? "bg-white/80" : lowTime ? "bg-amber-500" : "bg-ink",
          )}
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
