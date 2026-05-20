import type {
  Attempt,
  CalendarSyncResult,
  CefrLevel,
  CreateStudyPlanRequest,
  GradeRequest,
  GradeResponse,
  ListeningAttempt,
  ListeningTest,
  ListeningTestSummary,
  MockTestSession,
  PlacementCategory,
  PlacementResult,
  Prompt,
  ReadingAttempt,
  ReadingPassage,
  ReviewRating,
  ScoreSpeakingRequest,
  SpeakingSession,
  SpeakingTopic,
  StartMockTestRequest,
  StudyPlan,
  UpdateMockSectionRequest,
  UserProfile,
  VocabEntry,
  WordDefinition,
} from "@ielts/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listPrompts: (type?: string) =>
    request<{ prompts: Prompt[] }>(`/prompts${type ? `?type=${type}` : ""}`),
  getPrompt: (id: string) => request<Prompt>(`/prompts/${id}`),
  grade: (body: GradeRequest) =>
    request<GradeResponse>("/grade", { method: "POST", body: JSON.stringify(body) }),
  listAttempts: (userId: string) =>
    request<{ attempts: Attempt[] }>(`/attempts?userId=${userId}`),
  getAttempt: (id: string) => request<Attempt>(`/attempts/${id}`),
  createStudyPlan: (body: CreateStudyPlanRequest) =>
    request<StudyPlan>("/study-plan", { method: "POST", body: JSON.stringify(body) }),
  getStudyPlan: (id: string) => request<StudyPlan>(`/study-plan/${id}`),
  listStudyPlans: (userId: string) =>
    request<{ plans: StudyPlan[] }>(`/study-plans?userId=${userId}`),

  listPassages: () =>
    request<{
      passages: Array<
        Omit<ReadingPassage, "questions" | "body"> & { questionCount: number; preview: string }
      >;
    }>(`/passages`),
  getPassage: (id: string) => request<ReadingPassage>(`/passages/${id}`),
  submitReading: (body: {
    userId: string;
    passageId: string;
    answers: Record<string, string>;
    timeSpentSeconds: number;
  }) =>
    request<{
      attempt: ReadingAttempt;
      breakdown: Array<{
        questionId: string;
        given: string;
        expected: string;
        correct: boolean;
        explanation?: string;
      }>;
    }>(`/reading-attempts`, { method: "POST", body: JSON.stringify(body) }),

  define: (body: {
    word: string;
    context?: string;
    userId: string;
    passageId?: string;
    save?: boolean;
  }) =>
    request<{ definition: WordDefinition; entry: VocabEntry | null }>(`/define`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listVocab: (userId: string) =>
    request<{ entries: VocabEntry[] }>(`/vocab?userId=${userId}`),
  deleteVocab: (id: string, userId: string) =>
    request<{ ok: true }>(`/vocab/${id}?userId=${userId}`, { method: "DELETE" }),

  saveProfile: (body: Omit<UserProfile, "onboardedAt">) =>
    request<UserProfile>(`/profile`, { method: "PUT", body: JSON.stringify(body) }),
  getProfile: (userId: string) => request<UserProfile>(`/profile/${userId}`),

  googleAuthUrl: (userId: string, returnTo?: string, intent?: "signin" | "calendar") =>
    request<{ url: string }>(
      `/auth/google/url?userId=${encodeURIComponent(userId)}${
        returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
      }${intent ? `&intent=${intent}` : ""}`,
    ),
  calendarStatus: (userId: string) =>
    request<
      | { connected: false }
      | { connected: true; email?: string; connectedAt: string }
    >(`/calendar/status?userId=${encodeURIComponent(userId)}`),
  calendarDisconnect: (userId: string) =>
    request<{ ok: true }>(`/calendar/disconnect?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
  syncPlanToCalendar: (body: { userId: string; planId: string; startTime?: string }) =>
    request<CalendarSyncResult>(`/calendar/sync-plan`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  dueVocab: (userId: string) =>
    request<{
      due: VocabEntry[];
      counts: { new: number; dueToday: number; total: number };
    }>(`/vocab/due?userId=${encodeURIComponent(userId)}`),
  reviewVocab: (id: string, body: { userId: string; rating: ReviewRating }) =>
    request<VocabEntry>(`/vocab/${id}/review`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  listSpeakingTopics: () => request<{ topics: SpeakingTopic[] }>(`/speaking/topics`),
  getSpeakingTopic: (id: string) => request<SpeakingTopic>(`/speaking/topics/${id}`),
  scoreSpeaking: (body: ScoreSpeakingRequest) =>
    request<SpeakingSession>(`/speaking/score`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSpeakingSession: (id: string) =>
    request<SpeakingSession>(`/speaking/sessions/${id}`),
  listSpeakingSessions: (userId: string) =>
    request<{ sessions: SpeakingSession[] }>(
      `/speaking/sessions?userId=${encodeURIComponent(userId)}`,
    ),

  initConversation: (topicId: string) =>
    request<{
      signedUrl: string;
      dynamicVariables: Record<string, string | number>;
      topic: {
        id: string;
        title: string;
        part: "part1" | "part2" | "part3";
        theme: string;
        cueCardBullets: string[] | null;
      };
    }>(`/speaking/conversation/init`, {
      method: "POST",
      body: JSON.stringify({ topicId }),
    }),
  listListeningTests: () =>
    request<{ tests: ListeningTestSummary[] }>(`/listening/tests`),
  getListeningTest: (id: string) => request<ListeningTest>(`/listening/tests/${id}`),
  submitListening: (body: {
    userId: string;
    testId: string;
    answers: Record<string, string>;
    timeSpentSeconds: number;
  }) =>
    request<{
      attempt: ListeningAttempt;
      breakdown: Array<{
        questionId: string;
        given: string;
        expected: string;
        correct: boolean;
        explanation?: string;
      }>;
      band: number;
    }>(`/listening/attempts`, { method: "POST", body: JSON.stringify(body) }),
  ttsSpeakUrl: (text: string, voiceId?: string) => ({
    url: `${API_URL}/tts/speak`,
    body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
  }),

  startMockTest: (body: StartMockTestRequest) =>
    request<MockTestSession>(`/mock-test`, { method: "POST", body: JSON.stringify(body) }),
  getMockTest: (id: string) => request<MockTestSession>(`/mock-test/${id}`),
  updateMockSection: (id: string, body: UpdateMockSectionRequest) =>
    request<MockTestSession>(`/mock-test/${id}/section`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  listMockTests: (userId: string) =>
    request<{ sessions: MockTestSession[] }>(
      `/mock-tests?userId=${encodeURIComponent(userId)}`,
    ),

  scorePlacementWriting: (body: {
    essay: string;
    promptText: string;
    targetCefr: CefrLevel;
  }) =>
    request<{ cefr: CefrLevel; estimatedBand: number; summary: string }>(
      `/placement/score-writing`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  savePlacement: (
    userId: string,
    body: {
      cefr: CefrLevel;
      estimatedBand: number;
      mcqCorrect: number;
      mcqAsked: number;
      writingBand?: number;
      skillBreakdown?: Partial<
        Record<PlacementCategory, { correct: number; asked: number }>
      >;
    },
  ) =>
    request<{ ok: true; placement: PlacementResult }>(
      `/profile/${encodeURIComponent(userId)}/placement`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  scoreRealtime: (body: {
    userId: string;
    topicId: string;
    totalSeconds: number;
    messages: Array<{
      source: "user" | "ai";
      text: string;
      elapsedSeconds?: number;
    }>;
  }) =>
    request<SpeakingSession>(`/speaking/score-realtime`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const ONBOARDED_KEY = "ielts.onboarded";

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded(planId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDED_KEY, "1");
  if (planId) localStorage.setItem("ielts.planId", planId);
}

export function getActivePlanId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ielts.planId");
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("ielts.userId");
  if (!id) {
    id = `u_${crypto.randomUUID()}`;
    localStorage.setItem("ielts.userId", id);
  }
  return id;
}

/**
 * Clears all locally-stored user state. Best-effort revokes Google Calendar tokens.
 * After calling this, OnboardingGate will redirect to /onboarding on next render.
 */
export async function signOut(): Promise<void> {
  if (typeof window === "undefined") return;
  const userId = localStorage.getItem("ielts.userId");
  if (userId) {
    try {
      await api.calendarDisconnect(userId);
    } catch {
      // Best-effort — proceed even if revoke fails.
    }
  }
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith("ielts.")) localStorage.removeItem(k);
  }
}
