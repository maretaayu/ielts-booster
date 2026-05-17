import type { FastifyInstance } from "fastify";
import type { Attempt } from "@ielts/shared";
import { db } from "../lib/firebase.js";

export async function registerAttemptRoutes(app: FastifyInstance) {
  app.get("/attempts", async (req, reply) => {
    const { userId, limit = "20" } = req.query as { userId?: string; limit?: string };
    if (!userId) {
      return reply
        .code(400)
        .send({ error: "missing_userId", message: "userId query param required" });
    }
    const snap = await db()
      .collection("attempts")
      .where("userId", "==", userId)
      .limit(Number(limit) * 3)
      .get();

    const attempts = snap.docs
      .map((d) => d.data() as Attempt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Number(limit));
    return { attempts };
  });

  app.get("/attempts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await db().collection("attempts").doc(id).get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Attempt not found" });
    }
    return doc.data() as Attempt;
  });
}
