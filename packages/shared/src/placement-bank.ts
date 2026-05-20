import type {
  CefrLevel,
  PlacementCategory,
  PlacementMcq,
  PlacementWritingPrompt,
} from "./index";

export const CEFR_LADDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Approximate CEFR → IELTS band mapping. Rough but standard. */
export const CEFR_TO_BAND: Record<CefrLevel, number> = {
  A1: 3.0,
  A2: 4.0,
  B1: 5.0,
  B2: 6.5,
  C1: 7.5,
  C2: 8.5,
};

export const PLACEMENT_MCQ_BANK: PlacementMcq[] = [
  // ===== A2 =====
  {
    id: "a2-g-1",
    category: "grammar",
    cefr: "A2",
    prompt: "She _____ to the store yesterday.",
    options: ["go", "goes", "went", "gone"],
    answer: 2,
    explanation: "Past simple — 'yesterday' signals a finished past time.",
  },
  {
    id: "a2-g-2",
    category: "grammar",
    cefr: "A2",
    prompt: "There _____ many people at the party last night.",
    options: ["was", "were", "is", "be"],
    answer: 1,
    explanation: "'People' is plural, so the past be-form is 'were'.",
  },
  {
    id: "a2-v-1",
    category: "vocabulary",
    cefr: "A2",
    prompt: "I'm very _____ today because I won the contest.",
    options: ["sad", "tired", "happy", "bored"],
    answer: 2,
  },
  {
    id: "a2-r-1",
    category: "reading",
    cefr: "A2",
    prompt:
      "\"Tom takes the bus to work every day. It usually takes 30 minutes, but today the bus is late.\" — How does Tom usually get to work?",
    options: ["By car", "By bus", "By train", "On foot"],
    answer: 1,
  },

  // ===== B1 =====
  {
    id: "b1-g-1",
    category: "grammar",
    cefr: "B1",
    prompt: "If I _____ more time, I would learn another language.",
    options: ["have", "had", "would have", "has"],
    answer: 1,
    explanation: "Second conditional uses past simple in the if-clause.",
  },
  {
    id: "b1-g-2",
    category: "grammar",
    cefr: "B1",
    prompt: "The book _____ by my favorite author was published last year.",
    options: ["written", "writing", "wrote", "writes"],
    answer: 0,
    explanation: "Past participle in a reduced relative clause.",
  },
  {
    id: "b1-v-1",
    category: "vocabulary",
    cefr: "B1",
    prompt: "The hotel _____ a free breakfast to all guests.",
    options: ["provides", "provokes", "prevents", "protests"],
    answer: 0,
  },
  {
    id: "b1-v-2",
    category: "vocabulary",
    cefr: "B1",
    prompt: "She didn't enjoy the film — she found the plot _____ and easy to predict.",
    options: ["thrilling", "predictable", "complex", "innovative"],
    answer: 1,
  },
  {
    id: "b1-r-1",
    category: "reading",
    cefr: "B1",
    prompt:
      "\"Despite the heavy rain, the festival continued and most attendees stayed until the end.\" — What can we conclude?",
    options: [
      "The rain stopped the festival.",
      "Few people came to the festival.",
      "The rain didn't stop the festival.",
      "The festival was indoors.",
    ],
    answer: 2,
  },

  // ===== B2 =====
  {
    id: "b2-g-1",
    category: "grammar",
    cefr: "B2",
    prompt: "Had I known about the meeting, I _____ attended.",
    options: ["will", "would have", "would", "had"],
    answer: 1,
    explanation: "Third conditional with inversion: 'Had I known... I would have...'.",
  },
  {
    id: "b2-g-2",
    category: "grammar",
    cefr: "B2",
    prompt: "She suggested _____ a different approach to the problem.",
    options: ["to try", "trying", "try", "tried"],
    answer: 1,
    explanation: "'Suggest' is followed by a gerund (-ing form).",
  },
  {
    id: "b2-v-1",
    category: "vocabulary",
    cefr: "B2",
    prompt: "His remarks were quite _____, showing little awareness of how they would hurt others.",
    options: ["insightful", "tactless", "eloquent", "reflective"],
    answer: 1,
  },
  {
    id: "b2-v-2",
    category: "vocabulary",
    cefr: "B2",
    prompt: "The company is _____ to expand its operations overseas next year.",
    options: ["reluctant", "poised", "hesitant", "impeded"],
    answer: 1,
    explanation: "'Poised to' = ready and likely to.",
  },
  {
    id: "b2-r-1",
    category: "reading",
    cefr: "B2",
    prompt:
      "\"While automation may threaten certain manual jobs, history suggests new technologies tend to create as many roles as they eliminate, though often requiring different skills.\" — What does the writer suggest about automation?",
    options: [
      "It will cause mass unemployment.",
      "It eliminates jobs without creating new ones.",
      "It replaces some jobs but creates others, often requiring retraining.",
      "It only affects manual labor permanently.",
    ],
    answer: 2,
  },
  {
    id: "b2-r-2",
    category: "reading",
    cefr: "B2",
    prompt:
      "\"The committee's decision, though widely criticized, was ultimately upheld.\" — The closest meaning of 'upheld' here is:",
    options: ["overturned", "maintained", "reviewed", "postponed"],
    answer: 1,
  },

  // ===== C1 =====
  {
    id: "c1-g-1",
    category: "grammar",
    cefr: "C1",
    prompt: "Rarely _____ such a dedicated student in my entire career.",
    options: [
      "I have encountered",
      "have I encountered",
      "I encountered",
      "did I encountered",
    ],
    answer: 1,
    explanation: "Negative adverb 'rarely' at the start triggers subject-auxiliary inversion.",
  },
  {
    id: "c1-g-2",
    category: "grammar",
    cefr: "C1",
    prompt: "_____ for his quick thinking, the situation could have ended badly.",
    options: ["Had not been", "Were it not", "If it not", "Without been"],
    answer: 1,
    explanation: "'Were it not for X' is the inverted form of 'If it were not for X'.",
  },
  {
    id: "c1-v-1",
    category: "vocabulary",
    cefr: "C1",
    prompt:
      "The new policy was met with _____ from senior staff who felt it undermined their authority.",
    options: ["acclaim", "indifference", "consternation", "accolade"],
    answer: 2,
    explanation: "'Consternation' = anxious dismay.",
  },
  {
    id: "c1-v-2",
    category: "vocabulary",
    cefr: "C1",
    prompt: "His argument, though _____, ultimately failed to convince the jury.",
    options: ["cogent", "banal", "verbose", "trivial"],
    answer: 0,
    explanation: "'Cogent' = clear, logical, and persuasive.",
  },
  {
    id: "c1-r-1",
    category: "reading",
    cefr: "C1",
    prompt:
      "\"The minister's response, couched in conciliatory language, nonetheless failed to address the substantive concerns raised.\" — What does the writer imply?",
    options: [
      "The minister gave a sincere apology.",
      "The minister sounded friendly but didn't tackle the real issues.",
      "The minister refused to respond.",
      "The minister fully addressed the concerns.",
    ],
    answer: 1,
  },
  {
    id: "c1-r-2",
    category: "reading",
    cefr: "C1",
    prompt:
      "\"While not without its merits, the proposal overlooks the broader implications for marginalized communities.\" — What is the writer's attitude?",
    options: [
      "Wholly enthusiastic",
      "Cautiously critical",
      "Entirely dismissive",
      "Indifferent",
    ],
    answer: 1,
  },

  // ===== C2 =====
  {
    id: "c2-g-1",
    category: "grammar",
    cefr: "C2",
    prompt: "_____ been informed in time, we might have averted the crisis.",
    options: ["Had we", "If we have", "Should we", "Were we"],
    answer: 0,
  },
  {
    id: "c2-v-1",
    category: "vocabulary",
    cefr: "C2",
    prompt: "The minister's _____ remarks did little to placate the angry crowd.",
    options: ["effusive", "anodyne", "saccharine", "mellifluous"],
    answer: 1,
    explanation: "'Anodyne' = bland and inoffensive — unlikely to soothe a genuinely angry crowd.",
  },
  {
    id: "c2-v-2",
    category: "vocabulary",
    cefr: "C2",
    prompt: "Her speech was so _____ that even her opponents conceded its brilliance.",
    options: ["pedestrian", "trenchant", "verbose", "jejune"],
    answer: 1,
    explanation: "'Trenchant' = vigorous, incisive, and effective.",
  },
  {
    id: "c2-r-1",
    category: "reading",
    cefr: "C2",
    prompt:
      "\"The senator's apparent volte-face on climate policy, ostensibly motivated by 'evolving science,' coincided suspiciously with shifts in donor sentiment.\" — What does the writer imply?",
    options: [
      "The senator updated views based on new evidence.",
      "The senator's stated reason may be disingenuous; donor pressure is the likelier driver.",
      "The senator is open-minded.",
      "The senator opposed climate action throughout.",
    ],
    answer: 1,
  },
];

export const PLACEMENT_WRITING_PROMPTS: PlacementWritingPrompt[] = [
  {
    id: "w-b1",
    cefr: "B1",
    prompt:
      "Describe your hometown. What is it like, and what is one thing you would change about it? Write 50–80 words.",
    minWords: 50,
    maxWords: 80,
    timeMinutes: 5,
  },
  {
    id: "w-b2",
    cefr: "B2",
    prompt:
      "Some people believe children should start learning a second language before age 10. Do you agree? Give your opinion with one supporting reason. Write 60–100 words.",
    minWords: 60,
    maxWords: 100,
    timeMinutes: 5,
  },
  {
    id: "w-c1",
    cefr: "C1",
    prompt:
      "Some argue that social media has made us more isolated despite increased connectivity. Briefly evaluate this claim, addressing one argument on each side. Write 70–110 words.",
    minWords: 70,
    maxWords: 110,
    timeMinutes: 5,
  },
];

/** Pick the next MCQ at the requested CEFR level that hasn't been asked yet. */
export function pickNextMcq(
  targetCefr: CefrLevel,
  excludeIds: ReadonlySet<string>,
): PlacementMcq | null {
  const pool = PLACEMENT_MCQ_BANK.filter(
    (q) => q.cefr === targetCefr && !excludeIds.has(q.id),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/** Pick the writing prompt closest to the user's MCQ track-ending CEFR level. */
export function pickWritingPrompt(estimatedCefr: CefrLevel): PlacementWritingPrompt {
  const ladderIdx = CEFR_LADDER.indexOf(estimatedCefr);
  let best = PLACEMENT_WRITING_PROMPTS[0]!;
  let bestDist = Infinity;
  for (const p of PLACEMENT_WRITING_PROMPTS) {
    const dist = Math.abs(CEFR_LADDER.indexOf(p.cefr) - ladderIdx);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

/**
 * Step the CEFR level one rung up or down within the supported range (A2..C2).
 * A1 isn't used for placement questions — too few users at that level, and
 * the bank starts at A2.
 */
export function stepCefr(level: CefrLevel, direction: "up" | "down"): CefrLevel {
  const idx = CEFR_LADDER.indexOf(level);
  const min = CEFR_LADDER.indexOf("A2");
  const max = CEFR_LADDER.indexOf("C2");
  const next = direction === "up" ? Math.min(idx + 1, max) : Math.max(idx - 1, min);
  return CEFR_LADDER[next] ?? level;
}
