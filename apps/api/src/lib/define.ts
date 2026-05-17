import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { WordDefinition } from "@ielts/shared";
import { withGeminiRetry } from "./gemini-retry.js";

const apiKey = process.env.GEMINI_API_KEY;
const client = new GoogleGenerativeAI(apiKey ?? "");

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    word: { type: SchemaType.STRING },
    partOfSpeech: { type: SchemaType.STRING },
    meaning: { type: SchemaType.STRING },
    indonesian: { type: SchemaType.STRING },
    indonesianExample: { type: SchemaType.STRING },
    synonyms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    exampleSentence: { type: SchemaType.STRING },
    contextualNote: { type: SchemaType.STRING },
  },
  required: ["word", "partOfSpeech", "meaning", "indonesian", "synonyms", "exampleSentence"],
};

const SYSTEM_PROMPT = `You are a friendly IELTS vocabulary coach for Indonesian-speaking learners preparing for IELTS. Given a word and the sentence it appeared in, return a concise definition tailored to that sense of the word.

Guidelines:
- "meaning": plain-English definition, one sentence, written for a B2/C1 learner. Avoid circular definitions.
- "indonesian": Indonesian translation(s) of the word in THIS sense. 1-3 short equivalents separated by " / " (e.g. "menyemprotkan / menyemburkan"). Use natural Bahasa Indonesia, not literal calques.
- "partOfSpeech": noun / verb / adjective / adverb / phrase (lowercase).
- "synonyms": 3-5 IELTS-grade English synonyms suitable to swap in. Prefer band-7+ vocabulary.
- "exampleSentence": a NEW English sentence (not the original context) that uses the word naturally, ideally in an IELTS-friendly register.
- "indonesianExample": natural Indonesian translation of the example sentence above (not word-for-word — translate the meaning).
- "contextualNote": OPTIONAL — only include if the word has multiple senses and you want to highlight the specific sense used in this context. Write it in Indonesian so it's instantly useful.
- Output JSON only, matching the schema.`;

export async function defineWord(
  word: string,
  context?: string,
): Promise<WordDefinition> {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as never,
      temperature: 0.2,
    },
  });

  const userPrompt = context
    ? `Word: "${word}"\nContext sentence: "${context}"\n\nDefine the word as used in this context. Return JSON only.`
    : `Word: "${word}"\n\nDefine the word for an IELTS learner. Return JSON only.`;

  const result = await withGeminiRetry(() => model.generateContent(userPrompt));
  const text = result.response.text();
  return JSON.parse(text) as WordDefinition;
}
