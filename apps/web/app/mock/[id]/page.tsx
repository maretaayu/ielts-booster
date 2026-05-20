"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Headphones,
  Loader2,
  Lock,
  Mic,
  PenLine,
} from "lucide-react";
import type { IeltsBand, MockSectionId, MockTestSession } from "@ielts/shared";
import { api, getOrCreateUserId } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CountdownPill, useDeadline } from "@/components/mock/MockTimer";
import { ListeningRunner } from "@/components/mock/ListeningRunner";
import { ReadingRunner } from "@/components/mock/ReadingRunner";
import { WritingRunner } from "@/components/mock/WritingRunner";
import { SpeakingRunner } from "@/components/mock/SpeakingRunner";

const SECTION_ORDER: MockSectionId[] = ["listening", "reading", "writing", "speaking"];

const SECTION_META: Record<
  MockSectionId,
  { label: string; minutes: number; icon: React.ReactNode }
> = {
  listening: {
    label: "Listening",
    minutes: 30,
    icon: <Headphones className="h-4 w-4" />,
  },
  reading: { label: "Reading", minutes: 60, icon: <BookOpen className="h-4 w-4" /> },
  writing: { label: "Writing", minutes: 60, icon: <PenLine className="h-4 w-4" /> },
  speaking: { label: "Speaking", minutes: 14, icon: <Mic className="h-4 w-4" /> },
};

function deadlineKey(mockId: string, section: MockSectionId): string {
  return `ielts.mock.${mockId}.deadline.${section}`;
}
function startedKey(mockId: string, section: MockSectionId): string {
  return `ielts.mock.${mockId}.started.${section}`;
}

export default function MockOrchestrator() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [mock, setMock] = useState<MockTestSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [autoExpireSignal, setAutoExpireSignal] = useState(0);
  const [deadlines, setDeadlines] = useState<Partial<Record<MockSectionId, number>>>({});
  const [startedAts, setStartedAts] = useState<Partial<Record<MockSectionId, number>>>({});
  const expireTriggeredRef = useRef<MockSectionId | null>(null);

  useEffect(() => {
    api.getMockTest(params.id).then(setMock).catch((e) => setLoadError(e.message));
  }, [params.id]);

  const currentSection: MockSectionId | null = useMemo(() => {
    if (!mock) return null;
    for (const s of SECTION_ORDER) {
      const status = mock.sections[s].status;
      if (status !== "completed" && status !== "skipped") return s;
    }
    return null;
  }, [mock]);

  // When orchestrator first lands on a section, hydrate or register its deadline.
  useEffect(() => {
    if (!mock || !currentSection) return;
    if (deadlines[currentSection]) return; // already hydrated for this section

    const storedDeadline = localStorage.getItem(deadlineKey(mock.id, currentSection));
    const storedStarted = localStorage.getItem(startedKey(mock.id, currentSection));

    let deadline: number;
    let started: number;
    if (storedDeadline) {
      deadline = Number(storedDeadline);
      started = storedStarted ? Number(storedStarted) : Date.now();
    } else {
      const meta = SECTION_META[currentSection];
      deadline = Date.now() + meta.minutes * 60_000;
      started = Date.now();
      localStorage.setItem(deadlineKey(mock.id, currentSection), String(deadline));
      localStorage.setItem(startedKey(mock.id, currentSection), String(started));
    }
    setDeadlines((d) => ({ ...d, [currentSection]: deadline }));
    setStartedAts((s) => ({ ...s, [currentSection]: started }));

    if (mock.sections[currentSection].status === "pending") {
      // Mark in_progress on server (best-effort) — orchestrator state already reflects it.
      api
        .updateMockSection(mock.id, {
          userId: getOrCreateUserId(),
          section: currentSection,
          status: "in_progress",
        })
        .then((s) => setMock(s))
        .catch(() => {
          /* server reconciles on next PATCH */
        });
    }
  }, [mock, currentSection, deadlines]);

  // Once a mock is completed, kick the user to the result page.
  useEffect(() => {
    if (mock && mock.status === "completed") {
      router.push(`/mock/${mock.id}/result`);
    }
  }, [mock, router]);

  const sectionDeadline = currentSection ? deadlines[currentSection] ?? null : null;
  const sectionStartedAt = currentSection ? startedAts[currentSection] ?? Date.now() : Date.now();

  const totalMs = currentSection ? SECTION_META[currentSection].minutes * 60_000 : 0;
  const remainingMs = useDeadline(sectionDeadline, () => {
    if (!currentSection || expireTriggeredRef.current === currentSection) return;
    expireTriggeredRef.current = currentSection;
    setAutoExpireSignal((n) => n + 1);
  });

  const handleSectionComplete = useCallback(
    async (
      section: MockSectionId,
      payload: {
        attemptId?: string;
        sessionId?: string;
        band: number;
        rawScore?: number;
        rawTotal?: number;
      },
    ) => {
      if (!mock) return;
      setAdvancing(true);
      try {
        const updated = await api.updateMockSection(mock.id, {
          userId: getOrCreateUserId(),
          section,
          status: "completed",
          band: payload.band as IeltsBand,
          rawScore: payload.rawScore,
          rawTotal: payload.rawTotal,
          listeningAttemptId: section === "listening" ? payload.attemptId : undefined,
          readingAttemptId: section === "reading" ? payload.attemptId : undefined,
          writingAttemptId: section === "writing" ? payload.attemptId : undefined,
          speakingSessionId: section === "speaking" ? payload.sessionId : undefined,
        });
        localStorage.removeItem(deadlineKey(mock.id, section));
        expireTriggeredRef.current = null;
        setMock(updated);
      } catch (e) {
        setLoadError((e as Error).message);
      } finally {
        setAdvancing(false);
      }
    },
    [mock],
  );

  // Block accidental navigation away — exam mode.
  useEffect(() => {
    function before(e: BeforeUnloadEvent) {
      if (!mock || mock.status !== "in_progress") return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [mock]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <div className="rounded-2xl bg-rose-100 border border-rose-200 p-4 text-rose-800">
          {loadError}
        </div>
        <Link href="/mock" className="mt-4 inline-block text-sm text-violet-600">
          ← Back to mock tests
        </Link>
      </div>
    );
  }
  if (!mock) {
    return (
      <div className="mx-auto max-w-md px-6 py-10 text-ink/60 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading mock test…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-5 pb-24">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-semibold text-ink/55">
            Mock test
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentSection ? SECTION_META[currentSection].label : "Finished"}
          </h1>
        </div>
        {currentSection && sectionDeadline && (
          <CountdownPill remainingMs={remainingMs} totalMs={totalMs} />
        )}
      </header>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {SECTION_ORDER.map((s) => {
          const state = mock.sections[s];
          const active = s === currentSection;
          const done = state.status === "completed" || state.status === "skipped";
          return (
            <div
              key={s}
              className={cn(
                "rounded-2xl p-3 border shadow-soft flex items-center gap-2",
                active
                  ? "bg-violet-100 border-violet-200"
                  : done
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-white border-black/[0.06]",
              )}
            >
              <span className="shrink-0">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : active ? (
                  SECTION_META[s].icon
                ) : (
                  <Lock className="h-3.5 w-3.5 text-ink/40" />
                )}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-tight truncate">
                  {SECTION_META[s].label}
                </div>
                <div className="text-[10px] text-ink/55">
                  {done && state.band != null
                    ? `Band ${state.band.toFixed(1)}`
                    : active
                      ? "In progress"
                      : `${SECTION_META[s].minutes} min`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        {currentSection === "listening" && (
          <ListeningRunner
            testId={mock.listeningTestId}
            startedAt={sectionStartedAt}
            expireSignal={autoExpireSignal}
            onComplete={(r) =>
              handleSectionComplete("listening", {
                attemptId: r.attemptId,
                band: r.band,
                rawScore: r.rawScore,
                rawTotal: r.rawTotal,
              })
            }
          />
        )}
        {currentSection === "reading" && (
          <ReadingRunner
            passageId={mock.readingPassageId}
            startedAt={sectionStartedAt}
            expireSignal={autoExpireSignal}
            onComplete={(r) =>
              handleSectionComplete("reading", {
                attemptId: r.attemptId,
                band: r.band,
                rawScore: r.rawScore,
                rawTotal: r.rawTotal,
              })
            }
          />
        )}
        {currentSection === "writing" && (
          <WritingRunner
            promptId={mock.writingPromptId}
            startedAt={sectionStartedAt}
            expireSignal={autoExpireSignal}
            onComplete={(r) =>
              handleSectionComplete("writing", {
                attemptId: r.attemptId,
                band: r.band,
              })
            }
          />
        )}
        {currentSection === "speaking" && (
          <SpeakingRunner
            topicId={mock.speakingTopicId}
            startedAt={sectionStartedAt}
            expireSignal={autoExpireSignal}
            onComplete={(r) =>
              handleSectionComplete("speaking", {
                sessionId: r.sessionId,
                band: r.band,
              })
            }
          />
        )}
        {!currentSection && (
          <div className="text-center py-12">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-violet-500" />
            <div className="mt-3 text-sm text-ink/60">Finalising results…</div>
          </div>
        )}
        {advancing && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink text-white rounded-full px-4 py-2 text-xs font-semibold shadow-pop flex items-center gap-2 z-50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Section locked. Moving on…
          </div>
        )}
      </div>
    </div>
  );
}
