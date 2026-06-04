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

export type FindingCategory =
  | "hero"
  | "cta"
  | "copy"
  | "trust"
  | "design"
  | "mobile"
  | "seo"
  | "performance"

export interface TeaserProblem {
  title: string
  /** Short "what's wrong" line. */
  detail: string
  severity: "high" | "medium" | "low"
  /** Which part of the page this is about. */
  category: FindingCategory
  /** Why it costs conversions (the stakes). */
  impact: string
  /** The concrete fix. */
  recommendation: string
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
  /** Punchy 1-2 sentence verdict, specific to this page. */
  verdict: string
  /** 4-6 prioritized findings, each with impact + recommendation. */
  problems: TeaserProblem[]
  /** 2-3 things the page already does well (balance = credibility). */
  wins: string[]
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
// Raw provider URL (thum.io default; override with MAGNET_SCREENSHOT_BASE for
// a keyed provider — e.g. ScreenshotOne/urlbox — using {url} as the encoded
// target placeholder). `wait/4` lets the page render before capture; without
// it, JS-heavy pages capture blank. `maxAge/12` serves a cached render for 12h.
export function providerShotUrl(target: string): string {
  const base = process.env.MAGNET_SCREENSHOT_BASE
  if (base) return base.replace("{url}", encodeURIComponent(target))
  // `viewportWidth/1280` forces a desktop viewport — without it thum.io
  // renders many sites at a tiny viewport and captures blank. `wait/5` lets
  // the page render; `maxAge/12` serves a cached render for 12h.
  return `https://image.thum.io/get/viewportWidth/1280/width/1200/crop/1400/wait/5/maxAge/12/noanimate/${target}`
}

// What the <img> points at: our proxy, which renders via the provider, rejects
// blank/failed captures (so the UI shows a clean fallback instead of a white
// box) and caches the result.
export function screenshotUrl(target: string): string {
  return `/api/magnet/shot?u=${encodeURIComponent(target)}`
}

// ─── Groq critique ────────────────────────────────────────────
const JSON_SHAPE = `{
  "score": <integer 0-100, higher is better>,
  "verdict": "<2 punchy sentences, specific to THIS page — name the single biggest reason it loses customers>",
  "breakdown": { "clarity": <0-100>, "design": <0-100>, "conversion": <0-100>, "mobile": <0-100>, "trust": <0-100> },
  "problems": [
    {
      "title": "<short, punchy, max 8 words>",
      "category": "hero|cta|copy|trust|design|mobile|seo|performance",
      "severity": "high|medium|low",
      "detail": "<one concrete sentence naming exactly what's wrong on this page>",
      "impact": "<one sentence on how this loses conversions / why a visitor bounces>",
      "recommendation": "<one specific, actionable fix — what to change>"
    }
  ],
  "wins": ["<short positive 1>", "<short positive 2>"]
}`

const RULES = `Rules:
- Be specific and honest, like an expensive CRO consultant — every line must be actionable, no generic filler.
- Return 4 to 6 problems, ordered most-to-least important (highest revenue impact first). Cover a spread of categories (hero, cta, copy, trust, design, mobile, seo) where relevant.
- Each problem MUST have a real "impact" (the cost) and a real "recommendation" (the fix). Never leave them vague.
- Return 2-3 "wins" — genuine things the page does well — so the audit is balanced and credible.
- "verdict" is the headline takeaway — punchy, specific, makes them want it fixed.
- "score" should reflect the breakdown; a weak hero or missing CTA pulls conversion down hard.`

const SYSTEM_PROMPT = `You are a blunt, expert landing-page conversion auditor for Kalit AI. Given structured signals about a landing page, produce a rich conversion audit.

Output ONLY valid JSON (no markdown fences, no prose) with this exact shape:
${JSON_SHAPE}

${RULES}
- You're working from extracted HTML signals (not the visual). Ground every point in those signals: hero/H1 strength, CTA presence, meta description, mobile-readiness, copy length, social proof/forms, https.`

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

// Models sometimes emit HTML entities (e.g. aujourd&#x27;hui) inside JSON
// strings. Decode them so the UI shows real punctuation.
function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
}
const dec = (v: unknown, max: number) => decodeEntities(String(v || "")).slice(0, max)

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
  const CATS: FindingCategory[] = ["hero", "cta", "copy", "trust", "design", "mobile", "seo", "performance"]
  let problems: TeaserProblem[] = Array.isArray(parsed.problems)
    ? (parsed.problems as Record<string, unknown>[]).map((p) => ({
        title: dec(p.title || "Issue", 80),
        detail: dec(p.detail, 240),
        severity: (["high", "medium", "low"].includes(String(p.severity))
          ? p.severity
          : "medium") as TeaserProblem["severity"],
        category: (CATS.includes(String(p.category) as FindingCategory)
          ? p.category
          : "design") as FindingCategory,
        impact: dec(p.impact, 240),
        recommendation: dec(p.recommendation, 280),
      }))
    : []
  problems = problems.slice(0, 6)
  while (problems.length < 4) {
    problems.push({
      title: "Weak value proposition",
      detail: "The page doesn't make its core value obvious above the fold.",
      severity: "medium",
      category: "hero",
      impact: "Visitors who can't grasp the offer in a few seconds bounce before scrolling.",
      recommendation: "Lead with a benefit-driven headline and a one-line subhead that states who it's for and what they get.",
    })
  }

  const wins = Array.isArray(parsed.wins)
    ? (parsed.wins as unknown[]).map((w) => dec(w, 120)).filter(Boolean).slice(0, 3)
    : []

  const score = clamp(
    parsed.score ??
      (breakdown.clarity + breakdown.design + breakdown.conversion + breakdown.mobile + breakdown.trust) / 5,
  )
  const verdict = dec(parsed.verdict, 300)
  return { score, breakdown, verdict, problems, wins }
}

function parseJsonLoose(raw: string): Record<string, unknown> {
  const cleaned = (raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  return JSON.parse(cleaned) as Record<string, unknown>
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
  return parseJsonLoose(data.choices?.[0]?.message?.content || "")
}

// ── Anthropic (Claude) provider — sharper conversion feedback than llama. ──
// Switchable via MAGNET_LLM_PROVIDER; defaults to "anthropic" when an
// ANTHROPIC_API_KEY is present, else falls back to Groq. Models overridable
// via MAGNET_LLM_MODEL_ANTHROPIC / MAGNET_VISION_MODEL_ANTHROPIC.
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_TEXT_MODEL = process.env.MAGNET_LLM_MODEL_ANTHROPIC || "claude-sonnet-4-6"
const ANTHROPIC_VISION_MODEL = process.env.MAGNET_VISION_MODEL_ANTHROPIC || "claude-sonnet-4-6"
const LLM_PROVIDER = (
  process.env.MAGNET_LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "anthropic" : "groq")
).toLowerCase()

// Anthropic Messages API. `system` is top-level; `content` is either a plain
// string or Claude content blocks (text + {type:"image", source:{base64}}).
async function callAnthropicJson(
  system: string,
  content: string | Record<string, unknown>[],
  model: string,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured")
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.4,
      system,
      messages: [{ role: "user", content }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const raw = Array.isArray(data.content)
    ? data.content.filter((b: { type?: string }) => b?.type === "text").map((b: { text?: string }) => b.text || "").join("")
    : ""
  return parseJsonLoose(raw)
}

// Split a `data:<mime>;base64,<data>` URL into Claude's image-source parts.
function dataUrlToAnthropicImage(dataUrl: string): Record<string, unknown> {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"]
  const mt = m?.[1] || "image/png"
  return {
    type: "image",
    source: { type: "base64", media_type: allowed.includes(mt) ? mt : "image/png", data: m?.[2] || "" },
  }
}

// ── Text critique (fast/cheap, judges HTML signals) ──
async function critique(signals: PageSignals): Promise<CritiqueResult> {
  const userMsg = buildUserMessage(signals)
  const parsed =
    LLM_PROVIDER === "anthropic"
      ? await callAnthropicJson(SYSTEM_PROMPT, userMsg, ANTHROPIC_TEXT_MODEL)
      : await callGroqJson({
          model: GROQ_MODEL,
          temperature: 0.4,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
        })
  return normalizeCritique(parsed)
}

// ── Vision critique (judges the actual rendered screenshot) ──
const VISION_SYSTEM_PROMPT = `You are a blunt, expert landing-page conversion auditor for Kalit AI. You are shown a SCREENSHOT of a landing page. Judge what you can actually SEE and produce a rich conversion audit.

Output ONLY valid JSON (no markdown, no prose) with this exact shape:
${JSON_SHAPE}

${RULES}
- Judge the VISUAL reality you see: does the hero communicate the value in 3 seconds? Is the primary CTA prominent (contrast, size, placement, above the fold)? Visual hierarchy, clutter vs whitespace, trust cues (testimonials, logos, social proof, reviews), and how it likely reads on mobile. Reference real elements you actually see in the image.`

// Fetch the screenshot server-side and inline it as a base64 data URL, so the
// vision model never has to fetch the (slow, on-demand) thum.io URL itself —
// that round-trip times out on the provider side. We absorb the render latency
// here, with a generous timeout; on failure the caller falls back to text.
async function fetchImageAsDataUrl(url: string): Promise<string> {
  // Cold renders (wait/5 + first capture) can take a while, so be patient and
  // retry once — vision is the default mode now, so a flaky fetch would
  // silently degrade every teaser to text.
  const attempt = async (timeoutMs: number): Promise<string | null> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.byteLength < 12000) return null // blank/placeholder
      const ct = res.headers.get("content-type") || "image/png"
      return `data:${ct};base64,${buf.toString("base64")}`
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  }
  let out = await attempt(22000)
  if (!out) {
    await new Promise((r) => setTimeout(r, 3000))
    out = await attempt(22000)
  }
  if (!out) throw new Error("screenshot not ready")
  return out
}

async function critiqueVision(signals: PageSignals, shotUrl: string): Promise<CritiqueResult> {
  const dataUrl = await fetchImageAsDataUrl(shotUrl)
  const textPart = `Critique this landing page screenshot. Context signals for facts not visible (https, meta, mobile tag): ${buildUserMessage(signals)}`
  const parsed =
    LLM_PROVIDER === "anthropic"
      ? await callAnthropicJson(
          VISION_SYSTEM_PROMPT,
          [{ type: "text", text: textPart }, dataUrlToAnthropicImage(dataUrl)],
          ANTHROPIC_VISION_MODEL,
        )
      : await callGroqJson({
          model: GROQ_VISION_MODEL,
          temperature: 0.4,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: VISION_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: textPart },
                { type: "image_url", image_url: { url: dataUrl } },
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
  // Kick off the screenshot render in parallel with signal extraction so the
  // (slow, cold) render overlaps with fetchSignals + the LLM call. For most
  // sites the normalized URL == the final URL, so this warms the right cache.
  void fetch(providerShotUrl(normalizedUrl)).catch(() => {})
  const signals = await fetchSignals(normalizedUrl)
  const shot = screenshotUrl(signals.finalUrl) // proxy URL for the <img>
  const providerShot = providerShotUrl(signals.finalUrl) // raw provider, for vision + warm
  let c: CritiqueResult
  let usedMode: TeaserMode = mode
  if (mode === "vision") {
    try {
      c = await critiqueVision(signals, providerShot)
    } catch (e) {
      // Never break the tool — fall back to the text teaser.
      console.error("[magnet/teaser] vision failed, falling back to text:", (e as Error).message)
      c = await critique(signals)
      usedMode = "text"
    }
  } else {
    // Warm the provider render in the background so it overlaps with the LLM
    // call and the proxy hits a cached image instead of a cold render.
    void fetch(providerShot).catch(() => {})
    c = await critique(signals)
  }
  return { ...c, screenshotUrl: shot, finalUrl: signals.finalUrl, title: signals.title, mode: usedMode }
}
