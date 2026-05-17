import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { GradingResult, Prompt } from "@ielts/shared";
import { withGeminiRetry } from "./gemini-retry.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[gemini] GEMINI_API_KEY not set — /grade will fail until configured");
}

const client = new GoogleGenerativeAI(apiKey ?? "");

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallBand: { type: SchemaType.NUMBER },
    criteria: {
      type: SchemaType.OBJECT,
      properties: {
        taskAchievement: criterionSchema(),
        coherenceCohesion: criterionSchema(),
        lexicalResource: criterionSchema(),
        grammaticalRangeAccuracy: criterionSchema(),
      },
      required: [
        "taskAchievement",
        "coherenceCohesion",
        "lexicalResource",
        "grammaticalRangeAccuracy",
      ],
    },
    annotations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          startIndex: { type: SchemaType.NUMBER },
          endIndex: { type: SchemaType.NUMBER },
          type: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
          comment: { type: SchemaType.STRING },
          suggestion: { type: SchemaType.STRING },
        },
        required: ["startIndex", "endIndex", "type", "category", "comment"],
      },
    },
    vocabularyUpgrades: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          original: { type: SchemaType.STRING },
          upgraded: { type: SchemaType.STRING },
          reason: { type: SchemaType.STRING },
        },
        required: ["original", "upgraded", "reason"],
      },
    },
    sentenceStructureTips: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          pattern: { type: SchemaType.STRING },
          example: { type: SchemaType.STRING },
          whyItHelps: { type: SchemaType.STRING },
          whereToUse: { type: SchemaType.STRING },
        },
        required: ["pattern", "example", "whyItHelps", "whereToUse"],
      },
    },
    sampleAnswer: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
  },
  required: [
    "overallBand",
    "criteria",
    "annotations",
    "vocabularyUpgrades",
    "sentenceStructureTips",
    "sampleAnswer",
    "summary",
  ],
};

function criterionSchema() {
  return {
    type: SchemaType.OBJECT,
    properties: {
      band: { type: SchemaType.NUMBER },
      strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      improvements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    },
    required: ["band", "strengths", "improvements"],
  };
}

const SYSTEM_PROMPT = `You are an experienced IELTS examiner certified by Cambridge Assessment English. You grade essays using the official IELTS Writing band descriptors (public version).

For each submission, evaluate strictly on the four criteria:
1. Task Achievement / Task Response — does the essay address all parts of the task with a clear position and well-developed ideas?
2. Coherence and Cohesion — logical organization, paragraphing, cohesive devices, referencing.
3. Lexical Resource — range, accuracy, and appropriacy of vocabulary; collocation; spelling.
4. Grammatical Range and Accuracy — sentence variety, grammar accuracy, punctuation.

Rules:
- Bands are 0–9 in 0.5 increments.
- Overall band is the average of the four criteria, rounded to the nearest 0.5.
- Be honest and specific — do NOT inflate scores. A typical first-attempt student writes at band 5.5–6.5.
- For annotations, startIndex/endIndex are 0-based character offsets into the essay text. They MUST point to the exact substring you are commenting on.
- For sentenceStructureTips: pick 3–5 grammar patterns the student is NOT using but should, given their current level. Each tip should have:
  * pattern: a named grammar structure (e.g. "Cleft sentence with 'It is...that'", "Conditional type 2 for hypothetical contrast", "Participle phrase as adjunct", "Inversion after negative adverbial").
  * example: a real sentence from the prompt context using this pattern.
  * whyItHelps: which IELTS criterion (Grammar Range, Cohesion, etc.) this lifts.
  * whereToUse: a concrete spot in this essay where the student could rewrite a flat sentence using this pattern.
  The goal is to TEACH grammar through actionable patterns, not just point out errors.
- Provide a model band-9 sample answer that closely matches the prompt.
- Keep "summary" to 2-3 sentences of actionable advice.
- All output MUST be valid JSON conforming to the response schema.`;

export async function gradeEssay(
  prompt: Pick<Prompt, "type" | "question" | "minWords">,
  essay: string,
): Promise<GradingResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as never,
      temperature: 0.3,
    },
  });

  const userPrompt = `Task type: ${prompt.type}
Minimum words: ${prompt.minWords}

PROMPT:
${prompt.question}

STUDENT ESSAY (word count: ${countWords(essay)}):
${essay}

Grade this essay now. Return JSON only.`;

  const result = await withGeminiRetry(() => model.generateContent(userPrompt));
  const text = result.response.text();
  const parsed = JSON.parse(text) as GradingResult;
  return parsed;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
