import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UserProfile } from "@ielts/shared";
import { db } from "../lib/firebase.js";

const SKILL_ENUM = [
  "writing",
  "reading",
  "listening",
  "speaking",
  "vocabulary",
  "grammar",
] as const;

const ProfileBody = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(80),
  module: z.enum(["academic", "general-training"]),
  currentBand: z.number().min(0).max(9),
  targetBand: z.number().min(4).max(9),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  dailyMinutes: z.number().int().min(15).max(240),
  weakAreas: z.array(z.enum(SKILL_ENUM)).min(1),
});

export async function registerProfileRoutes(app: FastifyInstance) {
  app.put("/profile", async (req, reply) => {
    const parsed = ProfileBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const profile: UserProfile = {
      ...parsed.data,
      onboardedAt: new Date().toISOString(),
    };
    try {
      await db().collection("profiles").doc(profile.userId).set(profile);
      return profile;
    } catch (err) {
      app.log.error({ err }, "profile_write_failed");
      const message = (err as Error).message ?? "Firestore write failed";
      return reply.code(502).send({
        error: "firestore_write_failed",
        message,
        hint:
          message.includes("DEADLINE_EXCEEDED") || message.includes("UNAVAILABLE")
            ? "Verify the Firestore database is provisioned in Native mode for the project and the service account has Cloud Datastore User role."
            : undefined,
      });
    }
  });

  app.get("/profile/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    try {
      const doc = await db().collection("profiles").doc(userId).get();
      if (!doc.exists) {
        return reply.code(404).send({ error: "not_found", message: "Profile not found" });
      }
      return doc.data() as UserProfile;
    } catch (err) {
      app.log.error({ err, userId }, "profile_read_failed");
      return reply.code(502).send({
        error: "firestore_read_failed",
        message: (err as Error).message ?? "Firestore read failed",
      });
    }
  });
}
