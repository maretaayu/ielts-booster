# IELTS Booster

All-in-one IELTS learning platform — helping students accelerate to a higher band.

## Vision: 4 sections, 1 platform

### 1. Writing (MVP — scaffolded)
- Various case studies (Task 1 & Task 2 prompt bank)
- Submit essay → AI grades on 4 official IELTS criteria + overall band
- **Sentence-structure recommendations** so user simultaneously learns grammar patterns
- Inline annotations (errors, suggestions, praise) + vocabulary upgrades + band-9 sample answer

### 2. Speaking
- Various topics for free practice
- **Exam simulation** mode (Part 1 / Part 2 cue card / Part 3 follow-up)
- Real-time voice: STT → LLM examiner → TTS response
- Band estimate per criterion (Fluency, Lexical, Grammar, Pronunciation)

### 3. Reading
- Cambridge-style passages with full question types (T/F/NG, matching headings, MCQ, etc.)
- **Tap-to-define**: highlight a fancy word → instant meaning + synonyms + example sentence
  - No more bouncing to Google Translate mid-passage
  - Builds personal vocab list automatically for review

### 4. Listening
- Adapted from Cambridge example tests
- Section 1–4 practice with real audio + section types
- Note-taking + answer-fill interface

### Cross-cutting: AI Study Planner
- User inputs target band + exam date + current self-assessment
- AI generates a **personalized daily schedule** based on identified weaknesses
- Solves "I don't know where to start" — the #1 learner frustration
- Adapts as user completes drills (weak listening section types get more drills)

## Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind
- **Backend**: Fastify + TypeScript
- **Database**: Firestore (Firebase Admin SDK)
- **AI Grading**: Gemini 2.0 Flash (free tier for MVP)
- **Monorepo**: pnpm workspaces

## Structure

```
ielts/
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # Fastify backend
└── packages/
    └── shared/     # Shared TypeScript types
```

## Getting started

```bash
# 1. install deps
pnpm install

# 2. set up env vars
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# Fill in:
#  - GEMINI_API_KEY (https://aistudio.google.com/apikey)
#  - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
#    (from Firebase Console → Project Settings → Service Accounts)
#  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET — for calendar sync (see below)

# 3. run both apps
pnpm dev
```

### Google Calendar OAuth setup

To enable the "Add this plan to my calendar" feature:

1. Go to https://console.cloud.google.com/apis/credentials
2. Enable the **Google Calendar API** for your project.
3. Configure the **OAuth consent screen**:
   - User type: External (or Internal if Workspace)
   - Scopes: `auth/calendar.events`, `auth/userinfo.email`
   - Add your own email as a Test user while in "Testing" mode
4. Create **OAuth 2.0 Client ID** → type "Web application":
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:4000/auth/google/callback`
5. Copy the Client ID + Secret into `apps/api/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
   ```
6. Restart `pnpm dev` and visit `/plan/[planId]` — the "Connect Google Calendar" button will open Google's consent screen.

### ElevenLabs natural TTS (Speaking module)

The Speaking module uses ElevenLabs for the AI examiner's voice. Without an API key, it falls back to the browser's robotic Web Speech voice.

1. Sign up at https://elevenlabs.io (free)
2. Go to **Profile → API Keys** → create a new key
3. Add to `apps/api/.env`:
   ```
   ELEVENLABS_API_KEY=sk_...
   ```
4. Restart `pnpm dev` → `/speak/[topicId]` will use natural voices (Rachel / Sarah / Dorothy / Adam / Daniel — picker in header)

**Quota tips:** Free tier is 10,000 chars/month. The API server caches generated audio by `(text, voiceId)` — so the same question replayed across users only costs the first generation. All 11 seed topics × ~5 questions × ~80 chars ≈ 4,400 chars one-time spend.

### Speaking realtime — ElevenLabs Conversational AI agent

`/speak/[topicId]` runs as a fully live conversation (no transcript UI, interruptible). You need a one-time agent setup in the ElevenLabs dashboard.

1. Visit https://elevenlabs.io/app/conversational-ai → **+ Create Agent**
2. **Name:** `IELTS Examiner` (any name works)
3. **Voice:** pick a calm British/American voice (Sarah, Dorothy, Daniel — all in the regular voice library)
4. **LLM:** Gemini Flash, GPT-4o-mini, or Claude Haiku — any cheap fast model is fine
5. **First message:** `Hello, I'm your IELTS examiner. Let's begin with some questions about {{topic_title}}. Are you ready?`
6. **System prompt** — paste exactly:
   ```
   You are a friendly but professional IELTS Speaking examiner conducting {{topic_part}} on the topic "{{topic_title}}" (theme: {{topic_theme}}).

   The questions you must cover:
   {{questions_list}}

   Rules:
   - Ask ONE question at a time. Wait for the candidate's full answer before moving on.
   - For Part 1 (Interview): ask each question once, then move on. Keep your tone warm and short.
   - For Part 2 (Cue Card): read the topic + "you should say" bullets, then say "You have one minute to prepare. I'll tell you when to start." After ~30s of silence, say "Please begin speaking now." Let them speak for up to 2 minutes before gently stopping with "Thank you, that's the end of that part."
   - For Part 3 (Discussion): ask the listed questions plus 1-2 natural follow-ups based on their answers. Be more probing — push for opinions and examples.
   - DO NOT correct grammar or give feedback during the test. You are only an examiner.
   - DO NOT lead them or fill silence too aggressively — let them think for up to 6 seconds.
   - When all {{max_questions}} questions are covered, say "That's the end of the speaking test. Thank you very much. You can press End now."
   - Keep your own turns short — under 25 words unless reading a cue card.
   ```
7. Save → copy the **Agent ID** from the URL or agent settings
8. Add to `apps/api/.env`:
   ```
   ELEVENLABS_AGENT_ID=agent_xxx
   ```
9. Restart `pnpm dev` and open `/speak/[topicId]` → click "Start the interview"

**Billing notes:** ElevenLabs ConvAI charges by **minutes**, not characters. The free tier (Creator/Starter) typically gives ~15 minutes/month. A full Part 1 session is ~4 min, so plan accordingly. Upgrade to Creator plan ($5/mo, 100 min) if you want to drill seriously.

**Dynamic variables** the agent expects (all auto-populated by the backend):
- `{{topic_title}}` — e.g. "Work & Study"
- `{{topic_part}}` — e.g. "Part 1 (Interview)"
- `{{topic_theme}}` — e.g. "Work and study"
- `{{questions_list}}` — numbered list of questions (+ cue card bullets for Part 2)
- `{{max_questions}}` — integer

- Web: http://localhost:3000
- API: http://localhost:4000

## MVP roadmap (in order)

- [x] **Phase 0**: Scaffold (Next.js + Fastify + Firestore + Gemini)
- [x] **Phase 1**: Writing — prompt bank (Task 1 academic / GT + Task 2), sentence-structure tips, inline annotations
- [x] **Phase 3**: AI Study Planner (target band + date → daily schedule)
- [x] **Phase 4**: Reading — passages + tap-to-define popover (EN + Bahasa Indonesia) + auto-built vocab list
- [x] **Phase 5**: Mobile-first onboarding wizard + Google Calendar sync for daily study blocks
- [x] **Phase 6**: Vocab review (SM-2 lite spaced repetition flashcards)
- [x] **Phase 7**: Speaking — voice mock interview (Part 1/2/3, Web Speech API + Gemini examiner)
- [ ] **Phase 2**: Auth (Firebase Auth — email/Google), real user accounts
- [ ] **Phase 8**: Listening — Cambridge-style sections + audio player
- [ ] **Phase 9**: Mock full test simulator + band trajectory dashboard
