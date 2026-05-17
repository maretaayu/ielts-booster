import type { ReviewRating, VocabEntry } from "@ielts/shared";

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

interface Sm2State {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt: string;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Read current SM-2 state from a VocabEntry, filling defaults for legacy rows. */
export function readState(entry: VocabEntry): Sm2State {
  return {
    ease: entry.ease ?? DEFAULT_EASE,
    interval: entry.interval ?? 0,
    reps: entry.reps ?? 0,
    lapses: entry.lapses ?? 0,
    dueAt: entry.dueAt ?? todayLocal(),
    lastReviewedAt: entry.lastReviewedAt ?? entry.createdAt,
  };
}

/** Apply a rating and return the next state. */
export function applyRating(prev: Sm2State, rating: ReviewRating): Sm2State {
  const ease = clampEase(prev.ease + easeDelta(rating));
  let interval: number;
  let reps = prev.reps;
  let lapses = prev.lapses;

  switch (rating) {
    case "again":
      interval = 1;
      lapses += 1;
      reps = 0; // restart streak
      break;
    case "hard":
      // Slight progression even on hard, to avoid feeling stuck.
      interval = Math.max(1, Math.round((prev.interval || 1) * 1.2));
      reps += 1;
      break;
    case "good":
      if (prev.reps === 0) interval = 1;
      else if (prev.reps === 1) interval = 3;
      else interval = Math.round((prev.interval || 1) * ease);
      reps += 1;
      break;
    case "easy":
      if (prev.reps === 0) interval = 3;
      else interval = Math.round((prev.interval || 1) * ease * 1.3);
      reps += 1;
      break;
  }

  return {
    ease,
    interval,
    reps,
    lapses,
    dueAt: addDays(todayLocal(), interval),
    lastReviewedAt: new Date().toISOString(),
  };
}

function easeDelta(r: ReviewRating): number {
  switch (r) {
    case "again":
      return -0.2;
    case "hard":
      return -0.15;
    case "good":
      return 0;
    case "easy":
      return 0.15;
  }
}

function clampEase(e: number): number {
  return Math.max(MIN_EASE, Math.min(3.0, Math.round(e * 100) / 100));
}

export function isDue(entry: VocabEntry, today = todayLocal()): boolean {
  const due = entry.dueAt ?? today;
  return due <= today;
}

export { todayLocal };
