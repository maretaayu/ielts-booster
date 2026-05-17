import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { VocabEntry } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { defineWord } from "../lib/define.js";

const DefineBody = z.object({
  word: z.string().min(1).max(60),
  context: z.string().max(800).optional(),
  userId: z.string().min(1),
  passageId: z.string().optional(),
  save: z.boolean().optional().default(true),
});

function normalise(w: string) {
  return w.trim().toLowerCase().replace(/[^a-z'-]/g, "");
}

function vocabDocId(userId: string, word: string): string {
  // Deterministic id so concurrent saves can never create duplicates.
  // Firestore doc IDs can't contain "/", and userId may include it.
  return `${userId.replace(/\//g, "_")}__${word}`;
}

export async function registerDefineRoutes(app: FastifyInstance) {
  app.post("/define", async (req, reply) => {
    const parsed = DefineBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const { word, context, userId, passageId, save } = parsed.data;
    const cleaned = normalise(word);
    if (!cleaned) {
      return reply.code(400).send({ error: "empty_word", message: "Word is empty after normalisation" });
    }

    try {
      const definition = await defineWord(cleaned, context);

      let entry: VocabEntry | null = null;
      if (save) {
        // Deterministic doc id → concurrent saves of the same word merge
        // into ONE document instead of racing to create two.
        const ref = db().collection("vocab").doc(vocabDocId(userId, cleaned));
        const snap = await ref.get();
        const createdAt = snap.exists
          ? (snap.data() as VocabEntry).createdAt
          : new Date().toISOString();

        entry = {
          id: ref.id,
          userId,
          word: cleaned,
          definition,
          passageId,
          context,
          createdAt,
        };
        await ref.set(entry);
      }

      return { definition, entry };
    } catch (err) {
      app.log.error({ err }, "define_failed");
      return reply.code(502).send({
        error: "define_failed",
        message: (err as Error).message,
      });
    }
  });
}
