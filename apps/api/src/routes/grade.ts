import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Attempt, GradeResponse } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { countWords, gradeEssay } from "../lib/gemini.js";
import { findPromptById } from "./prompts.js";

const GradeBodySchema = z.object({
  promptId: z.string().min(1),
  essay: z.string().min(20, "Essay too short to grade"),
  timeSpentSeconds: z.number().int().nonnegative(),
  userId: z.string().min(1),
});

export async function registerGradeRoutes(app: FastifyInstance) {
  app.post("/grade", async (req, reply) => {
    const parse = GradeBodySchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid request body",
        details: parse.error.flatten(),
      });
    }

    const { promptId, essay, timeSpentSeconds, userId } = parse.data;
    const prompt = findPromptById(promptId);
    if (!prompt) {
      return reply
        .code(404)
        .send({ error: "prompt_not_found", message: `Unknown promptId: ${promptId}` });
    }

    const wordCount = countWords(essay);
    const attemptRef = db().collection("attempts").doc();
    const now = new Date().toISOString();

    const baseAttempt: Attempt = {
      id: attemptRef.id,
      userId,
      promptId,
      promptSnapshot: {
        type: prompt.type,
        title: prompt.title,
        question: prompt.question,
        minWords: prompt.minWords,
      },
      essay,
      wordCount,
      timeSpentSeconds,
      status: "grading",
      createdAt: now,
    };

    await attemptRef.set(baseAttempt);

    try {
      const result = await gradeEssay(prompt, essay);
      const graded: Attempt = {
        ...baseAttempt,
        status: "graded",
        result,
        gradedAt: new Date().toISOString(),
      };
      await attemptRef.set(graded);
      const response: GradeResponse = { attemptId: attemptRef.id, result };
      return response;
    } catch (err) {
      app.log.error({ err }, "grading_failed");
      await attemptRef.set({ ...baseAttempt, status: "failed" });
      return reply
        .code(502)
        .send({ error: "grading_failed", message: (err as Error).message });
    }
  });
}
