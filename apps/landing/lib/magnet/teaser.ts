/**
 * Roast-My-Landing-Page teaser engine.
 *
 * Anonymous, instant, free. Given a URL it returns a shareable score + the
 * top-3 problems + a screenshot URL — the "bait" half of the build-engine
 * magnet. The real rebuild happens later, after signup, in the studio.
 *
 * No heavy deps: server-side fetch + regex signal extraction + a fast Groq
 * critique (reusing the GROQ_API_KEY / llama-3.3-70b pattern from the
 * existing admin ai-assist route). Screenshot via a pluggable provider.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"

export interface TeaserProblem {
  title: string
  detail: string
  severity: "high" | "medium" | "low"
}

export interface TeaserResult {
  score: number // 0-100, higher = better
  breakdown: {
    clarity: number
    design: number
    conversion: number
    mobile: number
    trust: number
  }
  problems: TeaserProblem[] // exactly 3
  screenshotUrl: string
  finalUrl: string
  title: string | null
}

// ─── URL normalize + light SSRF guard ─────────────────────────
// Not a legal control — just hygiene so a server-side fetch can't be pointed
// at our own internal network.
export function normalizeUrl(raw: string): string | null {
  const trimmed = (raw || "").trim()
  if (!trimmed) return null
  let withScheme = trimmed
  if (!/^https?:\/\//i.test(withScheme)) withScheme = `https://${withScheme}`
  let u: URL
  try {
    u = new URL(withScheme)
  } catch {
    return null
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null
  const host = u.hostname.toLowerCase()
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    !host.includes(".")
  if (blocked) return null
  return u.toString()
}

// ─── Page signal extraction ───────────────────────────────────
interface PageSignals {
  finalUrl: string
  fetchOk: boolean
  status: number
  title: string | null
  metaDescription: string | null
  h1s: string[]
  h1Count: number
  buttonish: number // links/buttons with action-y copy
  hasViewportMeta: boolean
  imgCount: number
  wordCount: number
  isHttps: boolean
  hasForm: boolean
}

const ACTION_WORDS =
  /\b(get|start|try|buy|sign\s?up|signup|book|demo|free|download|subscribe|contact|join|launch|order|request|learn more)\b/i

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchSignals(url: string): Promise<PageSignals> {
  const base: PageSignals = {
    finalUrl: url,
    fetchOk: false,
    status: 0,
    title: null,
    metaDescription: null,
    h1s: [],
    h1Count: 0,
    buttonish: 0,
    hasViewportMeta: false,
    imgCount: 0,
    wordCount: 0,
    isHttps: url.startsWith("https://"),
    hasForm: false,
  }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        // Pretend to be a normal browser so we get the real marketing page.
        "User-Agent":
          "Mozilla/5.0 (compatible; KalitRoastBot/1.0; +https://kalit.ai/roast-landing)",
        Accept: "text/html,application/xhtml+xml",
      },
    })
    clearTimeout(timer)
    base.finalUrl = res.url || url
    base.status = res.status
    base.isHttps = base.finalUrl.startsWith("https://")
    if (!res.ok) return base
    const html = (await res.text()).slice(0, 600_000) // cap to ~600KB
    base.fetchOk = true

    const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleM) base.title = decode(titleM[1]).slice(0, 200)

    const descM = html.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
    )
    if (descM) base.metaDescription = decode(descM[1]).slice(0, 300)

    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
      .map((m) => decode(m[1].replace(/<[^>]+>/g, "")))
      .filter(Boolean)
    base.h1s = h1s.slice(0, 5)
    base.h1Count = h1s.length

    base.hasViewportMeta = /<meta[^>]+name=["']viewport["']/i.test(html)
    base.imgCount = (html.match(/<img\b/gi) || []).length
    base.hasForm = /<form\b/i.test(html)

    const ctas = [
      ...html.matchAll(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi),
    ]
      .map((m) => decode(m[1].replace(/<[^>]+>/g, "")))
      .filter((t) => t && t.length < 40 && ACTION_WORDS.test(t))
    base.buttonish = ctas.length

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
    base.wordCount = decode(text).split(/\s+/).filter(Boolean).length
  } catch {
    // network/timeout — return whatever we have; teaser still renders a
    // sensible "we couldn't fully load this" critique.
  }
  return base
}

// ─── Screenshot (pluggable provider) ──────────────────────────
// Default: thum.io (free, no key). Override with MAGNET_SCREENSHOT_BASE for a
// keyed provider later (the value is prefixed to the encoded target URL).
export function screenshotUrl(target: string): string {
  const base = process.env.MAGNET_SCREENSHOT_BASE
  if (base) return base.replace("{url}", encodeURIComponent(target))
  return `https://image.thum.io/get/width/1200/crop/1500/noanimate/${target}`
}

// ─── Groq critique ────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a blunt, expert landing-page conversion auditor for Kalit AI. Given structured signals about a landing page, you score it and name its 3 biggest problems.

Output ONLY valid JSON (no markdown fences, no prose) with this exact shape:
{
  "score": <integer 0-100, higher is better>,
  "breakdown": { "clarity": <0-100>, "design": <0-100>, "conversion": <0-100>, "mobile": <0-100>, "trust": <0-100> },
  "problems": [
    { "title": "<short, punchy, max 8 words>", "detail": "<one concrete sentence, specific to this page>", "severity": "high|medium|low" },
    { ...exactly 3 total, ordered most-to-least important... }
  ]
}

Rules:
- Be specific and honest, like a smart friend roasting their page. No generic filler.
- Ground problems in the signals (missing/weak H1, no clear CTA, no meta description, not mobile-ready, thin or bloated copy, no social proof/forms, http not https).
- "score" should roughly reflect the breakdown average. Weak hero or missing CTA should pull conversion down hard.
- Exactly 3 problems. Never more, never fewer.`

function buildUserMessage(s: PageSignals): string {
  return JSON.stringify(
    {
      url: s.finalUrl,
      loaded: s.fetchOk,
      httpStatus: s.status,
      title: s.title,
      metaDescription: s.metaDescription,
      h1Count: s.h1Count,
      h1Samples: s.h1s,
      callToActionCount: s.buttonish,
      mobileViewportTag: s.hasViewportMeta,
      imageCount: s.imgCount,
      wordCount: s.wordCount,
      https: s.isHttps,
      hasForm: s.hasForm,
    },
    null,
    0,
  )
}

function clamp(n: unknown, def = 50): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return def
  return Math.max(0, Math.min(100, v))
}

type CritiqueResult = Omit<TeaserResult, "screenshotUrl" | "finalUrl" | "title">

// Vision teaser: judge the actual screenshot, not just HTML signals. Reuses
// the Groq key with a multimodal Llama-4 model by default; point
// MAGNET_VISION_MODEL at a Claude endpoint later for higher fidelity.
const GROQ_VISION_MODEL =
  process.env.MAGNET_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct"

function normalizeCritique(parsed: Record<string, unknown>): CritiqueResult {
  const bd = (parsed.breakdown || {}) as Record<string, unknown>
  const breakdown = {
    clarity: clamp(bd.clarity),
    design: clamp(bd.design),
    conversion: clamp(bd.conversion),
    mobile: clamp(bd.mobile),
    trust: clamp(bd.trust),
  }
  let problems = Array.isArray(parsed.problems)
    ? (parsed.problems as Record<string, unknown>[]).map((p) => ({
        title: String(p.title || "Issue").slice(0, 80),
        detail: String(p.detail || "").slice(0, 240),
        severity: (["high", "medium", "low"].includes(String(p.severity))
          ? p.severity
          : "medium") as TeaserProblem["severity"],
      }))
    : []
  problems = problems.slice(0, 3)
  while (problems.length < 3) {
    problems.push({
      title: "Needs a stronger story",
      detail: "The page doesn't make its core value obvious above the fold.",
      severity: "medium",
    })
  }
  const score = clamp(
    parsed.score ??
      (breakdown.clarity + breakdown.design + breakdown.conversion + breakdown.mobile + breakdown.trust) / 5,
  )
  return { score, breakdown, problems }
}

async function callGroqJson(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY not configured")
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content?.trim() || ""
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  return JSON.parse(cleaned) as Record<string, unknown>
}

// ── Text critique (fast/cheap, judges HTML signals) ──
async function critique(signals: PageSignals): Promise<CritiqueResult> {
  const parsed = await callGroqJson({
    model: GROQ_MODEL,
    temperature: 0.4,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(signals) },
    ],
  })
  return normalizeCritique(parsed)
}

// ── Vision critique (judges the actual rendered screenshot) ──
const VISION_SYSTEM_PROMPT = `You are a blunt, expert landing-page conversion auditor for Kalit AI. You are shown a SCREENSHOT of a landing page. Judge what you can actually SEE.

Output ONLY valid JSON (no markdown, no prose) with this exact shape:
{
  "score": <integer 0-100, higher is better>,
  "breakdown": { "clarity": <0-100>, "design": <0-100>, "conversion": <0-100>, "mobile": <0-100>, "trust": <0-100> },
  "problems": [ { "title": "<max 8 words>", "detail": "<one concrete sentence about what you SEE>", "severity": "high|medium|low" } ]
}

Critique the visual reality: hero clarity (does the value land in 3 seconds?), CTA prominence/contrast/placement, visual hierarchy, clutter vs whitespace, trust cues (testimonials, logos, social proof), and how it likely reads on mobile. Reference real elements you see in the image. Exactly 3 problems, most important first.`

async function critiqueVision(signals: PageSignals, shotUrl: string): Promise<CritiqueResult> {
  const parsed = await callGroqJson({
    model: GROQ_VISION_MODEL,
    temperature: 0.4,
    max_tokens: 900,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: VISION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Critique this landing page screenshot. Context signals for facts not visible (https, meta, mobile tag): ${buildUserMessage(signals)}`,
          },
          { type: "image_url", image_url: { url: shotUrl } },
        ],
      },
    ],
  })
  return normalizeCritique(parsed)
}

export type TeaserMode = "text" | "vision"

// ─── Public entry point ───────────────────────────────────────
export async function runTeaser(
  normalizedUrl: string,
  mode: TeaserMode = "text",
): Promise<TeaserResult & { mode: TeaserMode }> {
  const signals = await fetchSignals(normalizedUrl)
  const shot = screenshotUrl(signals.finalUrl)
  let c: CritiqueResult
  let usedMode: TeaserMode = mode
  if (mode === "vision") {
    try {
      c = await critiqueVision(signals, shot)
    } catch (e) {
      // Never break the tool — fall back to the text teaser.
      console.error("[magnet/teaser] vision failed, falling back to text:", (e as Error).message)
      c = await critique(signals)
      usedMode = "text"
    }
  } else {
    c = await critique(signals)
  }
  return { ...c, screenshotUrl: shot, finalUrl: signals.finalUrl, title: signals.title, mode: usedMode }
}
