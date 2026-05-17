import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ScoreSpeakingRequest, SpeakingSession, SpeakingTopic } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import { scoreSpeaking } from "../lib/speakingExaminer.js";

const SEED_TOPICS: SpeakingTopic[] = [
  // ===== PART 1 (4-5 short questions, ~4 min) =====
  {
    id: "p1-work-study",
    part: "part1",
    title: "Work & Study",
    theme: "Work and study",
    difficulty: "easy",
    estimatedMinutes: 4,
    tags: ["work", "study", "everyday"],
    questions: [
      "Do you work or are you a student?",
      "What do you enjoy most about your job or studies?",
      "Is there anything you would like to change about your work or studies?",
      "Do you think your job or your studies will be useful in the future?",
      "How do you usually spend your free time after work or class?",
    ],
  },
  {
    id: "p1-hometown",
    part: "part1",
    title: "Your Hometown",
    theme: "Hometown",
    difficulty: "easy",
    estimatedMinutes: 4,
    tags: ["hometown", "place", "personal"],
    questions: [
      "Where is your hometown?",
      "What do you like most about your hometown?",
      "Is there anything you don't like about it?",
      "Do you think your hometown is a good place for young people to live? Why?",
      "Has your hometown changed much since you were a child?",
    ],
  },
  {
    id: "p1-technology",
    part: "part1",
    title: "Technology in Daily Life",
    theme: "Technology",
    difficulty: "medium",
    estimatedMinutes: 4,
    tags: ["technology", "daily-life"],
    questions: [
      "How often do you use a smartphone in a typical day?",
      "Which app or device do you find most useful, and why?",
      "Do you think people rely on technology too much these days?",
      "How has technology changed the way you communicate with friends and family?",
    ],
  },
  {
    id: "p1-food",
    part: "part1",
    title: "Food & Cooking",
    theme: "Food",
    difficulty: "easy",
    estimatedMinutes: 4,
    tags: ["food", "cooking", "everyday"],
    questions: [
      "What kind of food do you usually eat?",
      "Do you enjoy cooking? Why or why not?",
      "Do you prefer eating at home or in restaurants?",
      "Has your taste in food changed compared to when you were younger?",
    ],
  },

  // ===== PART 2 (cue card, 1 min prep + 2 min talk) =====
  {
    id: "p2-memorable-trip",
    part: "part2",
    title: "Describe a memorable trip",
    theme: "Travel",
    difficulty: "medium",
    estimatedMinutes: 4,
    tags: ["travel", "experience"],
    questions: ["Describe a memorable trip you have taken."],
    cueCardBullets: [
      "where you went",
      "who you went with",
      "what you did there",
      "and explain why it was memorable",
    ],
    linkedPart3: "p3-travel",
  },
  {
    id: "p2-skill-learned",
    part: "part2",
    title: "Describe a skill you would like to learn",
    theme: "Personal goals",
    difficulty: "medium",
    estimatedMinutes: 4,
    tags: ["skills", "future"],
    questions: ["Describe a skill you would like to learn."],
    cueCardBullets: [
      "what the skill is",
      "why you want to learn it",
      "how you plan to learn it",
      "and explain how this skill would improve your life",
    ],
    linkedPart3: "p3-learning",
  },
  {
    id: "p2-helpful-person",
    part: "part2",
    title: "Describe a person who has helped you",
    theme: "People",
    difficulty: "medium",
    estimatedMinutes: 4,
    tags: ["people", "relationships"],
    questions: ["Describe a person who has helped you in your life."],
    cueCardBullets: [
      "who this person is",
      "how you know them",
      "what they helped you with",
      "and explain how their help affected your life",
    ],
  },
  {
    id: "p2-favourite-book",
    part: "part2",
    title: "Describe a book that influenced you",
    theme: "Books and media",
    difficulty: "hard",
    estimatedMinutes: 4,
    tags: ["books", "ideas"],
    questions: ["Describe a book that has influenced the way you think."],
    cueCardBullets: [
      "what the book is",
      "when you read it",
      "what it is about",
      "and explain how it changed your thinking",
    ],
  },

  // ===== PART 3 (deeper discussion, ~4-5 min) =====
  {
    id: "p3-travel",
    part: "part3",
    title: "Travel & Tourism",
    theme: "Travel",
    difficulty: "hard",
    estimatedMinutes: 5,
    tags: ["travel", "society", "globalization"],
    questions: [
      "Why do you think people enjoy travelling abroad?",
      "Do you think tourism has more positive or negative effects on local communities?",
      "How might the way people travel change in the next twenty years?",
      "Some say cheap international travel should be limited to protect the environment. What do you think?",
    ],
  },
  {
    id: "p3-learning",
    part: "part3",
    title: "Lifelong Learning",
    theme: "Education",
    difficulty: "hard",
    estimatedMinutes: 5,
    tags: ["education", "career"],
    questions: [
      "Why is it important for adults to keep learning new skills?",
      "Do you think online learning is as effective as traditional classroom learning?",
      "What kinds of skills will be most valuable in the future job market?",
      "Should governments do more to support adult learners? Why or why not?",
    ],
  },
  {
    id: "p3-technology-society",
    part: "part3",
    title: "Technology & Society",
    theme: "Technology",
    difficulty: "hard",
    estimatedMinutes: 5,
    tags: ["technology", "society", "ai"],
    questions: [
      "What are the biggest ways technology has changed how we live in the past decade?",
      "Are there any negative effects of relying too much on technology?",
      "How might artificial intelligence change the workplace in the future?",
      "Do you think governments should regulate new technologies more strictly?",
    ],
  },
];

export function findSpeakingTopic(id: string): SpeakingTopic | undefined {
  return SEED_TOPICS.find((t) => t.id === id);
}

const ScoreBody = z.object({
  userId: z.string().min(1),
  topicId: z.string().min(1),
  totalSeconds: z.number().int().nonnegative(),
  turns: z
    .array(
      z.object({
        questionIndex: z.number().int().nonnegative(),
        question: z.string().min(1),
        transcript: z.string().default(""),
        durationSeconds: z.number().int().nonnegative(),
      }),
    )
    .min(1),
});

export async function registerSpeakingRoutes(app: FastifyInstance) {
  app.get("/speaking/topics", async () => ({
    topics: SEED_TOPICS,
  }));

  app.get("/speaking/topics/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const found = findSpeakingTopic(id);
    if (!found) {
      return reply.code(404).send({ error: "not_found", message: "Topic not found" });
    }
    return found;
  });

  app.post("/speaking/score", async (req, reply) => {
    const parsed = ScoreBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const body = parsed.data as ScoreSpeakingRequest;
    const topic = findSpeakingTopic(body.topicId);
    if (!topic) {
      return reply.code(404).send({ error: "topic_not_found", message: body.topicId });
    }

    const ref = db().collection("speakingSessions").doc();
    const base: SpeakingSession = {
      id: ref.id,
      userId: body.userId,
      topicId: body.topicId,
      topicSnapshot: { title: topic.title, part: topic.part, theme: topic.theme },
      turns: body.turns,
      totalSeconds: body.totalSeconds,
      status: "scoring",
      createdAt: new Date().toISOString(),
    };
    await ref.set(base);

    try {
      const score = await scoreSpeaking(topic, body.turns);
      const scored: SpeakingSession = {
        ...base,
        status: "scored",
        score,
        scoredAt: new Date().toISOString(),
      };
      await ref.set(scored);
      return scored;
    } catch (err) {
      app.log.error({ err }, "speaking_score_failed");
      await ref.set({ ...base, status: "failed" });
      return reply
        .code(502)
        .send({ error: "score_failed", message: (err as Error).message });
    }
  });

  app.get("/speaking/sessions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await db().collection("speakingSessions").doc(id).get();
    if (!doc.exists) {
      return reply.code(404).send({ error: "not_found", message: "Session not found" });
    }
    return doc.data() as SpeakingSession;
  });

  app.get("/speaking/sessions", async (req, reply) => {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    try {
      const snap = await db()
        .collection("speakingSessions")
        .where("userId", "==", userId)
        .get();
      const sessions = snap.docs
        .map((d) => d.data() as SpeakingSession)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { sessions };
    } catch (err) {
      app.log.error({ err, userId }, "speaking_sessions_list_failed");
      return reply.code(502).send({
        error: "firestore_read_failed",
        message: (err as Error).message,
      });
    }
  });
}
