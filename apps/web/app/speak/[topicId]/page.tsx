"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CircleAlert,
  Headphones,
  Loader2,
  Mic,
  PhoneOff,
} from "lucide-react";
import { useConversation, ConversationProvider } from "@elevenlabs/react";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";

type Phase = "intro" | "connecting" | "live" | "ending" | "scoring";

interface CapturedMessage {
  source: "user" | "ai";
  text: string;
  elapsedSeconds: number;
}

interface TopicInfo {
  id: string;
  title: string;
  part: "part1" | "part2" | "part3";
  theme: string;
  cueCardBullets: string[] | null;
}

const PART_LABEL: Record<TopicInfo["part"], string> = {
  part1: "PART 1 · Interview",
  part2: "PART 2 · Cue Card",
  part3: "PART 3 · Discussion",
};

export default function SpeakSession() {
  return (
    <ConversationProvider>
      <SpeakSessionContent />
    </ConversationProvider>
  );
}

function SpeakSessionContent() {
  const params = useParams<{ topicId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [topic, setTopic] = useState<TopicInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const messagesRef = useRef<CapturedMessage[]>([]);
  const sessionStartRef = useRef<number>(0);
  const ttlTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      setPhase("live");
      sessionStartRef.current = Date.now();
      messagesRef.current = [];
      ttlTimerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - sessionStartRef.current) / 1000));
      }, 1000);
    },
    onDisconnect: () => {
      if (ttlTimerRef.current) {
        clearInterval(ttlTimerRef.current);
        ttlTimerRef.current = null;
      }
      // If user pressed End or agent ended, run scoring (only when we have user turns)
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

  // Mirror phase to ref so the onDisconnect closure sees the latest value
  const phaseRef = useRef<Phase>("intro");
  phaseRef.current = phase;

  useEffect(() => {
    // Eager-fetch topic metadata for header rendering (without committing credits yet)
    api
      .getSpeakingTopic(params.topicId)
      .then((t) =>
        setTopic({
          id: t.id,
          title: t.title,
          part: t.part,
          theme: t.theme,
          cueCardBullets: t.cueCardBullets ?? null,
        }),
      )
      .catch((e: Error) => setError(e.message));
  }, [params.topicId]);

  async function startSession() {
    setError(null);
    setPhase("connecting");
    try {
      // Ask for mic permission first so we surface the OS prompt explicitly
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const init = await api.initConversation(params.topicId);
      setTopic(init.topic);
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
      // onDisconnect handler will still fire via socket close
    }
  }

  async function submitForScoring() {
    if (messagesRef.current.length === 0 || !topic) {
      setPhase("intro");
      return;
    }
    setPhase("scoring");
    try {
      const userId = getOrCreateUserId();
      const totalSeconds = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));
      const session = await api.scoreRealtime({
        userId,
        topicId: topic.id,
        totalSeconds,
        messages: messagesRef.current,
      });
      router.push(`/speak/result/${session.id}`);
    } catch (e) {
      setError((e as Error).message);
      setPhase("intro");
    }
  }

  if (!topic && !error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center gap-2 text-ink/60">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading topic…
        </div>
      </div>
    );
  }

  const speaking = conversation.isSpeaking;

  return (
    <div className="mx-auto max-w-md px-4 py-6 min-h-[100dvh] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/speak"
          className="inline-flex items-center gap-2 text-sm text-ink/65 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All topics
        </Link>
        {phase === "live" && (
          <span className="text-xs tabular-nums font-mono text-ink/60">
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      {topic && (
        <div className="glass-strong rounded-3xl p-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider text-ink/50 font-semibold">
            {PART_LABEL[topic.part]} · {topic.theme}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{topic.title}</h1>
          {topic.cueCardBullets && (
            <div className="mt-3 rounded-2xl bg-white/70 border border-white/60 p-3">
              <div className="text-[11px] font-semibold text-ink/65 uppercase tracking-wider mb-1.5">
                You should say:
              </div>
              <ul className="space-y-1 text-sm text-ink/80">
                {topic.cueCardBullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-violet-500">•</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        {phase === "intro" && <IntroPhase onStart={startSession} />}
        {phase === "connecting" && (
          <StatusPhase icon={<Loader2 className="h-7 w-7 animate-spin" />} title="Connecting…" />
        )}
        {phase === "live" && <LivePhase speaking={speaking} onEnd={endSession} />}
        {phase === "ending" && (
          <StatusPhase icon={<Loader2 className="h-7 w-7 animate-spin" />} title="Ending session…" />
        )}
        {phase === "scoring" && (
          <StatusPhase
            icon={<Loader2 className="h-7 w-7 animate-spin text-violet-500" />}
            title="Scoring your session…"
            sub="Examiner is reviewing the transcript."
          />
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-100/70 border border-rose-200 p-3 text-sm text-rose-800 flex items-start gap-2">
          <CircleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Something went wrong</div>
            <div className="text-xs mt-0.5">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function IntroPhase({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-300 to-rose-300 flex items-center justify-center mx-auto shadow-glass">
        <Mic className="h-10 w-10 text-white" />
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight">Ready to start?</h2>
      <p className="mt-2 text-sm text-ink/65 max-w-xs mx-auto leading-relaxed">
        I&apos;ll be your IELTS examiner. We&apos;ll talk naturally — no need to wait for a button.
        When we&apos;re done, tap <strong>End</strong> and I&apos;ll grade you.
      </p>
      <button onClick={onStart} className="btn-pill mt-8 px-6 py-3 text-base">
        <Mic className="h-4 w-4" /> Start the interview
      </button>
      <p className="mt-3 text-[11px] text-ink/40">
        Your mic will turn on. Audio streams directly from ElevenLabs.
      </p>
    </div>
  );
}

function StatusPhase({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div className="text-center text-ink/70">
      <div className="flex justify-center">{icon}</div>
      <div className="mt-4 font-medium">{title}</div>
      {sub && <div className="text-xs text-ink/50 mt-1">{sub}</div>}
    </div>
  );
}

function LivePhase({ speaking, onEnd }: { speaking: boolean; onEnd: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-48 w-48">
        {/* Animated rings when examiner is speaking */}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-violet-300/40 transition-all",
            speaking ? "animate-ping" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-4 rounded-full bg-violet-200/60 transition-all",
            speaking ? "animate-pulse" : "opacity-50",
          )}
        />
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-400 to-rose-400 flex items-center justify-center shadow-glass">
          {speaking ? (
            <Headphones className="h-12 w-12 text-white" />
          ) : (
            <Mic className="h-12 w-12 text-white" />
          )}
        </div>
      </div>

      <div className="mt-6 text-sm font-medium text-ink/70 h-5">
        {speaking ? "Examiner is speaking…" : "Your turn — just talk."}
      </div>

      <button
        onClick={onEnd}
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 text-sm font-semibold shadow-md transition"
      >
        <PhoneOff className="h-4 w-4" /> End &amp; score
      </button>
      <p className="mt-3 text-[11px] text-ink/40 max-w-xs">
        Talk over the examiner to interrupt. Try to give 2-3 sentence answers.
      </p>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
