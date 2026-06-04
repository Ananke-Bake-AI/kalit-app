/**
 * Idea-finder "scout" engine.
 *
 * The market-insight half of the build-engine magnet (the sibling of the roast
 * teaser). A visitor tells the scout what they'd love to build and who for;
 * we turn that into a Kalit Search query, pull the strongest, most
 * business-ready ideas, and synthesise a personal brief for each: why it fits
 * them, the business model, and a launch playbook — all grounded in Search's
 * real, multi-source data. Free + anonymous. Signup unlocks the full brief.
 *
 * Reuses the GROQ_API_KEY / llama-3.3-70b pattern from the roast teaser. Two
 * cheap LLM hops: (1) profile → search params, (2) ground the top matches into
 * founder-fit + GTM narrative. Everything factual comes from Search, not the
 * model.
 */
import {
  getSearchProject,
  parseObject,
  parseStringArray,
  searchProjectUrl,
  searchProjects,
  type SearchProject,
} from "./search"
import type { IdeaFull, IdeaTeaser, ScoutProfile } from "./idea-types"

export { previewIdea } from "./idea-types"
export type { IdeaFull, IdeaPreview, ScoutProfile } from "./idea-types"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"

export type ScoutResult = IdeaTeaser

// ─── Groq helpers ─────────────────────────────────────────────
async function callGroqJson(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error("GROQ_API_KEY not configured")
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim() || ""
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  return JSON.parse(cleaned) as Record<string, unknown>
}

// Trim, cap, and strip em/en dashes (the telltale "AI-written" punctuation) —
// applied to every displayed field, including Search's own AI-generated copy.
const str = (v: unknown, max = 400): string =>
  String(v ?? "")
    .replace(/\s*[—–]\s*/g, ", ")
    .trim()
    .slice(0, max)

function profileText(p: ScoutProfile): string {
  return JSON.stringify({
    wantsToBuild: p.goal,
    interests: p.interests,
    audience: p.audience,
    stage: p.stage,
  })
}

// ── Step 1: profile → search keywords ──
// Kalit Search matches the `search` param as a SINGLE substring over idea
// names/descriptions/trend keywords — so a multi-word phrase matches almost
// nothing. We extract several SHORT domain terms and query each separately,
// then union + rank, which is how we get on-topic matches.
const PLAN_SYSTEM = `You translate a founder's interests into search keywords for Kalit Search, a database of scored, business-ready startup ideas mined from 25+ trend sources.

Output ONLY valid JSON (no markdown) with this shape:
{
  "keywords": ["<single salient term>", "<another>", "..."],
  "founderSummary": "<one warm, specific sentence reflecting back what this founder wants to build and who for>"
}

Rules:
- Return 3 to 6 keywords. Each is matched as a SUBSTRING over idea names/descriptions/trend keywords, so use common domain NOUNS the matching ideas would actually contain (e.g. "clinic", "patient", "scheduling", "health"), NOT long phrases. One or two words max each, lowercase.
- Order keywords most-specific-to-the-founder first.
- Never invent facts. "founderSummary" only reflects what they told you.
- "founderSummary" should sound like a friendly human talking, warm and a little excited. Never use em dashes or en dashes (— or –); use commas, periods or parentheses instead.`

async function planSearch(p: ScoutProfile): Promise<{ keywords: string[]; founderSummary: string }> {
  try {
    const parsed = await callGroqJson({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PLAN_SYSTEM },
        { role: "user", content: profileText(p) },
      ],
    })
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k) => str(k, 40).toLowerCase()).filter((k) => k.length > 1).slice(0, 6)
      : []
    return {
      keywords: keywords.length ? keywords : fallbackKeywords(p),
      founderSummary: str(parsed.founderSummary, 240) || defaultSummary(p),
    }
  } catch {
    return { keywords: fallbackKeywords(p), founderSummary: defaultSummary(p) }
  }
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "your", "you", "are", "but", "all",
  "tools", "tool", "app", "apps", "platform", "software", "service", "build", "building",
  "make", "want", "like", "help", "helps", "something", "people", "around", "into", "from",
])

// Terms so broad they match nearly every idea — querying them just surfaces the
// globally highest-opportunity (off-topic) ideas, drowning the founder's space.
const GENERIC_KEYWORDS = new Set([
  "ai", "app", "saas", "tech", "platform", "tool", "software", "startup", "agent",
  "agents", "automation", "data", "digital", "online", "web", "mobile", "api",
])

function dropGeneric(keywords: string[]): string[] {
  const specific = keywords.filter((k) => !GENERIC_KEYWORDS.has(k))
  // If everything was generic, keep the originals rather than match nothing.
  return specific.length ? specific : keywords
}

function fallbackKeywords(p: ScoutProfile): string[] {
  const fromInterests = (p.interests || []).map((i) => i.split(/[&\s]+/)[0].toLowerCase())
  const fromGoal = (p.goal || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  return [...new Set([...fromInterests, ...fromGoal])].filter(Boolean).slice(0, 6)
}
function defaultSummary(p: ScoutProfile): string {
  const what = p.goal?.trim() || (p.interests || []).join(", ") || "your next thing"
  return `You want to build ${what}${p.audience ? ` for ${p.audience.toLowerCase()}` : ""}.`
}

// ── Step 2: ground the top matches into a founder-personal brief ──
const GROUND_SYSTEM = `You are a sharp startup analyst for Kalit. Given a founder profile and a few real, data-scored startup ideas, write a personal brief for each idea. You are GROUNDING, not inventing — use only the facts provided about each idea.

Output ONLY valid JSON (no markdown) with this shape:
{
  "ideas": [
    {
      "projectId": "<echo the id>",
      "tagline": "<punchy one-liner for this idea, max 12 words>",
      "fitReason": "<2 sentences: why THIS founder specifically is well-placed to build this, tied to their interests/audience/stage>",
      "businessModelSummary": "<2-3 sentences on how it makes money, grounded in the revenueModel/pricing/MRR provided>",
      "gtm": ["<launch step 1>", "<step 2>", "<step 3>", "<step 4 (optional)>"],
      "demoIdea": "<one sentence: what a quick Kalit Flow demo site/landing for this idea would show off to test demand>"
    }
  ]
}

Rules:
- One object per idea, same order, echo each projectId exactly.
- "gtm" = 3-5 concrete, sequenced go-to-market steps a solo founder could actually run first.
- Be specific to each idea's market and audience. No generic filler, no invented competitors or numbers.
- Write like a sharp, encouraging human, not a corporate deck. Punchy and concrete. Never use em dashes or en dashes (— or –); use commas, periods or parentheses instead.`

function groundingInput(p: ScoutProfile, projects: SearchProject[]): string {
  return JSON.stringify({
    founder: { wantsToBuild: p.goal, interests: p.interests, audience: p.audience, stage: p.stage },
    ideas: projects.map((pr) => ({
      projectId: pr.id,
      name: pr.name,
      category: pr.category,
      description: str(pr.description, 600),
      whyNow: str(pr.whyNow, 400),
      targetAudience: str(pr.targetAudience, 200),
      marketSize: str(pr.marketSize, 200),
      uniqueAngle: str(pr.uniqueAngle, 300),
      revenueModel: str(pr.revenueModel, 200),
      pricing: str(pr.pricingStrategy, 200),
      estimatedMRR: str(pr.estimatedMRR, 80),
    })),
  })
}

interface Grounding {
  tagline: string
  fitReason: string
  businessModelSummary: string
  gtm: string[]
  demoIdea: string
}

async function groundIdeas(
  p: ScoutProfile,
  projects: SearchProject[],
): Promise<Record<string, Grounding>> {
  const out: Record<string, Grounding> = {}
  try {
    const parsed = await callGroqJson({
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: GROUND_SYSTEM },
        { role: "user", content: groundingInput(p, projects) },
      ],
    })
    const arr = Array.isArray(parsed.ideas) ? (parsed.ideas as Record<string, unknown>[]) : []
    for (const it of arr) {
      const id = str(it.projectId, 60)
      if (!id) continue
      out[id] = {
        tagline: str(it.tagline, 120),
        fitReason: str(it.fitReason, 400),
        businessModelSummary: str(it.businessModelSummary, 500),
        gtm: Array.isArray(it.gtm) ? it.gtm.map((g) => str(g, 200)).filter(Boolean).slice(0, 5) : [],
        demoIdea: str(it.demoIdea, 240),
      }
    }
  } catch {
    /* fall through to per-idea defaults below */
  }
  return out
}

// ── Hydrate a raw Search project + its grounding into an IdeaFull ──
function hydrate(pr: SearchProject, g: Grounding | undefined): IdeaFull {
  const mvp = parseObject<{ pages?: unknown; keyFlows?: unknown; launchScope?: unknown }>(pr.mvpDefinition) || {}
  return {
    projectId: pr.id,
    name: str(pr.name, 120) || "Untitled idea",
    category: str(pr.category, 60) || "General",
    tagline: g?.tagline || str(pr.uniqueAngle, 120) || "A timely, data-backed opportunity.",
    fitReason: g?.fitReason || "This lines up with the space you said you want to work in.",
    scores: {
      opportunity: clampScore(pr.opportunityScore),
      kalitFit: clampScore(pr.kalitMvpFitScore),
      market: clampScore(pr.marketValueScore),
      signal: clampScore(pr.signalStrength ?? pr.trendSignalScore),
    },
    whyNow: str(pr.whyNow, 600),
    targetAudience: str(pr.targetAudience, 300),
    marketSize: str(pr.marketSize, 300),
    uniqueAngle: str(pr.uniqueAngle, 400),
    businessModel: {
      revenueModel: str(pr.revenueModel, 200) || str(pr.monetizationType, 60),
      pricing: str(pr.pricingStrategy, 240),
      estimatedMRR: str(pr.estimatedMRR, 80),
      summary: g?.businessModelSummary || "",
    },
    gtm: g?.gtm?.length ? g.gtm : [],
    competitors: parseStringArray(pr.competitors).slice(0, 6),
    mvp: {
      pages: parseStringArray(mvp.pages).slice(0, 8),
      keyFlows: parseStringArray(mvp.keyFlows).slice(0, 8),
      launchScope: str((mvp as { launchScope?: unknown }).launchScope, 300),
    },
    demoIdea: g?.demoIdea || "",
    sourceUrls: parseStringArray(pr.sourceUrls).slice(0, 6),
    searchUrl: searchProjectUrl(pr.id),
    timeToMVP: str(pr.timeToMVP, 60),
    complexity: str(pr.complexity, 40),
  }
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}

// ─── Public entry point ───────────────────────────────────────
export async function runScout(profile: ScoutProfile): Promise<ScoutResult> {
  const plan = await planSearch(profile)

  // Query each keyword separately (Search matches whole-string substrings, so
  // one combined query would match nothing), then union + rank by how many
  // keywords an idea hit, then by opportunity. This keeps matches on-topic.
  const byId = new Map<string, { p: SearchProject; hits: number }>()
  const keywords = dropGeneric(plan.keywords).slice(0, 6)
  const results = await Promise.all(
    keywords.map((kw) =>
      searchProjects({ query: kw, sort: "opportunityScore", order: "desc", limit: 8 }).catch(() => []),
    ),
  )
  for (const list of results) {
    for (const p of list) {
      const e = byId.get(p.id)
      if (e) e.hits += 1
      else byId.set(p.id, { p, hits: 1 })
    }
  }
  let projects = [...byId.values()]
    .sort((a, b) => b.hits - a.hits || b.p.opportunityScore - a.p.opportunityScore)
    .map((e) => e.p)

  // Broaden to the strongest current opportunities only if the founder's space
  // is too thin to fill three slots.
  if (projects.length < 3) {
    const broad = await searchProjects({ sort: "opportunityScore", order: "desc", limit: 12 })
    const seen = new Set(projects.map((p) => p.id))
    projects = [...projects, ...broad.filter((p) => !seen.has(p.id))]
  }

  const top = projects.slice(0, 3)
  if (top.length === 0) {
    return { profile, founderSummary: plan.founderSummary, ideas: [], topProjectId: null }
  }

  const grounding = await groundIdeas(profile, top)
  const ideas = top.map((pr) => hydrate(pr, grounding[pr.id]))
  return {
    profile,
    founderSummary: plan.founderSummary,
    ideas,
    topProjectId: ideas[0]?.projectId ?? null,
  }
}

/** Re-fetch a single idea fresh from Search (used at Flow-build time). */
export async function fetchIdea(projectId: string): Promise<SearchProject | null> {
  return getSearchProject(projectId)
}
