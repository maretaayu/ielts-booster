import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { CreateStudyPlanRequest, StudyPlan } from "@ielts/shared";
import { withGeminiRetry } from "./gemini-retry.js";

const apiKey = process.env.GEMINI_API_KEY ?? "";
const client = new GoogleGenerativeAI(apiKey);

const planSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallStrategy: { type: SchemaType.STRING },
    weeklyMilestones: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          weekIndex: { type: SchemaType.NUMBER },
          goal: { type: SchemaType.STRING },
        },
        required: ["weekIndex", "goal"],
      },
    },
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          dayIndex: { type: SchemaType.NUMBER },
          date: { type: SchemaType.STRING },
          focus: { type: SchemaType.STRING },
          totalMinutes: { type: SchemaType.NUMBER },
          tasks: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                skill: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                estimatedMinutes: { type: SchemaType.NUMBER },
              },
              required: ["skill", "title", "description", "estimatedMinutes"],
            },
          },
        },
        required: ["dayIndex", "date", "focus", "tasks", "totalMinutes"],
      },
    },
  },
  required: ["overallStrategy", "weeklyMilestones", "days"],
};

const SYSTEM_PROMPT = `You are an experienced IELTS coach who builds personalized daily study plans.

Output rules:
- Skills are exactly one of: "writing", "reading", "listening", "speaking", "vocabulary", "grammar".
- Each day must total close to the user's dailyMinutes target (±10%). Don't overload.
- Front-load drill on the user's weak areas during the first half of the plan. Add full mock tests in the final week.

Task fields:
- "title": 6-12 words, concrete (e.g. "Listening Section 1 Practice: Form Completion").
- "description": 1-3 sentences. MUST include: volume (how many exercises/passages/cards), specific focus or sub-skill, and what to pay attention to. Reference Cambridge IELTS books for mock material when relevant.
  Example: "Complete 2 practice tests from Cambridge IELTS books focusing on Section 1 (form/note completion). Pay attention to spelling and accuracy."
- "estimatedMinutes": realistic for the volume described.
- Avoid filler like "Practice this skill" or "Improve your X". Always give a count, a focus, and a check.

Other fields:
- "focus" is one short phrase (e.g. "Listening section 3 + vocab review").
- "overallStrategy" is 2-3 sentences explaining the approach for THIS learner.
- Mix passive and active tasks. Add at least one rest/light day per week.

All output MUST be valid JSON matching the schema.`;

function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(start: string, end: string): number {
  // both YYYY-MM-DD; compare via local-midnight Date objects
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000);
}

/**
 * Parse the model's JSON response, repairing simple truncation when needed.
 * Strategy on parse failure:
 *  - Walk backwards from the end looking for the last complete object inside `"days"`.
 *  - Close the array, then close any open `{` / `[` braces to make the doc parseable.
 *  - Reparse. We'd rather return a short-but-valid plan than blow up the request.
 */
function parsePlanJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const repaired = repairTruncatedJson(raw);
    return JSON.parse(repaired);
  }
}

function repairTruncatedJson(raw: string): string {
  // Find a clean cut: the last "}," that lives at the days-array nesting depth.
  // Heuristic — strip from the last "},\n      " pattern, then close braces.
  const idx = raw.lastIndexOf("},");
  let s = idx > 0 ? raw.slice(0, idx + 1) : raw;

  // Count braces / brackets to balance closing tokens. Walk only outside strings.
  let inStr = false;
  let esc = false;
  let curly = 0;
  let square = 0;
  for (const ch of s) {
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") curly += 1;
    else if (ch === "}") curly -= 1;
    else if (ch === "[") square += 1;
    else if (ch === "]") square -= 1;
  }
  while (square > 0) {
    s += "]";
    square -= 1;
  }
  while (curly > 0) {
    s += "}";
    curly -= 1;
  }
  return s;
}

export async function generateStudyPlan(
  req: CreateStudyPlanRequest,
): Promise<Pick<StudyPlan, "overallStrategy" | "weeklyMilestones" | "days">> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const todayStr = localDateString(new Date());
  const totalDays = Math.max(1, daysBetween(todayStr, req.examDate) + 1);

  if (totalDays > 90) {
    throw new Error("Plan duration capped at 90 days; pick an exam date within 3 months.");
  }

  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: planSchema as never,
      temperature: 0.5,
      maxOutputTokens: 32768,
    },
  });

  const userPrompt = `Build a ${totalDays}-day IELTS study plan starting ${todayStr} (Day 1) and ending ${req.examDate} (Day ${totalDays}, exam day).

Learner profile:
- Target band: ${req.targetBand}
- Current band (self-assessed): ${req.currentBand ?? "unknown"}
- Self-identified weak areas: ${req.weakAreas.length ? req.weakAreas.join(", ") : "none specified — diagnose by giving balanced practice"}
- Daily study time available: ${req.dailyMinutes} minutes

Produce exactly ${totalDays} entries in "days" with sequential dayIndex starting at 1. The date field can be left as today's date — server will overwrite with the correct calendar date. Return JSON only.`;

  const res = await withGeminiRetry(() => model.generateContent(userPrompt));
  const rawText = res.response.text();
  const parsed = parsePlanJson(rawText) as Pick<
    StudyPlan,
    "overallStrategy" | "weeklyMilestones" | "days"
  >;

  // Override Gemini's dayIndex + date with deterministic local-calendar values
  // so we never depend on the model's date arithmetic or timezone handling.
  const start = new Date(`${todayStr}T00:00:00`);
  const fixedDays = parsed.days.slice(0, totalDays).map((d, i) => ({
    ...d,
    dayIndex: i + 1,
    date: localDateString(addDays(start, i)),
  }));

  return { ...parsed, days: fixedDays };
}
