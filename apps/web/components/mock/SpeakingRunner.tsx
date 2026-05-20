"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, Loader2, Mic, PhoneOff, Sparkles } from "lucide-react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { SpeakingTopic } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { ClassroomScene } from "@/components/ClassroomScene";
import { cn } from "@/lib/utils";

interface Props {
  topicId: string;
  startedAt: number;
  onComplete: (result: { sessionId: string; band: number }) => void;
  expireSignal: number;
}

export function SpeakingRunner(props: Props) {
  return (
    <ConversationProvider>
      <SpeakingRunnerInner {...props} />
    </ConversationProvider>
  );
}

type Phase = "intro" | "connecting" | "live" | "ending" | "scoring";

interface CapturedMessage {
  source: "user" | "ai";
  text: string;
  elapsedSeconds: number;
}

const PART_LABEL: Record<SpeakingTopic["part"], string> = {
  part1: "Part 1 · Interview",
  part2: "Part 2 · Cue Card",
  part3: "Part 3 · Discussion",
};

function SpeakingRunnerInner({ topicId, startedAt, onComplete, expireSignal }: Props) {
  const [topic, setTopic] = useState<SpeakingTopic | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;
  const messagesRef = useRef<CapturedMessage[]>([]);
  const sessionStartRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.getSpeakingTopic(topicId).then(setTopic).catch((e) => setError(e.message));
  }, [topicId]);

  const conversation = useConversation({
    onConnect: () => {
      setPhase("live");
      sessionStartRef.current = Date.now();
      messagesRef.current = [];
      tickRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - sessionStartRef.current) / 1000));
      }, 1000);
    },
    onDisconnect: () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (phaseRef.current === "live" || phaseRef.current === "ending") {
        void submitForScoring();
      }
    },
    onMessage: ({ source, message }: { source: "user" | "ai"; message: string }) => {
      const text = (message ?? "").trim();
      if (!text) return;
      messagesRef.current.push({
        source,
        text,
        elapsedSeconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
      });
    },
    onError: (msg: string | { message?: string }) => {
      const m = typeof msg === "string" ? msg : msg.message ?? "Conversation error";
      setError(m);
    },
  });

  async function startSession() {
    setError(null);
    setPhase("connecting");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const init = await api.initConversation(topicId);
      await conversation.startSession({
        signedUrl: init.signedUrl,
        dynamicVariables: init.dynamicVariables,
        connectionType: "websocket",
      });
    } catch (e) {
      setError((e as Error).message);
      setPhase("intro");
    }
  }

  async function endSession() {
    setPhase("ending");
    try {
      await conversation.endSession();
    } catch {
      // socket close will trigger onDisconnect → scoring
    }
  }

  async function submitForScoring() {
    if (!topic) {
      onComplete({ sessionId: "", band: 0 });
      return;
    }
    setPhase("scoring");
    try {
      const userId = getOrCreateUserId();
      const totalSeconds = Math.max(
        1,
        Math.round((Date.now() - (sessionStartRef.current || startedAt)) / 1000),
      );
      if (messagesRef.current.length === 0) {
        onComplete({ sessionId: "", band: 0 });
        return;
      }
      const session = await api.scoreRealtime({
        userId,
        topicId,
        totalSeconds,
        messages: messagesRef.current,
      });
      onComplete({ sessionId: session.id, band: session.score?.overallBand ?? 0 });
    } catch (e) {
      setError((e as Error).message);
      onComplete({ sessionId: "", band: 0 });
    }
  }

  useEffect(() => {
    if (expireSignal > 0) {
      if (phaseRef.current === "live") void endSession();
      else if (phaseRef.current === "intro" || phaseRef.current === "connecting") {
        onComplete({ sessionId: "", band: 0 });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expireSignal]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  if (!topic && !error) {
    return (
      <div className="flex items-center gap-2 text-ink/60">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading topic…
      </div>
    );
  }

  const speaking = conversation.isSpeaking;

  return (
    <div className="fixed inset-0 z-30 overflow-hidden">
      <ClassroomScene speaking={phase === "live" ? speaking : false} />

      {/* Top bar — mock label + timer (no back button; orchestrator owns navigation) */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
        <span className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-white/85 backdrop-blur-md text-[11px] uppercase tracking-wider font-semibold text-ink/70 shadow-soft border border-white/60">
          Mock · Speaking
        </span>
        {phase === "live" && (
          <span className="inline-flex items-center gap-2 text-xs tabular-nums font-mono bg-white/85 backdrop-blur-md rounded-full border border-white/60 px-3 py-1.5 text-ink/80 shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      {/* Bottom dock */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 sm:px-6 pb-4 pt-10 pointer-events-none bg-gradient-to-t from-black/20 via-black/5 to-transparent">
        <div className="mx-auto max-w-md pointer-events-auto">
          {phase === "intro" && (
            <IntroDock
              onStart={startSession}
              part={topic?.part ?? "part1"}
              cueCardBullets={topic?.cueCardBullets ?? null}
            />
          )}
          {phase === "connecting" && (
            <StatusDock
              icon={<Loader2 className="h-4 w-4 animate-spin" />}
              title="Joining the room…"
              sub="Calibrating mic and connecting."
            />
          )}
          {phase === "live" && (
            <LiveDock
              speaking={speaking}
              onEnd={endSession}
              cueCardBullets={topic?.cueCardBullets ?? null}
              showCueCard={topic?.part === "part2"}
            />
          )}
          {phase === "ending" && (
            <StatusDock
              icon={<Loader2 className="h-4 w-4 animate-spin" />}
              title="Wrapping up…"
              sub="Closing the room."
            />
          )}
          {phase === "scoring" && (
            <StatusDock
              icon={<Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />}
              title="Scoring your session…"
              sub="Examiner is reviewing your responses."
            />
          )}

          {error && (
            <div className="mt-3 rounded-xl bg-rose-100/95 border border-rose-200 p-3 text-sm text-rose-800 flex items-start gap-2 shadow-soft backdrop-blur-sm">
              <CircleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Something went wrong</div>
                <div className="text-xs mt-0.5">{error}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IntroDock({
  onStart,
  part,
  cueCardBullets,
}: {
  onStart: () => void;
  part: "part1" | "part2" | "part3";
  cueCardBullets: string[] | null;
}) {
  return (
    <div className="rounded-3xl bg-white/95 backdrop-blur-md border border-white/60 shadow-pop p-5 text-center">
      <h2 className="text-xl font-bold tracking-tight">Ready to start?</h2>
      <p className="mt-1.5 text-sm text-ink/65 leading-snug">
        I&apos;ll be your IELTS examiner. Talk to me naturally — when we&apos;re done,
        tap <strong>End</strong> and I&apos;ll grade you.
      </p>
      {part === "part2" && cueCardBullets && (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3 text-left text-xs text-ink/75">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
            Cue card — you should say:
          </div>
          <ul className="mt-1.5 list-disc list-inside space-y-0.5">
            {cueCardBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={onStart}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-ink text-white font-semibold shadow-soft"
      >
        <Mic className="h-4 w-4" /> Start the interview
      </button>
      <p className="mt-2 text-[10px] text-ink/45">
        Your mic will turn on. Audio streams directly from ElevenLabs.
      </p>
    </div>
  );
}

function StatusDock({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div className="rounded-3xl bg-white/95 backdrop-blur-md border border-white/60 shadow-pop p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-stone-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold tracking-tight">{title}</div>
        {sub && <div className="text-[11px] text-ink/55 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function LiveDock({
  speaking,
  onEnd,
  cueCardBullets,
  showCueCard,
}: {
  speaking: boolean;
  onEnd: () => void;
  cueCardBullets: string[] | null;
  showCueCard: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {showCueCard && cueCardBullets && (
        <div className="rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-soft p-3 text-xs text-ink/75">
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
            Cue card — you should say:
          </div>
          <ul className="mt-1.5 list-disc list-inside space-y-0.5">
            {cueCardBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-full bg-white/95 backdrop-blur-md border border-white/60 shadow-pop px-4 py-2 flex items-center gap-2 justify-center">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            speaking ? "bg-amber-500" : "bg-emerald-500 animate-pulse",
          )}
        />
        <span className="text-xs font-semibold text-ink/80">
          {speaking ? "Examiner is speaking" : "Your turn — just talk"}
        </span>
      </div>

      <button
        onClick={onEnd}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white h-12 px-6 text-sm font-semibold shadow-pop transition"
      >
        <PhoneOff className="h-4 w-4" /> End &amp; score
      </button>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
