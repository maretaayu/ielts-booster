import type { FastifyInstance } from "fastify";
import type { Prompt } from "@ielts/shared";

const SEED_PROMPTS: Prompt[] = [
  // ===== Task 2 — Opinion / Discussion =====
  {
    id: "t2-tech-education",
    type: "task2",
    title: "Technology in education",
    question:
      "Some people believe that the use of technology in classrooms has a negative effect on children's social skills, while others think it is essential for preparing them for the future. Discuss both views and give your own opinion.",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["discussion", "education", "technology"],
  },
  {
    id: "t2-remote-work",
    type: "task2",
    title: "Working from home",
    question:
      "In many countries, more people are choosing to work from home rather than in an office. Do the advantages of this trend outweigh the disadvantages?",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["advantages-disadvantages", "work"],
  },
  {
    id: "t2-climate-action",
    type: "task2",
    title: "Individual vs government climate action",
    question:
      "Some argue that tackling climate change is the responsibility of governments, while others believe individuals must change their behaviour. Discuss both views and give your own opinion.",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "hard",
    tags: ["discussion", "environment"],
  },
  {
    id: "t2-university-free",
    type: "task2",
    title: "Should university education be free?",
    question:
      "Some people believe that university education should be free for all students, while others think students should pay tuition fees. Discuss both views and give your opinion.",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["discussion", "education"],
  },
  {
    id: "t2-social-media-influence",
    type: "task2",
    title: "Social media and young people",
    question:
      "Social media has a significant influence on the way young people communicate. To what extent do you agree or disagree that this influence is more negative than positive?",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["agree-disagree", "technology", "society"],
  },
  {
    id: "t2-art-funding",
    type: "task2",
    title: "Government funding for the arts",
    question:
      "Some people believe that governments should spend money on the arts, while others argue this money would be better spent on public services such as healthcare and education. Discuss both views and give your opinion.",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["discussion", "arts", "society"],
  },
  {
    id: "t2-international-tourism",
    type: "task2",
    title: "Effects of international tourism",
    question:
      "International tourism has brought both economic benefits and cultural problems to many destinations. Discuss these issues and suggest what can be done to maximise the benefits.",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "hard",
    tags: ["problem-solution", "globalization", "tourism"],
  },
  {
    id: "t2-public-transport",
    type: "task2",
    title: "Reducing private car use",
    question:
      "Some cities are introducing strict rules to reduce private car use. What are the reasons for this trend, and what measures could governments take to encourage citizens to use public transport instead?",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["problem-solution", "urban", "transport"],
  },
  {
    id: "t2-ai-jobs",
    type: "task2",
    title: "AI and the future of work",
    question:
      "Artificial intelligence is replacing many human jobs. Some see this as positive progress, others worry about mass unemployment. Discuss both perspectives and give your opinion.",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "hard",
    tags: ["discussion", "technology", "work"],
  },
  {
    id: "t2-language-loss",
    type: "task2",
    title: "Disappearance of minority languages",
    question:
      "Many minority languages are disappearing as globalization spreads. Is this a positive or negative development for our world?",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "hard",
    tags: ["agree-disagree", "culture", "globalization"],
  },
  {
    id: "t2-children-screen-time",
    type: "task2",
    title: "Children and screen time",
    question:
      "Young children today spend many hours watching screens. What problems can this cause, and what solutions can you suggest?",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "easy",
    tags: ["problem-solution", "family", "technology"],
  },
  {
    id: "t2-health-prevention",
    type: "task2",
    title: "Prevention vs treatment of disease",
    question:
      "Some people believe governments should focus on preventing disease through lifestyle education, rather than treating it. To what extent do you agree?",
    minWords: 250,
    timeMinutes: 40,
    difficulty: "medium",
    tags: ["agree-disagree", "health"],
  },

  // ===== Task 1 Academic =====
  {
    id: "t1a-population-chart",
    type: "task1-academic",
    title: "Population growth — line chart",
    question:
      "The line graph below shows the population (in millions) of four major cities — Tokyo, Mumbai, São Paulo and Lagos — between 1970 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    chartData: {
      kind: "line",
      yLabel: "Population (millions)",
      xLabels: ["1970", "1980", "1990", "2000", "2010", "2020"],
      series: [
        { name: "Tokyo", values: [23.3, 28.5, 32.5, 34.5, 36.9, 37.4], color: "#7c3aed" },
        { name: "Mumbai", values: [6.0, 8.7, 12.4, 16.4, 19.4, 20.4], color: "#ef4444" },
        { name: "São Paulo", values: [7.6, 12.1, 14.8, 17.0, 19.7, 22.0], color: "#f59e0b" },
        { name: "Lagos", values: [1.4, 2.6, 4.8, 7.3, 10.4, 14.4], color: "#10b981" },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    difficulty: "medium",
    tags: ["line-chart", "comparison"],
  },
  {
    id: "t1a-energy-pie",
    type: "task1-academic",
    title: "Energy sources — pie chart",
    question:
      "The pie charts below show the percentage of energy generated from different sources in a European country in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    chartData: {
      kind: "pie",
      panels: [
        {
          title: "2000",
          slices: [
            { label: "Coal", value: 42, color: "#1f2937" },
            { label: "Gas", value: 18, color: "#f59e0b" },
            { label: "Nuclear", value: 22, color: "#ef4444" },
            { label: "Hydro", value: 12, color: "#3b82f6" },
            { label: "Wind & Solar", value: 6, color: "#10b981" },
          ],
        },
        {
          title: "2020",
          slices: [
            { label: "Coal", value: 14, color: "#1f2937" },
            { label: "Gas", value: 22, color: "#f59e0b" },
            { label: "Nuclear", value: 18, color: "#ef4444" },
            { label: "Hydro", value: 14, color: "#3b82f6" },
            { label: "Wind & Solar", value: 32, color: "#10b981" },
          ],
        },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    difficulty: "medium",
    tags: ["pie-chart", "energy"],
  },
  {
    id: "t1a-process-recycling",
    type: "task1-academic",
    title: "Recycling process diagram",
    question:
      "The diagram below shows the stages and equipment used in the recycling of glass bottles. Summarise the information by selecting and reporting the main features.",
    chartData: {
      kind: "process",
      steps: [
        { label: "Collection", description: "Used bottles are collected from households and street bins by recycling trucks." },
        { label: "Sorting", description: "Bottles are transported to a sorting facility and separated by colour (clear, green, brown)." },
        { label: "Washing", description: "Sorted glass is washed with hot water to remove labels, dirt and contaminants." },
        { label: "Crushing", description: "Cleaned bottles are crushed into small fragments known as 'cullet'." },
        { label: "Melting", description: "Cullet is heated in a furnace at over 1,400°C until it becomes molten glass." },
        { label: "Moulding", description: "Molten glass is poured into moulds and shaped into new bottles." },
        { label: "Cooling & Distribution", description: "New bottles are cooled, quality-checked and distributed to manufacturers." },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    difficulty: "hard",
    tags: ["process", "diagram"],
  },
  {
    id: "t1a-employment-bar",
    type: "task1-academic",
    title: "Employment by sector — bar chart",
    question:
      "The bar chart below shows the percentage of people employed in three sectors (agriculture, manufacturing and services) in four countries in 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    chartData: {
      kind: "bar",
      yLabel: "% of workforce",
      categories: ["Indonesia", "Vietnam", "Germany", "United States"],
      series: [
        { name: "Agriculture", values: [29, 36, 1, 1], color: "#10b981" },
        { name: "Manufacturing", values: [22, 28, 27, 19], color: "#f59e0b" },
        { name: "Services", values: [49, 36, 72, 80], color: "#7c3aed" },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    difficulty: "medium",
    tags: ["bar-chart", "comparison"],
  },
  {
    id: "t1a-map-village",
    type: "task1-academic",
    title: "Village changes — map comparison",
    question:
      "The maps below show a village called Stokeford in 1980 and the same village today. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    chartData: {
      kind: "map",
      panels: [
        {
          title: "Stokeford in 1980",
          features: [
            "Main road running north–south through the centre of the village",
            "River Stoke flowing along the eastern edge",
            "Farmland covering the southern half of the map",
            "Two rows of houses lining the main road",
            "A primary school in the north-west corner",
            "A church beside the main road in the centre",
          ],
        },
        {
          title: "Stokeford today",
          features: [
            "Same main road, now widened with a roundabout in the centre",
            "Farmland replaced by large housing estates in the south",
            "New residential streets branching off the main road",
            "The primary school has been expanded and now includes a sports field",
            "The church remains unchanged",
            "A new shopping area built where the original southern houses stood",
          ],
        },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    difficulty: "hard",
    tags: ["map", "change-over-time"],
  },

  // ===== Task 1 General Training =====
  {
    id: "t1gt-complaint-letter",
    type: "task1-gt",
    title: "Complaint about a faulty product",
    question:
      "You recently bought a piece of equipment for your kitchen but it did not work. You phoned the shop but no action was taken. Write a letter to the shop manager. In your letter: introduce yourself; explain the situation; say what action you would like the manager to take.",
    minWords: 150,
    timeMinutes: 20,
    difficulty: "easy",
    tags: ["complaint", "letter", "formal"],
  },
  {
    id: "t1gt-job-application",
    type: "task1-gt",
    title: "Job application letter",
    question:
      "You have seen an advertisement for a part-time job in a local café. Write a letter to the manager. In your letter: explain why you are interested in the job; describe your relevant experience; say when you are available to start.",
    minWords: 150,
    timeMinutes: 20,
    difficulty: "easy",
    tags: ["application", "letter", "formal"],
  },
  {
    id: "t1gt-thank-you",
    type: "task1-gt",
    title: "Thank-you letter to a friend",
    question:
      "You recently stayed with a friend who lives in another city. Write a letter to your friend. In your letter: thank them for their hospitality; describe a memorable moment from the visit; invite them to visit you in return.",
    minWords: 150,
    timeMinutes: 20,
    difficulty: "easy",
    tags: ["thank-you", "letter", "informal"],
  },
  {
    id: "t1gt-request-accommodation",
    type: "task1-gt",
    title: "Request for accommodation",
    question:
      "You are going to study in an English-speaking country and need short-term accommodation. Write a letter to a homestay agency. In your letter: introduce yourself and your course; describe the kind of accommodation you need; ask about the cost and what is included.",
    minWords: 150,
    timeMinutes: 20,
    difficulty: "medium",
    tags: ["request", "letter", "semi-formal"],
  },
];

export async function registerPromptRoutes(app: FastifyInstance) {
  app.get("/prompts", async (req) => {
    const { type } = req.query as { type?: string };
    const filtered = type
      ? SEED_PROMPTS.filter((p) => p.type === type)
      : SEED_PROMPTS;
    return { prompts: filtered };
  });

  app.get("/prompts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const found = SEED_PROMPTS.find((p) => p.id === id);
    if (!found) {
      return reply.code(404).send({ error: "not_found", message: "Prompt not found" });
    }
    return found;
  });
}

export function findPromptById(id: string): Prompt | undefined {
  return SEED_PROMPTS.find((p) => p.id === id);
}
