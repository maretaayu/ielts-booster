export * from "./placement-bank";

export type TaskType = "task1-academic" | "task1-gt" | "task2";

export type IeltsBand =
  | 0 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5
  | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9;

export type ChartData =
  | {
      kind: "line";
      yLabel?: string;
      xLabels: string[];
      series: Array<{ name: string; values: number[]; color?: string }>;
    }
  | {
      kind: "bar";
      yLabel?: string;
      categories: string[];
      series: Array<{ name: string; values: number[]; color?: string }>;
    }
  | {
      kind: "pie";
      panels: Array<{
        title: string;
        slices: Array<{ label: string; value: number; color?: string }>;
      }>;
    }
  | {
      kind: "process";
      steps: Array<{ label: string; description: string }>;
    }
  | {
      kind: "map";
      panels: Array<{
        title: string;
        features: string[];
      }>;
    };

export interface Prompt {
  id: string;
  type: TaskType;
  title: string;
  question: string;
  imageUrl?: string;
  chartData?: ChartData;
  minWords: number;
  timeMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
}

export interface CriterionFeedback {
  band: IeltsBand;
  strengths: string[];
  improvements: string[];
}

export interface InlineAnnotation {
  startIndex: number;
  endIndex: number;
  type: "error" | "suggestion" | "praise";
  category:
    | "grammar"
    | "spelling"
    | "vocabulary"
    | "cohesion"
    | "task-response"
    | "style";
  comment: string;
  suggestion?: string;
}

export interface SentenceStructureTip {
  pattern: string;
  example: string;
  whyItHelps: string;
  whereToUse: string;
}

export interface GradingResult {
  overallBand: IeltsBand;
  criteria: {
    taskAchievement: CriterionFeedback;
    coherenceCohesion: CriterionFeedback;
    lexicalResource: CriterionFeedback;
    grammaticalRangeAccuracy: CriterionFeedback;
  };
  annotations: InlineAnnotation[];
  vocabularyUpgrades: Array<{
    original: string;
    upgraded: string;
    reason: string;
  }>;
  sentenceStructureTips: SentenceStructureTip[];
  sampleAnswer: string;
  summary: string;
}

export interface Attempt {
  id: string;
  userId: string;
  promptId: string;
  promptSnapshot: Pick<Prompt, "type" | "title" | "question" | "minWords">;
  essay: string;
  wordCount: number;
  timeSpentSeconds: number;
  status: "submitted" | "grading" | "graded" | "failed";
  result?: GradingResult;
  createdAt: string;
  gradedAt?: string;
}

export interface GradeRequest {
  promptId: string;
  essay: string;
  timeSpentSeconds: number;
  userId: string;
}

export interface GradeResponse {
  attemptId: string;
  result: GradingResult;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

// ===== Study Plan =====

export type SkillArea = "writing" | "reading" | "listening" | "speaking" | "vocabulary" | "grammar";

export interface StudyTask {
  skill: SkillArea;
  title: string;
  description: string;
  estimatedMinutes: number;
}

export interface StudyDay {
  dayIndex: number;
  date: string;
  focus: string;
  tasks: StudyTask[];
  totalMinutes: number;
}

export interface StudyPlan {
  id: string;
  userId: string;
  targetBand: number;
  examDate: string;
  currentBand?: number;
  weakAreas: SkillArea[];
  dailyMinutes: number;
  days: StudyDay[];
  weeklyMilestones: Array<{ weekIndex: number; goal: string }>;
  overallStrategy: string;
  createdAt: string;
}

export interface CreateStudyPlanRequest {
  userId: string;
  targetBand: number;
  examDate: string;
  currentBand?: number;
  weakAreas: SkillArea[];
  dailyMinutes: number;
}

// ===== Reading =====

export type ReadingQuestionType =
  | "true-false-notgiven"
  | "yes-no-notgiven"
  | "multiple-choice"
  | "matching-headings"
  | "short-answer";

export interface ReadingQuestion {
  id: string;
  type: ReadingQuestionType;
  prompt: string;
  /** For MCQ + matching-headings */
  options?: string[];
  /** Canonical answer (string for tf/yn/short, option index as string for MCQ, heading text/id for matching) */
  answer: string;
  /** Optional explanation revealed after submission */
  explanation?: string;
  /** Paragraph index/letter the question relates to (helps render hints) */
  paragraphRef?: string;
}

export interface ReadingPassage {
  id: string;
  title: string;
  /** Plain-text passage; paragraphs separated by \n\n. Optionally tagged with [P1]…[P6] markers. */
  body: string;
  /** Optional ordered heading list for "matching headings" questions (a superset — some are distractors) */
  headings?: string[];
  questions: ReadingQuestion[];
  wordCount: number;
  estimatedMinutes: number;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  source?: string;
}

export interface DefineRequest {
  word: string;
  /** Surrounding sentence to disambiguate the sense */
  context?: string;
  userId: string;
  passageId?: string;
}

export interface WordDefinition {
  word: string;
  partOfSpeech: string;
  meaning: string;
  /** Indonesian translation of the word in this sense (1-3 short equivalents joined by " / ") */
  indonesian: string;
  /** Indonesian translation of the example sentence */
  indonesianExample?: string;
  synonyms: string[];
  exampleSentence: string;
  contextualNote?: string;
}

export interface VocabEntry {
  id: string;
  userId: string;
  word: string;
  definition: WordDefinition;
  passageId?: string;
  context?: string;
  createdAt: string;

  // SM-2 lite spaced repetition state. Defaults applied server-side if missing.
  ease?: number; // multiplier, starts at 2.5
  interval?: number; // days until next review; 0 = new
  reps?: number; // total successful reviews
  lapses?: number; // times rated "Again"
  dueAt?: string; // YYYY-MM-DD — when card next needs review
  lastReviewedAt?: string; // ISO timestamp
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewSessionSummary {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  remainingDue: number;
}

// ===== Speaking =====

export type SpeakingPart = "part1" | "part2" | "part3";

export interface SpeakingTopic {
  id: string;
  part: SpeakingPart;
  title: string;
  theme: string; // e.g. "work & study", "hobbies"
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  /** Part 1: 4-5 short questions. Part 2: cue card prompt + bullets. Part 3: 3-5 deeper questions. */
  questions: string[];
  /** Only set for Part 2 — the "you should say" bullets shown alongside the prompt. */
  cueCardBullets?: string[];
  /** Optional natural follow-ups linked from a Part 2 — used to chain into Part 3. */
  linkedPart3?: string;
  tags: string[];
}

export interface SpeakingTurn {
  questionIndex: number;
  question: string;
  /** Transcript of what the user said (may be partial / messy from STT). */
  transcript: string;
  /** Approx duration of the user's reply in seconds (clock-based, since we don't have audio). */
  durationSeconds: number;
}

export interface SpeakingCriterionScore {
  band: IeltsBand;
  feedback: string;
}

export interface SpeakingScore {
  overallBand: IeltsBand;
  criteria: {
    fluencyCoherence: SpeakingCriterionScore;
    lexicalResource: SpeakingCriterionScore;
    grammaticalRangeAccuracy: SpeakingCriterionScore;
    pronunciation: SpeakingCriterionScore;
  };
  topTips: string[];
  vocabularyUpgrades: Array<{ original: string; upgraded: string; reason: string }>;
  /** Brief sample band-8+ answer for one of the questions in the session. */
  sampleAnswer: { questionIndex: number; answer: string };
  summary: string;
  /** Honest disclosure since real pronunciation needs audio analysis. */
  disclaimer: string;
}

export interface SpeakingSession {
  id: string;
  userId: string;
  topicId: string;
  topicSnapshot: Pick<SpeakingTopic, "title" | "part" | "theme">;
  turns: SpeakingTurn[];
  totalSeconds: number;
  status: "in_progress" | "scoring" | "scored" | "failed";
  score?: SpeakingScore;
  createdAt: string;
  scoredAt?: string;
}

export interface ScoreSpeakingRequest {
  userId: string;
  topicId: string;
  turns: SpeakingTurn[];
  totalSeconds: number;
}

export interface ReadingAttempt {
  id: string;
  userId: string;
  passageId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  timeSpentSeconds: number;
  createdAt: string;
}

// ===== Onboarding & profile =====

export type IeltsModule = "academic" | "general-training";

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type PlacementCategory = "grammar" | "vocabulary" | "reading";

export interface PlacementMcq {
  id: string;
  category: PlacementCategory;
  cefr: CefrLevel;
  prompt: string;
  options: string[];
  /** Index of the correct option in `options`. */
  answer: number;
  explanation?: string;
}

export interface PlacementWritingPrompt {
  id: string;
  /** Intended target level — used to pick a prompt matching the user's MCQ track. */
  cefr: CefrLevel;
  prompt: string;
  minWords: number;
  maxWords: number;
  timeMinutes: number;
}

export interface PlacementResult {
  cefr: CefrLevel;
  /** IELTS band estimate (0–9, half-steps) so dashboard & plan stay compatible with currentBand. */
  estimatedBand: number;
  takenAt: string;
  mcqCorrect: number;
  mcqAsked: number;
  writingBand?: number;
  /** Optional per-category accuracy for future personalization (e.g. weakest area surfacing). */
  skillBreakdown?: Partial<Record<PlacementCategory, { correct: number; asked: number }>>;
}

export interface UserProfile {
  userId: string;
  name: string;
  module: IeltsModule;
  currentBand: number;
  targetBand: number;
  examDate: string;
  dailyMinutes: number;
  weakAreas: SkillArea[];
  onboardedAt: string;
  /** Set after the user completes the placement test. Absent if they skipped. */
  placement?: PlacementResult;
}

// ===== Calendar =====

export interface CalendarConnection {
  userId: string;
  provider: "google";
  email?: string;
  connectedAt: string;
}

export interface CalendarSyncResult {
  eventsCreated: number;
  eventsSkipped: number;
  calendarId: string;
}

// ===== Listening =====

export type ListeningSectionKind = "social" | "monologue" | "academic-discussion" | "academic-lecture";

export type ListeningQuestionType =
  | "multiple-choice"
  | "short-answer"
  | "form-completion"
  | "matching";

export interface ListeningQuestion {
  id: string;
  type: ListeningQuestionType;
  prompt: string;
  options?: string[];
  /** Canonical answer. For MCQ: option index as string. For others: the text. */
  answer: string;
  explanation?: string;
}

export interface ListeningSection {
  id: string;
  sectionIndex: 1 | 2 | 3 | 4;
  kind: ListeningSectionKind;
  title: string;
  /** Public URL to the audio recording. Optional — UI degrades to "audio missing" notice if absent. */
  audioUrl?: string;
  /** Optional plain-text transcript revealed after submit, useful for review. */
  transcript?: string;
  questions: ListeningQuestion[];
}

export interface ListeningTest {
  id: string;
  title: string;
  estimatedMinutes: number;
  sections: ListeningSection[];
  source?: string;
}

export interface ListeningTestSummary {
  id: string;
  title: string;
  estimatedMinutes: number;
  sectionCount: number;
  questionCount: number;
}

export interface ListeningAttempt {
  id: string;
  userId: string;
  testId: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  timeSpentSeconds: number;
  createdAt: string;
}

// ===== Mock Test (full 4-section simulator) =====

export type MockSectionId = "listening" | "reading" | "writing" | "speaking";

export type MockSectionStatus = "pending" | "in_progress" | "completed" | "skipped";

export interface MockSectionState {
  status: MockSectionStatus;
  /** ms since epoch of when this section started in the orchestrator */
  startedAt?: string;
  completedAt?: string;
  /** Section-specific result references */
  listeningAttemptId?: string;
  readingAttemptId?: string;
  writingAttemptId?: string;
  speakingSessionId?: string;
  /** Section band (0–9, half-points). Set when result is ready. */
  band?: IeltsBand;
  /** Raw score for objective sections */
  rawScore?: number;
  rawTotal?: number;
}

export interface MockTestSession {
  id: string;
  userId: string;
  status: "in_progress" | "completed" | "abandoned";
  /** Section ids the user is taking, in fixed order. */
  listeningTestId: string;
  readingPassageId: string;
  writingPromptId: string;
  speakingTopicId: string;
  sections: Record<MockSectionId, MockSectionState>;
  overallBand?: IeltsBand;
  createdAt: string;
  completedAt?: string;
}

export interface StartMockTestRequest {
  userId: string;
  listeningTestId?: string;
  readingPassageId?: string;
  writingPromptId?: string;
  speakingTopicId?: string;
}

export interface UpdateMockSectionRequest {
  userId: string;
  section: MockSectionId;
  status: MockSectionStatus;
  listeningAttemptId?: string;
  readingAttemptId?: string;
  writingAttemptId?: string;
  speakingSessionId?: string;
  band?: IeltsBand;
  rawScore?: number;
  rawTotal?: number;
}
