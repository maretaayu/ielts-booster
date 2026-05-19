import "dotenv/config";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { registerGradeRoutes } from "./routes/grade.js";
import { registerPromptRoutes } from "./routes/prompts.js";
import { registerAttemptRoutes } from "./routes/attempts.js";
import { registerStudyPlanRoutes } from "./routes/studyPlan.js";
import { registerPassageRoutes } from "./routes/passages.js";
import { registerDefineRoutes } from "./routes/define.js";
import { registerVocabRoutes } from "./routes/vocab.js";
import { registerCalendarRoutes } from "./routes/calendar.js";
import { registerProfileRoutes } from "./routes/profile.js";
import { registerReviewRoutes } from "./routes/review.js";
import { registerSpeakingRoutes } from "./routes/speaking.js";
import { registerSpeakingRealtimeRoutes } from "./routes/speakingRealtime.js";
import { registerTtsRoutes } from "./routes/tts.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true } },
    },
  });

  await app.register(cors, {
    origin: process.env.NODE_ENV === "production"
      ? process.env.WEB_ORIGIN?.split(",")
      : true,
  });

  app.get("/health", async () => ({ status: "ok", ts: new Date().toISOString() }));

  await registerPromptRoutes(app);
  await registerGradeRoutes(app);
  await registerAttemptRoutes(app);
  await registerStudyPlanRoutes(app);
  await registerPassageRoutes(app);
  await registerDefineRoutes(app);
  await registerVocabRoutes(app);
  await registerCalendarRoutes(app);
  await registerProfileRoutes(app);
  await registerReviewRoutes(app);
  await registerSpeakingRoutes(app);
  await registerSpeakingRealtimeRoutes(app);
  await registerTtsRoutes(app);

  return app;
}
