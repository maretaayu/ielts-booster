import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { CalendarConnection, CalendarSyncResult, StudyPlan } from "@ielts/shared";
import { db } from "../lib/firebase.js";
import {
  buildConsentUrl,
  calendar,
  clientFromRefreshToken,
  exchangeCode,
  googleConfigured,
} from "../lib/google.js";

const WEB_ORIGIN_DEFAULT = "http://localhost:3000";

// Firestore doc layout:
//   calendarTokens/{userId} → { refreshToken, email, connectedAt }
//   calendarConnections/{userId} → public info (no token)

interface StoredToken {
  userId: string;
  refreshToken: string;
  email?: string;
  connectedAt: string;
}

function pickWebOrigin(): string {
  return process.env.WEB_ORIGIN?.split(",")[0] ?? WEB_ORIGIN_DEFAULT;
}

function encodeState(payload: {
  userId: string;
  returnTo?: string;
  intent?: "calendar" | "signin";
}): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeState(state: string): {
  userId: string;
  returnTo?: string;
  intent?: "calendar" | "signin";
} | null {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function dayDateTime(date: string, hourMinute: string): { start: string; end: string; tzid: string } {
  // We send naive local datetimes plus a timezone so the calendar shows it
  // in the user's intended local time regardless of server location.
  const [hh, mm] = hourMinute.split(":");
  const start = `${date}T${hh!.padStart(2, "0")}:${(mm ?? "00").padStart(2, "0")}:00`;
  return { start, end: start, tzid: process.env.DEFAULT_TZ ?? "Asia/Jakarta" };
}

export async function registerCalendarRoutes(app: FastifyInstance) {
  app.get("/auth/google/url", async (req, reply) => {
    if (!googleConfigured()) {
      return reply.code(503).send({
        error: "google_not_configured",
        message:
          "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in apps/api/.env",
      });
    }
    const { userId, returnTo, intent } = req.query as {
      userId?: string;
      returnTo?: string;
      intent?: string;
    };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    const resolvedIntent: "calendar" | "signin" = intent === "signin" ? "signin" : "calendar";
    const url = buildConsentUrl(encodeState({ userId, returnTo, intent: resolvedIntent }));
    return { url };
  });

  app.get("/auth/google/callback", async (req, reply) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };
    const webOrigin = pickWebOrigin();
    const back = (
      status: string,
      returnTo?: string,
      msg?: string,
      extras?: Record<string, string>,
    ) => {
      const intent = parsed?.intent ?? "calendar";
      const fallback = intent === "signin" ? "/onboarding" : "/onboarding";
      const target = returnTo && returnTo.startsWith("/") ? returnTo : fallback;
      const url = new URL(`${webOrigin}${target}`);
      // For sign-in we use `signin` query key; calendar sync keeps `calendar`.
      url.searchParams.set(intent === "signin" ? "signin" : "calendar", status);
      if (msg) url.searchParams.set("msg", msg);
      if (extras) {
        for (const [k, v] of Object.entries(extras)) {
          if (v) url.searchParams.set(k, v);
        }
      }
      return reply.redirect(url.toString());
    };

    const parsed = state ? decodeState(state) : null;
    if (error) return back("error", parsed?.returnTo, error);
    if (!code || !parsed) return back("error", parsed?.returnTo, "missing_code_or_state");

    try {
      const tokens = await exchangeCode(code);
      if (!tokens.refresh_token) {
        return back(
          "error",
          parsed.returnTo,
          "no_refresh_token — revoke previous grant at myaccount.google.com",
        );
      }
      const stored: StoredToken = {
        userId: parsed.userId,
        refreshToken: tokens.refresh_token,
        email: tokens.email,
        connectedAt: new Date().toISOString(),
      };
      await db().collection("calendarTokens").doc(parsed.userId).set(stored);
      const conn: CalendarConnection = {
        userId: parsed.userId,
        provider: "google",
        email: tokens.email,
        connectedAt: stored.connectedAt,
      };
      await db().collection("calendarConnections").doc(parsed.userId).set(conn);

      if (parsed.intent === "signin") {
        return back("connected", parsed.returnTo, tokens.email ?? "", {
          googleName: tokens.name ?? "",
          googleEmail: tokens.email ?? "",
        });
      }
      return back("connected", parsed.returnTo, tokens.email ?? "");
    } catch (err) {
      app.log.error({ err }, "oauth_exchange_failed");
      return back("error", parsed.returnTo, (err as Error).message);
    }
  });

  app.get("/calendar/status", async (req, reply) => {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    const doc = await db().collection("calendarConnections").doc(userId).get();
    if (!doc.exists) return { connected: false as const };
    const conn = doc.data() as CalendarConnection;
    return { connected: true as const, email: conn.email, connectedAt: conn.connectedAt };
  });

  app.delete("/calendar/disconnect", async (req, reply) => {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return reply.code(400).send({ error: "missing_userId", message: "userId required" });
    }
    await db().collection("calendarTokens").doc(userId).delete();
    await db().collection("calendarConnections").doc(userId).delete();
    return { ok: true };
  });

  const SyncBody = z.object({
    userId: z.string().min(1),
    planId: z.string().min(1),
    /** Local time HH:MM (24h) to schedule each day's study block. */
    startTime: z.string().regex(/^\d{2}:\d{2}$/).default("19:00"),
  });

  app.post("/calendar/sync-plan", async (req, reply) => {
    const parsed = SyncBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const { userId, planId, startTime } = parsed.data;

    const tokenDoc = await db().collection("calendarTokens").doc(userId).get();
    if (!tokenDoc.exists) {
      return reply.code(409).send({
        error: "not_connected",
        message: "Connect Google Calendar first",
      });
    }
    const { refreshToken } = tokenDoc.data() as StoredToken;

    const planDoc = await db().collection("studyPlans").doc(planId).get();
    if (!planDoc.exists) {
      return reply.code(404).send({ error: "plan_not_found", message: "Study plan not found" });
    }
    const plan = planDoc.data() as StudyPlan;
    if (plan.userId !== userId) {
      return reply.code(403).send({ error: "forbidden", message: "Plan does not belong to user" });
    }

    const auth = clientFromRefreshToken(refreshToken);

    let eventsCreated = 0;
    let eventsSkipped = 0;

    for (const day of plan.days) {
      const tz = process.env.DEFAULT_TZ ?? "Asia/Jakarta";
      const [hh, mm] = startTime.split(":");
      const startISO = `${day.date}T${hh!.padStart(2, "0")}:${(mm ?? "00").padStart(2, "0")}:00`;
      const startDate = new Date(`${startISO}+00:00`); // wall clock + tz handled below
      const endDate = new Date(startDate.getTime() + day.totalMinutes * 60_000);
      const endISO = `${day.date}T${String(endDate.getUTCHours()).padStart(2, "0")}:${String(
        endDate.getUTCMinutes(),
      ).padStart(2, "0")}:00`;

      const webBase = pickWebOrigin();
      const skillHref = (skill: string): string => {
        switch (skill) {
          case "writing":
            return `${webBase}/write`;
          case "reading":
            return `${webBase}/read`;
          case "speaking":
            return `${webBase}/speak`;
          case "vocabulary":
          case "grammar":
            return `${webBase}/review`;
          case "listening":
            return `${webBase}/speak`;
          default:
            return `${webBase}/plan/${plan.id}`;
        }
      };

      const summary = `IELTS · ${day.focus}`;
      const blocks: string[] = [];
      for (const t of day.tasks) {
        const head = `• ${t.title} (${t.skill}, ${t.estimatedMinutes}m)`;
        const body = (t.description ?? "").trim();
        const link = `Open: ${skillHref(t.skill)}`;
        blocks.push(body ? `${head}\n  ${body}\n  ${link}` : `${head}\n  ${link}`);
      }
      blocks.push(`Full plan: ${webBase}/plan/${plan.id}`);
      const description = blocks.join("\n\n");

      try {
        await calendar.events.insert({
          auth,
          calendarId: "primary",
          requestBody: {
            summary,
            description,
            start: { dateTime: startISO, timeZone: tz },
            end: { dateTime: endISO, timeZone: tz },
            reminders: { useDefault: true },
            source: { title: "IELTS Booster study plan", url: `${pickWebOrigin()}/plan/${plan.id}` },
          },
        });
        eventsCreated += 1;
      } catch (err) {
        app.log.warn({ err, date: day.date }, "event_insert_failed");
        eventsSkipped += 1;
      }
    }

    const result: CalendarSyncResult = {
      eventsCreated,
      eventsSkipped,
      calendarId: "primary",
    };
    return result;
  });
}
