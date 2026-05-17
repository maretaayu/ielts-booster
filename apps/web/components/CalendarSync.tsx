"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarCheck2,
  CalendarPlus,
  CalendarX,
  Check,
  Loader2,
} from "lucide-react";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status =
  | { connected: false }
  | { connected: true; email?: string; connectedAt: string };

export function CalendarSync({ planId }: { planId: string }) {
  const search = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("19:00");

  async function refresh() {
    try {
      const s = await api.calendarStatus(getOrCreateUserId());
      setStatus(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // React to ?calendar=connected|error from OAuth callback redirect
  useEffect(() => {
    const c = search.get("calendar");
    if (!c) return;
    if (c === "connected") {
      setMessage("Google Calendar connected.");
      refresh();
    } else if (c === "error") {
      setError(search.get("msg") ?? "Failed to connect Google Calendar");
    }
  }, [search]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.googleAuthUrl(getOrCreateUserId(), `/plan/${planId}`);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await api.calendarDisconnect(getOrCreateUserId());
      setStatus({ connected: false });
      setMessage("Disconnected from Google Calendar.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const r = await api.syncPlanToCalendar({
        userId: getOrCreateUserId(),
        planId,
        startTime,
      });
      setMessage(
        `Added ${r.eventsCreated} event${r.eventsCreated === 1 ? "" : "s"} to your calendar` +
          (r.eventsSkipped ? ` · ${r.eventsSkipped} skipped` : ""),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-strong rounded-3xl p-5 border border-white/60">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-violet-100 flex items-center justify-center">
          <CalendarPlus className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold tracking-tight">Add this plan to your calendar</div>
          <p className="text-xs text-ink/60 mt-0.5">
            Sync each day&apos;s study block to Google Calendar with one click.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {status === null && (
          <div className="text-xs text-ink/50 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking connection…
          </div>
        )}

        {status?.connected === false && (
          <button
            onClick={connect}
            disabled={busy}
            className="btn-pill w-full justify-center disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <GoogleGlyph /> Connect Google Calendar
              </>
            )}
          </button>
        )}

        {status?.connected === true && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Connected{status.email ? ` as ${status.email}` : ""}
              </span>
              <button
                onClick={disconnect}
                className="text-ink/50 hover:text-rose-600 inline-flex items-center gap-1"
                disabled={busy}
              >
                <CalendarX className="h-3 w-3" /> Disconnect
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-ink/60 whitespace-nowrap">Start at</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="rounded-lg bg-white/70 border border-white/60 px-2 py-1 text-sm"
              />
            </div>

            <button
              onClick={sync}
              disabled={busy}
              className={cn(
                "btn-pill w-full justify-center disabled:opacity-50",
                busy && "bg-ink/70",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Sync this plan
                </>
              )}
            </button>
          </>
        )}

        {message && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.6 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.6 29.3 5 24 5 16.3 5 9.6 9.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-1.9 1.3-4.4 2.1-7.3 2.1-5.3 0-9.7-3.4-11.3-8L6.1 31.4C9.3 37.5 16.1 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2c-.4.4 6.8-5 6.8-15 0-1.2-.1-2.3-.4-3.3z"/>
    </svg>
  );
}
