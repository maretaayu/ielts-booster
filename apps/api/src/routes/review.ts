import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { VocabEntry } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { applyRating, isDue, readState, todayLocal } from "../lib/sm2.js";

const ReviewBody = z.object({
  userId: z.string().min(1),
  rating: z.enum(["again", "hard", "good", "easy"]),
});

export async function registerReviewRoutes(app: FastifyInstance) {
  // Cards that are due today (or earlier).
  app.get("/vocab/due", async (req, reply) => {
    const { userId, limit = "50" } = req.query as { userId?: string; limit?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    const snap = await db()
      .collection("vocab")
      .where("userId", "==", userId)
      .limit(500)
      .get();
    const all = snap.docs.map((d) => d.data() as VocabEntry);
    const today = todayLocal();
    const due = all
      .filter((e) => isDue(e, today))
      // new cards first, then ones overdue the longest
      .sort((a, b) => (a.dueAt ?? today).localeCompare(b.dueAt ?? today))
      .slice(0, Number(limit));
    return {
      due,
      counts: {
        new: all.filter((e) => (e.reps ?? 0) === 0 && isDue(e, today)).length,
        dueToday: due.length,
        total: all.length,
      },
    };
  });

  app.post("/vocab/:id/review", async (req, reply) => {
    const parsed = ReviewBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const { id } = req.params as { id: string };
    const { userId, rating } = parsed.data;

    const ref = db().collection("vocab").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Vocab entry not found" });
    }
    const entry = doc.data() as VocabEntry;
    if (entry.userId !== userId) {
      return reply.code(403).send({ error: "forbidden", message: "Not your vocab entry" });
    }

    const next = applyRating(readState(entry), rating);
    const updated: VocabEntry = { ...entry, ...next };
    await ref.set(updated);
    return updated;
  });
}
