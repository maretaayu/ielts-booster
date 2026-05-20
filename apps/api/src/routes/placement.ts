import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { CEFR_TO_BAND, type CefrLevel, type PlacementResult } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { withGeminiRetry } from "../lib/gemini-retry.js";

const apiKey = process.env.GEMINI_API_KEY;
const client = new GoogleGenerativeAI(apiKey ?? "");
const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

const ScoreWritingBody = z.object({
  essay: z.string().min(20, "Essay too short to assess"),
  promptText: z.string().min(10),
  targetCefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
});

const writingScoreSchema = {
  type: SchemaType.OBJECT,
  properties: {
    cefr: { type: SchemaType.STRING, enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    summary: { type: SchemaType.STRING },
  },
  required: ["cefr", "summary"],
};

const PlacementBody = z.object({
  cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  estimatedBand: z.number().min(0).max(9),
  mcqCorrect: z.number().int().nonnegative(),
  mcqAsked: z.number().int().positive(),
  writingBand: z.number().min(0).max(9).optional(),
  skillBreakdown: z
    .record(
      z.enum(["grammar", "vocabulary", "reading"]),
      z.object({ correct: z.number().int(), asked: z.number().int() }),
    )
    .optional(),
});

export async function registerPlacementRoutes(app: FastifyInstance) {
  app.post("/placement/score-writing", async (req, reply) => {
    const parsed = ScoreWritingBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid body",
        details: parsed.error.flatten(),
      });
    }
    if (!apiKey) {
      return reply
        .code(503)
        .send({ error: "no_api_key", message: "GEMINI_API_KEY not configured" });
    }
    const { essay, promptText, targetCefr } = parsed.data;

    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: writingScoreSchema,
        temperature: 0.2,
      },
    });

    const systemInstruction =
      "You are a CEFR placement rater for short English writing samples (50-110 words). Read the sample written in response to the given prompt and assign a single CEFR level (A1, A2, B1, B2, C1, or C2) reflecting the writer's productive ability. Consider grammar range and accuracy, vocabulary range, coherence, and task fit. Be calibrated — do not inflate. Return JSON only.";

    const userPrompt = [
      `PROMPT GIVEN TO WRITER:\n${promptText}`,
      `WRITER'S RESPONSE:\n${essay}`,
      `TARGET LEVEL OF THE PROMPT: ${targetCefr}`,
      "Output JSON with `cefr` (one of A1-C2) and `summary` (one short sentence explaining the level).",
    ].join("\n\n");

    try {
      const result = await withGeminiRetry(() =>
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
        }),
      );
      const text = result.response.text();
      const parsedOut = JSON.parse(text) as { cefr: CefrLevel; summary: string };
      const estimatedBand = CEFR_TO_BAND[parsedOut.cefr];
      return { cefr: parsedOut.cefr, estimatedBand, summary: parsedOut.summary };
    } catch (err) {
      app.log.error({ err }, "placement_writing_score_failed");
      return reply
        .code(502)
        .send({ error: "scoring_failed", message: (err as Error).message });
    }
  });

  app.patch("/profile/:userId/placement", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const parsed = PlacementBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid body",
        details: parsed.error.flatten(),
      });
    }
    const placement: PlacementResult = {
      ...parsed.data,
      takenAt: new Date().toISOString(),
    };
    try {
      const docRef = db().collection("profiles").doc(userId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return reply
          .code(404)
          .send({ error: "not_found", message: "Profile not found — complete onboarding first" });
      }
      await docRef.update({ placement });
      return { ok: true, placement };
    } catch (err) {
      app.log.error({ err, userId }, "placement_save_failed");
      return reply
        .code(502)
        .send({ error: "firestore_write_failed", message: (err as Error).message });
    }
  });
}
