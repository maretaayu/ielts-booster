import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { StudyPlan } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { generateStudyPlan } from "../lib/studyPlan.js";

const SKILL_ENUM = ["writing", "reading", "listening", "speaking", "vocabulary", "grammar"] as const;

const CreateBody = z.object({
  userId: z.string().min(1),
  targetBand: z.number().min(4).max(9),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "examDate must be YYYY-MM-DD"),
  currentBand: z.number().min(0).max(9).optional(),
  weakAreas: z.array(z.enum(SKILL_ENUM)),
  dailyMinutes: z.number().int().min(15).max(240),
});

export async function registerStudyPlanRoutes(app: FastifyInstance) {
  app.post("/study-plan", async (req, reply) => {
    const parsed = CreateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const generated = await generateStudyPlan(parsed.data);
      const planRef = db().collection("studyPlans").doc();
      const plan: StudyPlan = {
        id: planRef.id,
        userId: parsed.data.userId,
        targetBand: parsed.data.targetBand,
        examDate: parsed.data.examDate,
        currentBand: parsed.data.currentBand,
        weakAreas: parsed.data.weakAreas,
        dailyMinutes: parsed.data.dailyMinutes,
        days: generated.days,
        weeklyMilestones: generated.weeklyMilestones,
        overallStrategy: generated.overallStrategy,
        createdAt: new Date().toISOString(),
      };
      await planRef.set(plan);
      return plan;
    } catch (err) {
      app.log.error({ err }, "study_plan_failed");
      return reply.code(502).send({
        error: "plan_generation_failed",
        message: (err as Error).message,
      });
    }
  });

  app.get("/study-plan/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await db().collection("studyPlans").doc(id).get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Plan not found" });
    }
    return doc.data() as StudyPlan;
  });

  app.get("/study-plans", async (req, reply) => {
    const { userId, limit = "20" } = req.query as { userId?: string; limit?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    const snap = await db()
      .collection("studyPlans")
      .where("userId", "==", userId)
      .limit(Number(limit) * 3)
      .get();
    const plans = snap.docs
      .map((d) => d.data() as StudyPlan)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Number(limit));
    return { plans };
  });
}
