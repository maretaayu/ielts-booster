import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  IeltsBand,
  MockSectionId,
  MockSectionState,
  MockTestSession,
} from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { findPassageById } from "./passages.js";
import { findPromptById } from "./prompts.js";
import { findSpeakingTopic } from "./speaking.js";
import { findListeningTestById } from "./listening.js";

const SECTION_IDS: MockSectionId[] = ["listening", "reading", "writing", "speaking"];

const StartBody = z.object({
  userId: z.string().min(1),
  listeningTestId: z.string().optional(),
  readingPassageId: z.string().optional(),
  writingPromptId: z.string().optional(),
  speakingTopicId: z.string().optional(),
});

const UpdateBody = z.object({
  userId: z.string().min(1),
  section: z.enum(["listening", "reading", "writing", "speaking"]),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]),
  listeningAttemptId: z.string().optional(),
  readingAttemptId: z.string().optional(),
  writingAttemptId: z.string().optional(),
  speakingSessionId: z.string().optional(),
  band: z.number().min(0).max(9).optional(),
  rawScore: z.number().int().nonnegative().optional(),
  rawTotal: z.number().int().positive().optional(),
});

/** Round to the nearest 0.5 — per official IELTS overall-band rule. */
function roundToHalf(n: number): IeltsBand {
  const rounded = Math.round(n * 2) / 2;
  return Math.max(0, Math.min(9, rounded)) as IeltsBand;
}

function emptySection(): MockSectionState {
  return { status: "pending" };
}

function computeOverallBand(sections: Record<MockSectionId, MockSectionState>): IeltsBand | undefined {
  const bands = SECTION_IDS.map((id) => sections[id].band).filter(
    (b): b is IeltsBand => typeof b === "number",
  );
  if (bands.length < 4) return undefined;
  const sum = bands.reduce<number>((s, b) => s + b, 0);
  return roundToHalf(sum / 4);
}

export async function registerMockTestRoutes(app: FastifyInstance) {
  app.post("/mock-test", async (req, reply) => {
    const parsed = StartBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const body = parsed.data;

    // Defaults — first seed of each module if the client doesn't pick.
    const listeningTestId = body.listeningTestId ?? "lt-coastline-walks";
    const readingPassageId = body.readingPassageId ?? "r-octopus-cognition";
    const writingPromptId = body.writingPromptId ?? "t2-tech-education";
    const speakingTopicId = body.speakingTopicId ?? "p1-work-study";

    // Validate every reference resolves so the orchestrator can't run with broken ids.
    if (!findListeningTestById(listeningTestId)) {
      return reply.code(404).send({ error: "listening_not_found", message: listeningTestId });
    }
    if (!findPassageById(readingPassageId)) {
      return reply.code(404).send({ error: "reading_not_found", message: readingPassageId });
    }
    if (!findPromptById(writingPromptId)) {
      return reply.code(404).send({ error: "writing_not_found", message: writingPromptId });
    }
    if (!findSpeakingTopic(speakingTopicId)) {
      return reply.code(404).send({ error: "speaking_not_found", message: speakingTopicId });
    }

    const ref = db().collection("mockTests").doc();
    const session: MockTestSession = {
      id: ref.id,
      userId: body.userId,
      status: "in_progress",
      listeningTestId,
      readingPassageId,
      writingPromptId,
      speakingTopicId,
      sections: {
        listening: emptySection(),
        reading: emptySection(),
        writing: emptySection(),
        speaking: emptySection(),
      },
      createdAt: new Date().toISOString(),
    };
    await ref.set(session);
    return session;
  });

  app.get("/mock-test/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await db().collection("mockTests").doc(id).get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Mock test not found" });
    }
    return doc.data() as MockTestSession;
  });

  app.patch("/mock-test/:id/section", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = UpdateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const body = parsed.data;

    const ref = db().collection("mockTests").doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Mock test not found" });
    }
    const session = doc.data() as MockTestSession;
    if (session.userId !== body.userId) {
      return reply.code(403).send({ error: "forbidden", message: "Not your session" });
    }

    const prev = session.sections[body.section];
    const next: MockSectionState = { ...prev, status: body.status };
    if (body.band != null) next.band = body.band as IeltsBand;
    if (body.rawScore != null) next.rawScore = body.rawScore;
    if (body.rawTotal != null) next.rawTotal = body.rawTotal;
    // Only attach the attempt id that's relevant to this section.
    if (body.section === "listening" && body.listeningAttemptId)
      next.listeningAttemptId = body.listeningAttemptId;
    if (body.section === "reading" && body.readingAttemptId)
      next.readingAttemptId = body.readingAttemptId;
    if (body.section === "writing" && body.writingAttemptId)
      next.writingAttemptId = body.writingAttemptId;
    if (body.section === "speaking" && body.speakingSessionId)
      next.speakingSessionId = body.speakingSessionId;
    if (body.status === "in_progress" && !prev.startedAt) {
      next.startedAt = new Date().toISOString();
    }
    if (body.status === "completed" || body.status === "skipped") {
      next.completedAt = new Date().toISOString();
    }

    const sections = { ...session.sections, [body.section]: next } as Record<
      MockSectionId,
      MockSectionState
    >;
    const overallBand = computeOverallBand(sections);
    const allDone = SECTION_IDS.every(
      (s) => sections[s].status === "completed" || sections[s].status === "skipped",
    );

    const updated: MockTestSession = {
      ...session,
      sections,
      overallBand,
      status: allDone ? "completed" : session.status,
      completedAt: allDone ? session.completedAt ?? new Date().toISOString() : session.completedAt,
    };
    await ref.set(updated);
    return updated;
  });

  app.get("/mock-tests", async (req, reply) => {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    try {
      const snap = await db().collection("mockTests").where("userId", "==", userId).get();
      const sessions = snap.docs
        .map((d) => d.data() as MockTestSession)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { sessions };
    } catch (err) {
      app.log.error({ err, userId }, "mock_tests_list_failed");
      return reply.code(502).send({
        error: "firestore_read_failed",
        message: (err as Error).message,
      });
    }
  });
}
