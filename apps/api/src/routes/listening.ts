import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ListeningAttempt, ListeningSection, ListeningTest } from "@ielts/shared";
import { db } from "../lib/firebase.js";

/**
 * Each section also carries a `script` — the spoken text. The frontend POSTs that
 * to `/tts/speak` to synthesise the audio at play-time, so we don't need to ship
 * binary mp3s. ElevenLabs caches by (text, voice) so repeat listeners are free.
 */
type ListeningSectionWithScript = ListeningSection & { script: string };
type ListeningTestWithScripts = Omit<ListeningTest, "sections"> & {
  sections: ListeningSectionWithScript[];
};

const SEED_TESTS: ListeningTestWithScripts[] = [
  {
    id: "lt-coastline-walks",
    title: "IELTS Listening — Coastline Walks",
    estimatedMinutes: 30,
    source: "Cambridge-style sample",
    sections: [
      {
        id: "lt-coastline-walks-s1",
        sectionIndex: 1,
        kind: "social",
        title: "Section 1 — Booking a guided coastal walk",
        script:
          "Hello, Pembrokeshire Coastal Walks, this is Megan speaking, how can I help? — Hi Megan, I'd like to book a guided walk for next weekend, the one along the cliffs from Solva to Newgale. — Lovely. Could I take your name? — Yes, it's Daniel Harper, that's H-A-R-P-E-R. — Thanks, Daniel. The Solva walk runs on Saturday at 9:30 in the morning and again at 2 in the afternoon. Which would suit you? — The morning one, please. — Of course. The cost is 18 pounds per adult, and we ask for a 5 pound deposit when booking. — Right, and where do we meet? — At the harbour car park in Solva, by the lifeboat station. — And do I need any special gear? — Comfortable walking shoes, a waterproof jacket, and please bring at least one litre of water. We supply maps and snacks. — Perfect, I'll bring my partner along too.",
        transcript:
          "Booking call between Megan (Pembrokeshire Coastal Walks) and Daniel Harper.",
        questions: [
          {
            id: "s1q1",
            type: "short-answer",
            prompt: "What is the customer's surname? (one word)",
            answer: "Harper",
            explanation: "Daniel spells it: H-A-R-P-E-R.",
          },
          {
            id: "s1q2",
            type: "short-answer",
            prompt: "What time does the morning walk start? (e.g. 9:30)",
            answer: "9:30",
          },
          {
            id: "s1q3",
            type: "short-answer",
            prompt: "How much is the deposit, in pounds? (number only)",
            answer: "5",
          },
          {
            id: "s1q4",
            type: "multiple-choice",
            prompt: "Where do walkers meet?",
            options: [
              "Solva village square",
              "The harbour car park",
              "Newgale beach",
              "The lifeboat station entrance",
            ],
            answer: "1",
            explanation: "Megan says 'at the harbour car park in Solva, by the lifeboat station'.",
          },
          {
            id: "s1q5",
            type: "short-answer",
            prompt: "How much water should each walker bring? (e.g. '1 litre')",
            answer: "1 litre",
          },
        ],
      },
      {
        id: "lt-coastline-walks-s2",
        sectionIndex: 2,
        kind: "monologue",
        title: "Section 2 — Tour briefing at the visitor centre",
        script:
          "Good morning everyone, and welcome to the St Davids Visitor Centre. My name's Ifan, and I'll give you a quick overview of today's options before you head out. First, the cliff path north of the centre is open as far as Whitesands Bay — that's about a 4-kilometre walk, mostly level ground. South of here, the path is currently closed due to recent erosion near Caerfai, so please avoid that section entirely. Inside the centre, the upstairs gallery is hosting an exhibition of seabird photographs until the end of the month — entry is free. The cafe is open from 10 a.m. to 4 p.m. and serves locally baked bread and Welsh cheese. Finally, if you'd like to join the rockpool walk this afternoon, please sign up at the desk before noon. Tickets are limited to twelve people, so first come, first served. Any questions before you set off?",
        questions: [
          {
            id: "s2q1",
            type: "short-answer",
            prompt: "How long is the open cliff path to Whitesands Bay, in km? (number only)",
            answer: "4",
          },
          {
            id: "s2q2",
            type: "multiple-choice",
            prompt: "Why is the southern path closed?",
            options: [
              "Bird nesting season",
              "Construction work",
              "Recent erosion",
              "Slippery conditions",
            ],
            answer: "2",
          },
          {
            id: "s2q3",
            type: "multiple-choice",
            prompt: "What is on display in the upstairs gallery?",
            options: [
              "Local watercolours",
              "Seabird photographs",
              "Maps of the coast",
              "Welsh poetry",
            ],
            answer: "1",
          },
          {
            id: "s2q4",
            type: "short-answer",
            prompt: "What time does the cafe close? (e.g. '4 p.m.')",
            answer: "4 p.m.",
          },
          {
            id: "s2q5",
            type: "short-answer",
            prompt: "Maximum group size for the rockpool walk? (number)",
            answer: "12",
          },
        ],
      },
      {
        id: "lt-coastline-walks-s3",
        sectionIndex: 3,
        kind: "academic-discussion",
        title: "Section 3 — Students discussing a coastal ecology project",
        script:
          "Tutor: So, Anna and Karim, how's the project on the Pembrokeshire shoreline coming along? — Anna: Quite well. We've done three site visits and recorded the species in each rockpool. — Karim: The main issue so far is that limpets are far more abundant in the northern sites than we expected. — Tutor: Interesting. What might explain that? — Anna: We think it's the wave exposure — the northern coast is more sheltered, so the limpets don't get knocked off. — Karim: We also noticed almost no anemones at the southern sites, which we hadn't predicted. — Tutor: Have you considered water temperature? — Anna: Yes, that's our next variable. We'll bring data loggers next time. — Tutor: Good. Try to log readings every two hours for at least one full tidal cycle. And don't forget to standardise your sampling — the same 30-centimetre quadrat at each site.",
        questions: [
          {
            id: "s3q1",
            type: "multiple-choice",
            prompt: "How many site visits have the students completed?",
            options: ["Two", "Three", "Four", "Five"],
            answer: "1",
          },
          {
            id: "s3q2",
            type: "multiple-choice",
            prompt: "Why do the students believe limpets are more abundant in the north?",
            options: [
              "Warmer water there",
              "More food sources",
              "More shelter from waves",
              "Less human activity",
            ],
            answer: "2",
          },
          {
            id: "s3q3",
            type: "short-answer",
            prompt: "Which animal was unexpectedly rare at the southern sites? (one word)",
            answer: "anemones",
          },
          {
            id: "s3q4",
            type: "short-answer",
            prompt: "How often should the data loggers record? (e.g. 'every two hours')",
            answer: "every two hours",
          },
          {
            id: "s3q5",
            type: "short-answer",
            prompt: "What size is the standard quadrat, in centimetres? (number only)",
            answer: "30",
          },
        ],
      },
      {
        id: "lt-coastline-walks-s4",
        sectionIndex: 4,
        kind: "academic-lecture",
        title: "Section 4 — Lecture: How coastlines shape human settlement",
        script:
          "Good afternoon. Today's lecture concerns the often-overlooked influence of coastline geometry on human settlement patterns. Three factors matter most. First, indentation: deeply indented coasts, like those of Norway or western Scotland, create sheltered natural harbours, which historically attracted fishing communities long before engineered ports existed. Second, sediment: where rivers deposit large amounts of sediment, broad coastal plains form, which support agriculture and so larger inland populations — the Nile delta is the classic example. Third, tidal range: a high tidal range, as in the Severn Estuary, was once a barrier to navigation but is now seen as a potential resource for tidal energy. Modern coastal settlements increasingly must contend with rising sea levels, and planners now favour what we call 'managed realignment' — deliberately retreating from the most vulnerable shorelines rather than defending them with ever-higher walls.",
        questions: [
          {
            id: "s4q1",
            type: "short-answer",
            prompt: "What does deep indentation provide for early communities? (e.g. 'sheltered harbours')",
            answer: "sheltered harbours",
          },
          {
            id: "s4q2",
            type: "short-answer",
            prompt: "Which delta is given as the example of sediment-rich plains? (one word)",
            answer: "Nile",
          },
          {
            id: "s4q3",
            type: "multiple-choice",
            prompt: "How is the Severn Estuary's high tidal range described today?",
            options: [
              "A continuing barrier to navigation",
              "A safety hazard",
              "A potential energy resource",
              "An obstacle for tourism",
            ],
            answer: "2",
          },
          {
            id: "s4q4",
            type: "multiple-choice",
            prompt: "What approach do modern planners increasingly favour?",
            options: [
              "Building higher sea walls",
              "Managed realignment",
              "Coastal afforestation",
              "Sediment dredging",
            ],
            answer: "1",
          },
          {
            id: "s4q5",
            type: "short-answer",
            prompt: "What rising phenomenon must coastal settlements contend with? (two words)",
            answer: "sea levels",
          },
        ],
      },
    ],
  },
];

const SubmitBody = z.object({
  userId: z.string().min(1),
  testId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
  timeSpentSeconds: z.number().int().nonnegative(),
});

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isCorrect(expected: string, given: string): boolean {
  return normalise(expected) === normalise(given);
}

export function findListeningTestById(id: string): ListeningTestWithScripts | undefined {
  return SEED_TESTS.find((t) => t.id === id);
}

function questionsCount(t: ListeningTestWithScripts): number {
  return t.sections.reduce((n, s) => n + s.questions.length, 0);
}

/**
 * Convert raw score (out of 40 in real IELTS, but variable in our seed) to an IELTS band.
 * Uses the official 40-question conversion table proportionally scaled to the actual total.
 */
export function listeningBandFromRaw(score: number, total: number): number {
  if (total <= 0) return 0;
  const pct = score / total;
  // Approximate Cambridge conversion: 39-40→9, 37-38→8.5, 35-36→8, 32-34→7.5,
  // 30-31→7, 26-29→6.5, 23-25→6, 18-22→5.5, 16-17→5, 13-15→4.5, 10-12→4.
  const table: Array<[number, number]> = [
    [0.97, 9],
    [0.92, 8.5],
    [0.87, 8],
    [0.8, 7.5],
    [0.75, 7],
    [0.65, 6.5],
    [0.57, 6],
    [0.45, 5.5],
    [0.4, 5],
    [0.32, 4.5],
    [0.25, 4],
    [0, 3.5],
  ];
  for (const [threshold, band] of table) {
    if (pct >= threshold) return band;
  }
  return 0;
}

export async function registerListeningRoutes(app: FastifyInstance) {
  app.get("/listening/tests", async () => ({
    tests: SEED_TESTS.map((t) => ({
      id: t.id,
      title: t.title,
      estimatedMinutes: t.estimatedMinutes,
      sectionCount: t.sections.length,
      questionCount: questionsCount(t),
    })),
  }));

  app.get("/listening/tests/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = findListeningTestById(id);
    if (!t) return reply.code(404).send({ error: "not_found", message: "Test not found" });
    return t;
  });

  app.post("/listening/attempts", async (req, reply) => {
    const parsed = SubmitBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const { userId, testId, answers, timeSpentSeconds } = parsed.data;
    const test = findListeningTestById(testId);
    if (!test) return reply.code(404).send({ error: "not_found", message: "Test not found" });

    let score = 0;
    const breakdown: Array<{
      questionId: string;
      given: string;
      expected: string;
      correct: boolean;
      explanation?: string;
    }> = [];
    for (const section of test.sections) {
      for (const q of section.questions) {
        const given = answers[q.id] ?? "";
        const correct = given ? isCorrect(q.answer, given) : false;
        if (correct) score += 1;
        breakdown.push({
          questionId: q.id,
          given,
          expected: q.answer,
          correct,
          explanation: q.explanation,
        });
      }
    }

    const total = questionsCount(test);
    const ref = db().collection("listeningAttempts").doc();
    const attempt: ListeningAttempt = {
      id: ref.id,
      userId,
      testId,
      answers,
      score,
      total,
      timeSpentSeconds,
      createdAt: new Date().toISOString(),
    };
    await ref.set(attempt);
    return { attempt, breakdown, band: listeningBandFromRaw(score, total) };
  });
}
