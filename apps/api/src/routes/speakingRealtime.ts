import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type {
  SpeakingScore,
  SpeakingSession,
  SpeakingTurn,
} from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { scoreSpeaking } from "../lib/speakingExaminer.js";
import { findSpeakingTopic } from "./speaking.js";

const PART_LABEL: Record<string, string> = {
  part1: "Part 1 (Interview)",
  part2: "Part 2 (Cue Card monologue)",
  part3: "Part 3 (Discussion)",
};

export async function registerSpeakingRealtimeRoutes(app: FastifyInstance) {
  /**
   * Returns a signed websocket URL for a private ElevenLabs agent plus the
   * topic-specific dynamic variables the agent should weave into its prompt.
   */
  app.post("/speaking/conversation/init", async (req, reply) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey || !agentId) {
      return reply.code(503).send({
        error: "elevenlabs_not_configured",
        message:
          "Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in apps/api/.env (see README for agent setup).",
      });
    }

    const parsed = z
      .object({ topicId: z.string().min(1) })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid body",
        details: parsed.error.flatten(),
      });
    }
    const topic = findSpeakingTopic(parsed.data.topicId);
    if (!topic) {
      return reply
        .code(404)
        .send({ error: "topic_not_found", message: parsed.data.topicId });
    }

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(
        agentId,
      )}`,
      { headers: { "xi-api-key": apiKey } },
    );

    if (!upstream.ok) {
      const err = await upstream.text();
      app.log.warn({ status: upstream.status, err }, "convai_signed_url_failed");
      return reply.code(502).send({
        error: "convai_signed_url_failed",
        message: `ElevenLabs ${upstream.status}: ${err.slice(0, 240)}`,
      });
    }
    const data = (await upstream.json()) as { signed_url: string };

    // Build the dynamic-variable payload the agent's system prompt will weave in.
    const questionsList = topic.questions
      .map((q, i) => `${i + 1}. ${q}`)
      .join("\n");
    const cueCard =
      topic.part === "part2" && topic.cueCardBullets
        ? `\n\nYou should say:\n${topic.cueCardBullets.map((b) => `- ${b}`).join("\n")}`
        : "";

    return {
      signedUrl: data.signed_url,
      dynamicVariables: {
        topic_part: PART_LABEL[topic.part] ?? topic.part,
        topic_title: topic.title,
        topic_theme: topic.theme,
        questions_list: questionsList + cueCard,
        max_questions: topic.questions.length,
      },
      topic: {
        id: topic.id,
        title: topic.title,
        part: topic.part,
        theme: topic.theme,
        cueCardBullets: topic.cueCardBullets ?? null,
      },
    };
  });

  /**
   * Receives the realtime conversation transcript (turns the SDK captured),
   * scores via Gemini, persists the SpeakingSession, returns the scored doc.
   */
  app.post("/speaking/score-realtime", async (req, reply) => {
    const parsed = z
      .object({
        userId: z.string().min(1),
        topicId: z.string().min(1),
        totalSeconds: z.number().int().nonnegative(),
        messages: z
          .array(
            z.object({
              source: z.enum(["user", "ai"]),
              text: z.string(),
              elapsedSeconds: z.number().int().nonnegative().optional(),
            }),
          )
          .min(1),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "validation_error",
        message: "Invalid body",
        details: parsed.error.flatten(),
      });
    }
    const { userId, topicId, totalSeconds, messages } = parsed.data;
    const topic = findSpeakingTopic(topicId);
    if (!topic) {
      return reply
        .code(404)
        .send({ error: "topic_not_found", message: topicId });
    }

    // Convert conversation flow → SpeakingTurn[] (one per AI question + user reply).
    const turns: SpeakingTurn[] = [];
    let pendingQuestion: { text: string; ts: number } | null = null;
    let turnIndex = 0;
    for (const m of messages) {
      const ts = m.elapsedSeconds ?? 0;
      if (m.source === "ai") {
        // If two AI messages back-to-back, keep the most recent as the prompt.
        pendingQuestion = { text: m.text.trim(), ts };
      } else if (m.source === "user") {
        const q = pendingQuestion?.text || "(opening)";
        const start = pendingQuestion?.ts ?? 0;
        turns.push({
          questionIndex: turnIndex++,
          question: q,
          transcript: m.text.trim(),
          durationSeconds: Math.max(1, ts - start),
        });
        pendingQuestion = null;
      }
    }

    if (turns.length === 0) {
      return reply.code(400).send({
        error: "no_user_turns",
        message: "Conversation had no user responses to score.",
      });
    }

    const ref = db().collection("speakingSessions").doc();
    const base: SpeakingSession = {
      id: ref.id,
      userId,
      topicId,
      topicSnapshot: { title: topic.title, part: topic.part, theme: topic.theme },
      turns,
      totalSeconds,
      status: "scoring",
      createdAt: new Date().toISOString(),
    };
    await ref.set(base);

    try {
      const score: SpeakingScore = await scoreSpeaking(topic, turns);
      const scored: SpeakingSession = {
        ...base,
        status: "scored",
        score,
        scoredAt: new Date().toISOString(),
      };
      await ref.set(scored);
      return scored;
    } catch (err) {
      app.log.error({ err }, "realtime_score_failed");
      await ref.set({ ...base, status: "failed" });
      return reply
        .code(502)
        .send({ error: "score_failed", message: (err as Error).message });
    }
  });
}
