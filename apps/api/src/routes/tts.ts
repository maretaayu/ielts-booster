import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHash } from "node:crypto";
import { ttsGet, ttsSet } from "../lib/tts-cache.js";

const SpeakBody = z.object({
  text: z.string().min(1).max(2000),
  voiceId: z.string().min(1).optional(),
});

// A curated list — keep stable IDs so frontend can refer to them. These are
// the standard ElevenLabs library voices and don't expire.
export const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", accent: "American", gender: "female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", accent: "American", gender: "female" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", accent: "British", gender: "female" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", accent: "American", gender: "male" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", accent: "British", gender: "male" },
];

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah — calm, examiner-like
const MODEL_ID = "eleven_turbo_v2_5";

function cacheKey(text: string, voiceId: string): string {
  return `${voiceId}::${createHash("sha1").update(text).digest("hex")}`;
}

export async function registerTtsRoutes(app: FastifyInstance) {
  app.get("/tts/voices", async (req, reply) => {
    const configured = Boolean(process.env.ELEVENLABS_API_KEY);
    if (!configured) {
      return reply.code(200).send({ configured: false, voices: [], defaultVoiceId: null });
    }
    return { configured: true, voices: ELEVENLABS_VOICES, defaultVoiceId: DEFAULT_VOICE };
  });

  app.post("/tts/speak", async (req, reply) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return reply.code(503).send({
        error: "elevenlabs_not_configured",
        message: "Set ELEVENLABS_API_KEY in apps/api/.env",
      });
    }
    const parsed = SpeakBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const text = parsed.data.text;
    const voiceId = parsed.data.voiceId ?? DEFAULT_VOICE;
    const key = cacheKey(text, voiceId);

    const cached = ttsGet(key);
    if (cached) {
      return reply
        .header("content-type", "audio/mpeg")
        .header("cache-control", "public, max-age=86400")
        .header("x-tts-cache", "hit")
        .send(cached);
    }

    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15 },
        }),
      },
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      app.log.warn({ status: upstream.status, errText }, "elevenlabs_failed");
      return reply.code(502).send({
        error: "elevenlabs_failed",
        message: `ElevenLabs ${upstream.status}: ${errText.slice(0, 200)}`,
      });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    ttsSet(key, buf);
    return reply
      .header("content-type", "audio/mpeg")
      .header("cache-control", "public, max-age=86400")
      .header("x-tts-cache", "miss")
      .send(buf);
  });
}
