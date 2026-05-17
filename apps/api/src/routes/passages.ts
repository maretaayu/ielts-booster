import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ReadingAttempt, ReadingPassage } from "@ielts/shared";
import { db } from "../lib/firebase.js";

const SEED_PASSAGES: ReadingPassage[] = [
  {
    id: "r-octopus-cognition",
    title: "The unexpected intelligence of octopuses",
    difficulty: "medium",
    estimatedMinutes: 18,
    wordCount: 612,
    tags: ["science", "biology"],
    source: "Original passage, Cambridge-style",
    headings: [
      "A: A creature that seems to defy classification",
      "B: How octopuses experience the world through their arms",
      "C: Solving puzzles in captivity",
      "D: The mystery of a short but vivid life",
      "E: Distinguishing one human from another",
      "F: Tool use among invertebrates",
      "G: Why their intelligence is so difficult to measure",
    ],
    body: `[P1] For most of recorded history, biologists treated octopuses as little more than curious sea creatures: soft-bodied molluscs with a strange habit of changing colour. They were rarely considered intelligent in any meaningful sense. After all, intelligence was something humans associated with mammals and birds — animals whose nervous systems looked at least vaguely familiar. The octopus, by contrast, has a brain shaped like a doughnut, two-thirds of its neurons distributed throughout its arms, and an evolutionary history that diverged from ours over five hundred million years ago.

[P2] That picture began to shift in the late twentieth century, when researchers started to design experiments that respected the octopus on its own terms rather than measuring it against a vertebrate template. In aquariums in Naples and Seattle, octopuses learned to open childproof pill bottles, navigate mazes for the first time without trial and error, and unscrew jars from the inside. One captive specimen at the New England Aquarium, nicknamed Truman, reportedly squirted water at a particular volunteer he disliked — and only at her — for several weeks.

[P3] Such anecdotes, while compelling, are scientifically slippery. The more rigorous evidence comes from controlled studies of tool use. In 2009, a team working off the coast of Indonesia documented veined octopuses gathering coconut-shell halves, carrying them across the seabed and assembling them into portable shelters. This was the first clearly documented example of tool use in an invertebrate, and it forced researchers to expand a category previously reserved for great apes, dolphins and corvids.

[P4] What makes the octopus particularly fascinating is the way its intelligence is distributed. A human brain centralises sensory processing in the skull. An octopus's nervous system, by contrast, contains roughly five hundred million neurons, but only about a third of them sit in the central brain. The remaining two-thirds are arranged along the eight arms, each of which can — to a remarkable degree — taste, touch, and even make decisions independently of the others. Some neuroscientists describe this as a form of "embodied cognition" that has no parallel anywhere else in the animal kingdom.

[P5] Yet measuring the intelligence of such a creature remains genuinely difficult. Standard tests rely on motivation, repetition and social cues that simply do not translate. Octopuses are also solitary by nature and famously short-lived: most species die within one to two years of hatching. A creature that does not live long enough to learn from its grandparents, and which spends most of its waking life alone, presents a strange paradox for cognitive scientists trying to explain how such sophistication evolved at all.

[P6] One emerging hypothesis is that the octopus's intelligence developed not because it needed to outwit rivals, but because it needed to survive a world full of predators with very little armour of its own. Camouflage, escape routes, problem-solving on the fly — these may be the evolutionary pressures that produced a mind so different from ours. Whatever the explanation, the octopus invites us to widen our definition of thought itself: a definition, it turns out, that may have been quietly shaped by our own vertebrate bias all along.`,
    questions: [
      // Matching headings
      {
        id: "q1",
        type: "matching-headings",
        prompt: "Match a heading to paragraph P2.",
        options: [
          "A: A creature that seems to defy classification",
          "C: Solving puzzles in captivity",
          "E: Distinguishing one human from another",
          "F: Tool use among invertebrates",
        ],
        answer: "C: Solving puzzles in captivity",
        explanation: "P2 describes octopuses opening pill bottles, unscrewing jars and solving mazes in aquariums.",
        paragraphRef: "P2",
      },
      {
        id: "q2",
        type: "matching-headings",
        prompt: "Match a heading to paragraph P4.",
        options: [
          "B: How octopuses experience the world through their arms",
          "D: The mystery of a short but vivid life",
          "F: Tool use among invertebrates",
          "G: Why their intelligence is so difficult to measure",
        ],
        answer: "B: How octopuses experience the world through their arms",
        explanation: "P4 explains the distributed nervous system, with two-thirds of neurons in the arms.",
        paragraphRef: "P4",
      },
      // True/False/Not Given
      {
        id: "q3",
        type: "true-false-notgiven",
        prompt: "Octopuses share a recent common ancestor with mammals.",
        answer: "False",
        explanation: "P1 says their evolutionary history diverged from ours over five hundred million years ago.",
        paragraphRef: "P1",
      },
      {
        id: "q4",
        type: "true-false-notgiven",
        prompt: "The 2009 Indonesia study was the first documented case of tool use in any animal without a backbone.",
        answer: "True",
        explanation: "P3 explicitly calls it the first clearly documented example of tool use in an invertebrate.",
        paragraphRef: "P3",
      },
      {
        id: "q5",
        type: "true-false-notgiven",
        prompt: "Most octopus species live for more than five years.",
        answer: "False",
        explanation: "P5 states that most species die within one to two years of hatching.",
        paragraphRef: "P5",
      },
      {
        id: "q6",
        type: "true-false-notgiven",
        prompt: "Truman the octopus was trained by researchers to recognise specific people.",
        answer: "Not Given",
        explanation:
          "P2 describes the behaviour but the passage does not say whether Truman was trained — only that he squirted a particular volunteer.",
        paragraphRef: "P2",
      },
      // Multiple choice
      {
        id: "q7",
        type: "multiple-choice",
        prompt: "What does the writer suggest about earlier biologists' view of octopuses?",
        options: [
          "They considered octopuses dangerous to study.",
          "They underestimated octopus intelligence because of a mammal-centric bias.",
          "They believed octopuses were closely related to fish.",
          "They studied octopuses primarily for medical research.",
        ],
        answer: "1",
        explanation:
          "P1 says intelligence was associated with mammals and birds, which echoes the closing line about vertebrate bias.",
        paragraphRef: "P1",
      },
      {
        id: "q8",
        type: "multiple-choice",
        prompt: "According to the passage, why is octopus intelligence difficult to measure?",
        options: [
          "Octopuses refuse to participate in laboratory experiments.",
          "Standard cognitive tests assume social motivations octopuses do not share.",
          "Their nervous systems are too small to test reliably.",
          "Researchers have not yet developed underwater testing equipment.",
        ],
        answer: "1",
        explanation:
          "P5 notes that standard tests rely on motivation, repetition and social cues that don't translate, and that octopuses are solitary.",
        paragraphRef: "P5",
      },
    ],
  },
  {
    id: "r-circadian-rhythm",
    title: "The science of your body clock",
    difficulty: "easy",
    estimatedMinutes: 15,
    wordCount: 488,
    tags: ["health", "science"],
    source: "Original passage, Cambridge-style",
    body: `[P1] Almost every living thing on Earth, from the simplest algae to the largest mammals, has an internal clock. This biological mechanism, known as the circadian rhythm, is a roughly 24-hour cycle that governs sleep, hormone release, body temperature and even mood. It evolved in response to the planet's rotation, allowing organisms to anticipate the changing conditions of day and night rather than merely react to them.

[P2] In humans, the master clock sits in a tiny region of the brain called the suprachiasmatic nucleus, located just above the optic nerves. It receives information about light directly from the retina, and uses that information to synchronise dozens of secondary clocks scattered across organs such as the liver, the heart and the kidneys. When these clocks fall out of step with each other — a state biologists sometimes call "internal jetlag" — the body's chemistry becomes notably less efficient.

[P3] The most obvious experience of a disrupted clock is, of course, jetlag itself. After a long-haul flight across several time zones, the master clock takes several days to realign with the new daylight schedule, while the peripheral clocks lag behind for even longer. The result is the familiar fog of poor concentration, irritability, and disturbed sleep. Less obvious, but more concerning, is the chronic disruption suffered by shift workers, whose clocks are repeatedly forced to adjust to schedules they never fully adapt to.

[P4] Studies have linked long-term shift work to higher rates of obesity, type 2 diabetes, certain cancers and cardiovascular disease. The mechanisms are still being unpicked, but appear to involve disrupted hormone cycles — particularly insulin and cortisol — and a body that is repeatedly asked to digest food or stay alert at hours when its internal chemistry is preparing for rest.

[P5] Encouragingly, the field of "chronobiology" has produced practical advice. Bright light exposure in the morning, especially natural sunlight, helps anchor the master clock. Avoiding bright screens in the late evening reduces the suppression of melatonin, the hormone that signals night. Even meal timing matters: eating heavy meals close to bedtime can desynchronise peripheral clocks in the liver and gut, regardless of the actual hour of sleep.`,
    questions: [
      {
        id: "q1",
        type: "yes-no-notgiven",
        prompt: "The writer believes shift work poses more serious long-term health risks than jetlag.",
        answer: "Yes",
        explanation: "P3 calls shift-worker disruption 'more concerning' than jetlag.",
        paragraphRef: "P3",
      },
      {
        id: "q2",
        type: "yes-no-notgiven",
        prompt: "All circadian rhythms in the human body are controlled directly by light.",
        answer: "No",
        explanation:
          "P2 makes clear only the master clock receives light directly; it synchronises peripheral clocks that aren't themselves light-driven.",
        paragraphRef: "P2",
      },
      {
        id: "q3",
        type: "yes-no-notgiven",
        prompt: "Scientists have fully understood why disrupted clocks lead to chronic disease.",
        answer: "No",
        explanation: "P4 explicitly says the mechanisms are 'still being unpicked'.",
        paragraphRef: "P4",
      },
      {
        id: "q4",
        type: "multiple-choice",
        prompt: "Which of the following is NOT mentioned as a function of the circadian rhythm?",
        options: ["Sleep", "Hormone release", "Body temperature", "Vision sharpness"],
        answer: "3",
        explanation: "P1 lists sleep, hormones, temperature and mood — vision sharpness is not mentioned.",
        paragraphRef: "P1",
      },
      {
        id: "q5",
        type: "short-answer",
        prompt: "Name the brain region that acts as the body's master clock.",
        answer: "suprachiasmatic nucleus",
        explanation: "Stated explicitly in P2.",
        paragraphRef: "P2",
      },
      {
        id: "q6",
        type: "short-answer",
        prompt: "Which hormone is suppressed when the eyes are exposed to bright screens at night?",
        answer: "melatonin",
        explanation: "Stated explicitly in P5.",
        paragraphRef: "P5",
      },
    ],
  },
  {
    id: "r-urban-rewilding",
    title: "Rewilding the city",
    difficulty: "hard",
    estimatedMinutes: 20,
    wordCount: 720,
    tags: ["environment", "urban"],
    source: "Original passage, Cambridge-style",
    headings: [
      "A: A movement that began in unlikely places",
      "B: The economic logic of letting things grow",
      "C: Resistance from traditional city planners",
      "D: Measuring what wild urban spaces actually do",
      "E: Lessons from a single Dutch experiment",
      "F: From manicured lawns to functioning ecosystems",
      "G: Why citizens are essential to the work",
    ],
    body: `[P1] The idea of "rewilding" was, until quite recently, associated almost exclusively with rural landscapes: vast tracts of farmland returning to forest, beavers reintroduced to remote rivers, or wolves reshaping the ecology of national parks. The notion that wildness might also belong in cities — alongside tower blocks, train tracks and shopping streets — would have struck most planners of the twentieth century as faintly absurd. Yet over the past two decades, urban rewilding has quietly become one of the more interesting frontiers in ecology, and one of the more contentious debates in urban planning.

[P2] The early experiments were modest. In the 1990s, the Dutch city of Nijmegen began deliberately leaving certain riverbanks unmown, allowing native wildflowers and grasses to return. Researchers monitoring the sites recorded an unexpectedly rapid increase in pollinators, ground-nesting birds and even small mammals. The Nijmegen project was important less for its ecological outcomes than for what it suggested politically: that significant biodiversity gains were possible without acquiring new land, displacing residents, or spending large sums on infrastructure.

[P3] Other cities took notice. Within a decade, parts of Berlin, London and Melbourne were running comparable schemes — replacing manicured lawns with wildflower meadows, converting drainage ditches into reed beds, even seeding sections of abandoned rail lines with native shrubs. The aesthetic was different from traditional municipal landscaping, which valued symmetry and control. Some residents complained that the new spaces looked unkempt; others welcomed the return of birdsong they had not heard since childhood. The disagreement was rarely about ecology and almost always about appearance.

[P4] What changed the conversation was data. Long-term studies began to show that rewilded urban patches — even small ones, a few hundred square metres at a time — outperformed conventional parkland on almost every ecological measure: insect abundance, soil health, water retention, summer cooling. Crucially, they cost local governments significantly less to maintain. A wildflower verge requires perhaps one cut per year, where a conventional grass verge requires fifteen. In cities under increasing budget pressure, that arithmetic alone was enough to interest municipal officials who had previously dismissed the idea on aesthetic grounds.

[P5] The most surprising finding, however, was social rather than ecological. Surveys in several rewilded districts found that residents living within sight of restored green space reported lower levels of stress, stronger neighbourhood ties, and a greater willingness to participate in community activities. The presence of visibly wild nature — bumblebees, butterflies, unfamiliar wildflowers — seemed to do something to people that ornamental flowerbeds did not. Some psychologists suggest the effect comes from a sense of being part of a living, unpredictable system rather than a controlled landscape.

[P6] Resistance remains, especially from older residents accustomed to traditional parks and from planning departments wedded to legible, geometric urban design. Critics also worry, not unreasonably, that "rewilded" sometimes becomes a euphemism for "neglected" — and that without active management, well-intentioned projects can degrade into weed-choked dead zones. Most experienced practitioners argue that successful urban rewilding requires the opposite of neglect: careful site selection, ongoing monitoring, and meaningful involvement from the people who live nearby.

[P7] The shape of this movement over the next decade will probably be determined less by ecologists than by ordinary residents — by whether enough citizens come to see a meadow on their street not as untidiness, but as something their city is doing on purpose, and on their behalf.`,
    questions: [
      {
        id: "q1",
        type: "matching-headings",
        prompt: "Match a heading to paragraph P2.",
        options: [
          "A: A movement that began in unlikely places",
          "C: Resistance from traditional city planners",
          "E: Lessons from a single Dutch experiment",
          "F: From manicured lawns to functioning ecosystems",
        ],
        answer: "E: Lessons from a single Dutch experiment",
        explanation: "P2 focuses on the Nijmegen project and what it specifically demonstrated.",
        paragraphRef: "P2",
      },
      {
        id: "q2",
        type: "matching-headings",
        prompt: "Match a heading to paragraph P4.",
        options: [
          "B: The economic logic of letting things grow",
          "C: Resistance from traditional city planners",
          "D: Measuring what wild urban spaces actually do",
          "G: Why citizens are essential to the work",
        ],
        answer: "D: Measuring what wild urban spaces actually do",
        explanation: "P4 is centred on data and ecological measurements that changed the conversation.",
        paragraphRef: "P4",
      },
      {
        id: "q3",
        type: "yes-no-notgiven",
        prompt: "The writer believes urban rewilding is now universally accepted by city planners.",
        answer: "No",
        explanation: "P6 describes continuing resistance from older residents and traditional planning departments.",
        paragraphRef: "P6",
      },
      {
        id: "q4",
        type: "true-false-notgiven",
        prompt: "Wildflower verges require fewer annual mowings than conventional grass verges.",
        answer: "True",
        explanation: "P4 says one cut per year versus fifteen.",
        paragraphRef: "P4",
      },
      {
        id: "q5",
        type: "true-false-notgiven",
        prompt: "Most resident complaints about rewilded spaces concerned ecological harm.",
        answer: "False",
        explanation: "P3 says the disagreement was almost always about appearance, not ecology.",
        paragraphRef: "P3",
      },
      {
        id: "q6",
        type: "true-false-notgiven",
        prompt: "Rewilding has been shown to increase house prices in surrounding districts.",
        answer: "Not Given",
        explanation: "The passage discusses ecological, financial and social outcomes but does not mention house prices.",
        paragraphRef: "P5",
      },
      {
        id: "q7",
        type: "multiple-choice",
        prompt: "According to P5, the most surprising effect of rewilding was:",
        options: [
          "An increase in insect populations.",
          "A reduction in maintenance budgets.",
          "Psychological and social benefits for nearby residents.",
          "The return of bird species presumed extinct.",
        ],
        answer: "2",
        explanation: "P5 explicitly frames the social finding as the most surprising one.",
        paragraphRef: "P5",
      },
      {
        id: "q8",
        type: "short-answer",
        prompt: "Which Dutch city ran the influential 1990s experiment described in P2?",
        answer: "Nijmegen",
        explanation: "Named directly in P2.",
        paragraphRef: "P2",
      },
    ],
  },
];

const SubmitAttemptBody = z.object({
  userId: z.string().min(1),
  passageId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
  timeSpentSeconds: z.number().int().nonnegative(),
});

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isCorrect(expected: string, given: string): boolean {
  return normalise(expected) === normalise(given);
}

export function findPassageById(id: string): ReadingPassage | undefined {
  return SEED_PASSAGES.find((p) => p.id === id);
}

export async function registerPassageRoutes(app: FastifyInstance) {
  app.get("/passages", async () => ({
    passages: SEED_PASSAGES.map(({ questions, body, ...meta }) => ({
      ...meta,
      questionCount: questions.length,
      preview: body.split("\n\n")[0]?.replace(/^\[P\d+\]\s*/, "").slice(0, 220) + "…",
    })),
  }));

  app.get("/passages/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const found = findPassageById(id);
    if (!found) {
      return reply.code(404).send({ error: "not_found", message: "Passage not found" });
    }
    return found;
  });

  app.post("/reading-attempts", async (req, reply) => {
    const parsed = SubmitAttemptBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_error", message: "Invalid body", details: parsed.error.flatten() });
    }
    const { userId, passageId, answers, timeSpentSeconds } = parsed.data;
    const passage = findPassageById(passageId);
    if (!passage) {
      return reply.code(404).send({ error: "not_found", message: "Passage not found" });
    }

    let score = 0;
    const breakdown = passage.questions.map((q) => {
      const given = answers[q.id] ?? "";
      const correct = given ? isCorrect(q.answer, given) : false;
      if (correct) score += 1;
      return { questionId: q.id, given, expected: q.answer, correct, explanation: q.explanation };
    });

    const ref = db().collection("readingAttempts").doc();
    const attempt: ReadingAttempt = {
      id: ref.id,
      userId,
      passageId,
      answers,
      score,
      total: passage.questions.length,
      timeSpentSeconds,
      createdAt: new Date().toISOString(),
    };
    await ref.set(attempt);
    return { attempt, breakdown };
  });
}
