import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBand(band: number): string {
  return band.toFixed(1);
}

export function bandColor(band: number): string {
  if (band >= 8) return "text-emerald-600";
  if (band >= 7) return "text-blue-600";
  if (band >= 6) return "text-amber-600";
  return "text-rose-600";
}
