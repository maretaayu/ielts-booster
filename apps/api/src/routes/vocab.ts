import type { FastifyInstance } from "fastify";
import type { VocabEntry } from "@ielts/shared";
import { db } from "../lib/firebase.js";

export async function registerVocabRoutes(app: FastifyInstance) {
  app.get("/vocab", async (req, reply) => {
    const { userId, limit = "100" } = req.query as { userId?: string; limit?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId is required" });
    }
    const snap = await db()
      .collection("vocab")
      .where("userId", "==", userId)
      .limit(Number(limit) * 4)
      .get();

    // Dedupe legacy duplicates (from before deterministic ids) — keep newest per word.
    const byWord = new Map<string, VocabEntry>();
    const stale: typeof snap.docs = [];
    for (const doc of snap.docs) {
      const data = doc.data() as VocabEntry;
      const existing = byWord.get(data.word);
      if (!existing || data.createdAt > existing.createdAt) {
        if (existing) {
          // Mark the older one for deletion (find the original doc).
          const olderDoc = snap.docs.find(
            (d) => (d.data() as VocabEntry).word === data.word && d.id !== doc.id,
          );
          if (olderDoc) stale.push(olderDoc);
        }
        byWord.set(data.word, data);
      } else {
        stale.push(doc);
      }
    }

    // Clean up duplicates in the background so future reads are simpler.
    if (stale.length > 0) {
      const batch = db().batch();
      for (const doc of stale) batch.delete(doc.ref);
      batch.commit().catch((err) => app.log.warn({ err }, "vocab_dedupe_cleanup_failed"));
    }

    const entries = [...byWord.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Number(limit));
    return { entries };
  });

  app.delete("/vocab/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId is required" });
    }
    const ref = db().collection("vocab").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Vocab entry not found" });
    }
    const data = doc.data() as VocabEntry;
    if (data.userId !== userId) {
      return reply.code(403).send({ error: "forbidden", message: "Not your vocab entry" });
    }
    await ref.delete();
    return { ok: true };
  });
}
