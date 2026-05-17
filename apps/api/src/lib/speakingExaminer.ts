import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { SpeakingScore, SpeakingTopic, SpeakingTurn } from "@ielts/shared";
import { withGeminiRetry } from "./gemini-retry.js";

const apiKey = process.env.GEMINI_API_KEY ?? "";
const client = new GoogleGenerativeAI(apiKey);

const criterionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    band: { type: SchemaType.NUMBER },
    feedback: { type: SchemaType.STRING },
  },
  required: ["band", "feedback"],
};

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    overallBand: { type: SchemaType.NUMBER },
    criteria: {
      type: SchemaType.OBJECT,
      properties: {
        fluencyCoherence: criterionSchema,
        lexicalResource: criterionSchema,
        grammaticalRangeAccuracy: criterionSchema,
        pronunciation: criterionSchema,
      },
      required: [
        "fluencyCoherence",
        "lexicalResource",
        "grammaticalRangeAccuracy",
        "pronunciation",
      ],
    },
    topTips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
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
    sampleAnswer: {
      type: SchemaType.OBJECT,
      properties: {
        questionIndex: { type: SchemaType.NUMBER },
        answer: { type: SchemaType.STRING },
      },
      required: ["questionIndex", "answer"],
    },
    summary: { type: SchemaType.STRING },
    disclaimer: { type: SchemaType.STRING },
  },
  required: [
    "overallBand",
    "criteria",
    "topTips",
    "vocabularyUpgrades",
    "sampleAnswer",
    "summary",
    "disclaimer",
  ],
};

const SYSTEM_PROMPT = `You are a certified IELTS Speaking examiner trained on the official IELTS public band descriptors.

You will receive a transcript of a Speaking test session (Part 1, 2, or 3). Score the candidate on the four official criteria:
1. Fluency & Coherence — hesitations, self-correction, logical flow, use of cohesive devices.
2. Lexical Resource — range and accuracy of vocabulary, paraphrasing, idiomatic use.
3. Grammatical Range & Accuracy — variety of structures, error frequency, complexity.
4. Pronunciation — based on transcript only you can estimate proxies (pacing implied by response length, sentence rhythm, hesitations). ALWAYS include a disclaimer that real pronunciation needs audio analysis.

Rules:
- Bands are 0–9 in 0.5 increments.
- Overall band = average of the four criteria, rounded to the nearest 0.5.
- Be honest. Typical first-attempt: 5.5–6.5. Don't inflate.
- Use response duration (seconds) as a proxy for fluency: long pauses → low fluency, very short responses → underdeveloped.
- "topTips": 3 SPECIFIC, actionable suggestions for THIS candidate, not generic advice.
- "vocabularyUpgrades": 2-4 places where a stronger word/phrase would have raised lexical resource — show the original phrase and a band-7+ replacement.
- "sampleAnswer": pick one weaker question (questionIndex) and provide a band-8+ model answer (~3-5 sentences for Part 1/3, longer monologue style for Part 2).
- "summary": 2-3 sentences of overall coaching feedback.
- "disclaimer": one sentence acknowledging pronunciation was estimated from transcript only.
- Output JSON only, matching schema.`;

function formatTranscript(turns: SpeakingTurn[]): string {
  return turns
    .map(
      (t) =>
        `Q${t.questionIndex + 1}: ${t.question}\nA${t.questionIndex + 1} (${t.durationSeconds}s): ${
          t.transcript.trim() || "[no response]"
        }`,
    )
    .join("\n\n");
}

export async function scoreSpeaking(
  topic: SpeakingTopic,
  turns: SpeakingTurn[],
): Promise<SpeakingScore> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as never,
      temperature: 0.3,
    },
  });

  const userPrompt = `IELTS Speaking ${topic.part.toUpperCase()} session — topic: "${topic.title}" (${
    topic.theme
  })

Transcript:
${formatTranscript(turns)}

Score this session now. Return JSON only.`;

  const res = await withGeminiRetry(() => model.generateContent(userPrompt));
  return JSON.parse(res.response.text()) as SpeakingScore;
}
