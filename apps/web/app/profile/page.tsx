"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  LogOut,
  Mail,
  Target,
} from "lucide-react";
import type { UserProfile } from "@ielts/shared";
import { api, getOrCreateUserId, signOut } from "@/lib/api";
import { BottomNav } from "@/components/BottomNav";
import { cn, formatBand } from "@/lib/utils";

interface CalendarStatus {
  connected: boolean;
  email?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const userId = getOrCreateUserId();
    Promise.allSettled([api.getProfile(userId), api.calendarStatus(userId)]).then(([p, c]) => {
      if (p.status === "fulfilled") setProfile(p.value);
      if (c.status === "fulfilled") {
        setCalendar(
          c.value.connected
            ? { connected: true, email: c.value.email }
            : { connected: false },
        );
      }
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.replace("/onboarding");
  }

  const initial = (profile?.name?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div className="mx-auto max-w-md sm:max-w-lg px-6 pt-7 pb-32 sm:pb-28">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      </header>

      {/* Identity card */}
      <section className="mt-7">
        <div className="bg-white rounded-3xl p-6 border border-black/[0.06] shadow-soft flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-300 via-fuchsia-300 to-rose-300 flex items-center justify-center text-white font-bold text-2xl shadow-soft ring-2 ring-white shrink-0">
            {loading ? "" : initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-lg leading-tight truncate">
              {loading ? "Loading…" : profile?.name ?? "—"}
            </div>
            {calendar?.email && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink/55 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{calendar.email}</span>
              </div>
            )}
            {profile?.module && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium text-ink/55 bg-stone-100 rounded-full px-2.5 py-0.5">
                {profile.module === "academic" ? "Academic" : "General Training"}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Goal */}
      {profile && (
        <section className="mt-4">
          <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-soft">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-medium text-ink/55">
              <Target className="h-3.5 w-3.5" /> Goal
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight">
                {formatBand(profile.currentBand)}
              </span>
              <span className="text-ink/40 text-sm">→</span>
              <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-500 to-rose-500 bg-clip-text text-transparent">
                {formatBand(profile.targetBand)}
              </span>
            </div>
            <div className="mt-1 text-xs text-ink/55">
              Exam: {profile.examDate} · {profile.dailyMinutes} min/day
            </div>
          </div>
        </section>
      )}

      {/* Settings rows */}
      <section className="mt-4">
        <div className="bg-white rounded-3xl border border-black/[0.06] shadow-soft overflow-hidden">
          <Row
            icon={<CalendarCheck className="h-4 w-4" />}
            label="Google Calendar"
            value={
              calendar?.connected
                ? `Connected${calendar.email ? ` · ${calendar.email}` : ""}`
                : "Not connected"
            }
            tone={calendar?.connected ? "ok" : "muted"}
          />
        </div>
      </section>

      {/* Sign out */}
      <section className="mt-6">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-rose-200 text-rose-600 px-4 py-3.5 text-sm font-semibold hover:bg-rose-50 transition disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
        <p className="mt-3 text-center text-[11px] text-ink/40">
          Clears your local session and disconnects calendar.
        </p>
      </section>

      <BottomNav active="profile" />
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "ok" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-stone-100 flex items-center justify-center text-ink/70">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div
            className={cn(
              "text-xs truncate",
              tone === "ok" ? "text-emerald-700" : "text-ink/50",
            )}
          >
            {value}
          </div>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-ink/30 shrink-0" />
    </div>
  );
}
