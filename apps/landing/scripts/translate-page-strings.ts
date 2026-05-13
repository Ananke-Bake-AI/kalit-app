/**
 * AI fan-out for marketing page strings via the Anthropic Messages API.
 *
 * Why Anthropic and not Groq: Groq's free-tier TPM (12k for 70b, 6k for 8b)
 * kept the run pinned at ~30–40 minutes per locale, which is unworkable for
 * 15 locales. Claude haiku has high enough TPM that we can run every locale
 * in parallel and finish in single-digit minutes.
 *
 * Run: pnpm tsx scripts/translate-page-strings.ts
 * Filter: pnpm tsx scripts/translate-page-strings.ts fr es
 */
import fs from "node:fs/promises"
import path from "node:path"
import { EN_PAGE_STRINGS } from "../lib/page-strings/en"

const dotenv = require("dotenv") as { config: (o: { path: string }) => void }
dotenv.config({ path: path.join(__dirname, "..", ".env") })
// Fallback: the kalit-landing .env doesn't have ANTHROPIC_API_KEY; pull it
// from the claude-supervisor project instead (the user has authorized that).
if (!process.env.ANTHROPIC_API_KEY) {
  // __dirname is apps/landing/scripts → kalit-landing is 3 up, kalitai is 4 up.
  dotenv.config({ path: path.join(__dirname, "..", "..", "..", "..", "claude-supervisor", ".env") })
}

// Provider strategy:
//   - Anthropic Claude is preferred for speed (high TPM, parallel-friendly),
//     but the project's ANTHROPIC_API_KEY has been out of credit at times.
//   - Groq llama-3.3-70b is the fallback. It's free-tier-throttled to 12k
//     TPM, so we batch carefully and run one locale at a time.
// The choice is made at startup from which key is present.
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const GROQ_MODEL = "llama-3.3-70b-versatile"
const BATCH_SIZE = 40 // Generous — drops automatically on 413s.
const PARALLEL_LOCALES_ANTHROPIC = 8
const PARALLEL_LOCALES_GROQ = 1 // TPM is tight, no point parallelising.

const LOCALES: { code: string; name: string }[] = [
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "pl", name: "Polish" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "sv", name: "Swedish" }
]

// ─── Flatten / nest helpers ───────────────────────────────

type FlatMap = Record<string, string>

function flatten(value: unknown, prefix = ""): FlatMap {
  const out: FlatMap = {}
  if (typeof value === "string") {
    out[prefix] = value
    return out
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => Object.assign(out, flatten(v, `${prefix}[${i}]`)))
    return out
  }
  if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k
      Object.assign(out, flatten(v, next))
    }
    return out
  }
  return out
}

function setPath(target: Record<string, unknown>, dottedPath: string, value: string) {
  const parts: (string | number)[] = []
  const tokenRe = /([^.[\]]+)|\[(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(dottedPath)) !== null) {
    if (m[1] !== undefined) parts.push(m[1])
    else if (m[2] !== undefined) parts.push(parseInt(m[2], 10))
  }
  let cur: Record<string, unknown> | unknown[] = target
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    const nextIsIndex = typeof parts[i + 1] === "number"
    const curObj = cur as Record<string | number, unknown>
    if (curObj[p] === undefined) curObj[p] = nextIsIndex ? [] : {}
    cur = curObj[p] as Record<string, unknown> | unknown[]
  }
  ;(cur as Record<string | number, unknown>)[parts[parts.length - 1]] = value
}

function nest(flat: FlatMap): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(flat)) setPath(out, k, v)
  return out
}

// ─── Anthropic call ──────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface AnthropicResp {
  content?: { type: string; text?: string }[]
  error?: { type: string; message: string }
}

async function callAnthropic(system: string, user: string, apiKey: string): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system,
        messages: [{ role: "user", content: user }]
      })
    })

    if (res.status === 429 || res.status === 529) {
      const retryAfter = res.headers.get("retry-after")
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * (attempt + 1)
      await sleep(waitMs)
      continue
    }

    if (!res.ok) {
      const txt = await res.text()
      console.error(`Anthropic ${res.status}:`, txt.slice(0, 400))
      return null
    }

    const data = (await res.json()) as AnthropicResp
    const block = data.content?.find((b) => b.type === "text")
    return block?.text?.trim() ?? null
  }
  return null
}

function parseGroqRetryAfter(body: string): number {
  const m = /try again in (\d+(?:\.\d+)?)s/i.exec(body)
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500
  return 5000
}

async function callGroq(system: string, user: string, apiKey: string): Promise<string | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })
    })

    if (res.status === 429 || res.status === 413) {
      const txt = await res.text()
      const waitMs = parseGroqRetryAfter(txt)
      await sleep(waitMs)
      continue
    }

    if (!res.ok) {
      const txt = await res.text()
      console.error(`Groq ${res.status}:`, txt.slice(0, 400))
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  }
  return null
}

function safeParse(raw: string): Record<string, string> | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    const obj = JSON.parse(cleaned)
    if (typeof obj !== "object" || obj === null) return null
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") out[k] = v
    }
    return out
  } catch (e) {
    console.error("JSON parse failed:", e, "\nFirst 200:", cleaned.slice(0, 200))
    return null
  }
}

const SYSTEM = (langName: string, langCode: string) =>
  `You are a senior marketing translator for Kalit AI, a developer-marketing product. Translate the JSON object's values from English to ${langName} (${langCode}).

RULES:
- Translate every value naturally — never literal/word-by-word.
- Output a JSON object with the SAME KEYS as the input, only the values translated.
- Keep these untranslated wherever they appear inside a value: Kalit, Kalit AI, Flow, Pentest, Search, Marketing, Taskforce, Studio, OWASP, CWE, PCI DSS, NIST 800-53, ISO 27001, SOC 2, CVSS, SARIF, Anthropic, Claude, OpenAI, Neon, MongoDB Atlas, Stripe, Resend, Vercel, Cloudflare, Porkbun, GitHub, Lovable, Base44, Emergent, Bolt, Replit, Cursor, Merkle Tech Labs LTD., security@kalit.ai, abuse@kalit.ai, contact@kalit.ai, status.kalit.ai, kalit.ai, .env, /admin, the placeholder {name}, JWT, OAuth, WAF, SaaS, DPA, Argon2id, TLS, HTTPS, WSS, IDOR, CSWSH, IP, DNS, URL, HTTP, CDN, MVP, CRM, SQLi, XSS, SSRF.
- Preserve number+symbol literals like "$29", "$99 / month", "3 credits / month", "12+", "30–40 minutes" — translate only surrounding text.
- Keep capitalisation natural for the target language. Don't shout.
- Use the technical jargon native speakers use in that language.
- Return ONLY raw JSON. No markdown fences, no explanation, no extra keys.`

type Provider = "anthropic" | "groq"

async function translateBatch(
  batch: FlatMap,
  langName: string,
  langCode: string,
  provider: Provider,
  apiKey: string
): Promise<FlatMap | null> {
  const user = `Translate the values of the following JSON to ${langName}. Return ONLY raw JSON with the same keys:\n\n${JSON.stringify(batch, null, 2)}`
  const raw =
    provider === "anthropic"
      ? await callAnthropic(SYSTEM(langName, langCode), user, apiKey)
      : await callGroq(SYSTEM(langName, langCode), user, apiKey)
  if (!raw) return null
  return safeParse(raw)
}

async function translateLocale(
  lang: { code: string; name: string },
  provider: Provider,
  apiKey: string,
  label: string
): Promise<void> {
  const flat = flatten(EN_PAGE_STRINGS)
  const keys = Object.keys(flat)
  const result: FlatMap = {}
  let failed = 0
  // On Groq we batch smaller to stay under TPM.
  const batchSize = provider === "anthropic" ? BATCH_SIZE : 12

  for (let i = 0; i < keys.length; i += batchSize) {
    const slice = keys.slice(i, i + batchSize)
    const batch: FlatMap = {}
    for (const k of slice) batch[k] = flat[k]

    let translated = await translateBatch(batch, lang.name, lang.code, provider, apiKey)
    if (!translated) {
      await sleep(1500)
      translated = await translateBatch(batch, lang.name, lang.code, provider, apiKey)
    }
    if (translated) {
      for (const k of slice) {
        if (typeof translated[k] === "string" && translated[k].length > 0) {
          result[k] = translated[k]
        }
      }
    } else {
      failed += slice.length
    }
  }

  const nested = nest(result)
  const out = path.join(__dirname, "..", "lib", "page-strings", `${lang.code}.json`)
  await fs.writeFile(out, JSON.stringify(nested, null, 2) + "\n", "utf8")
  const status = failed === 0 ? "ok" : `ok (${failed} keys failed)`
  console.log(`${label} ${lang.code} (${lang.name}): ${status}`)
}

async function main() {
  // Prefer Anthropic when there's a key + credit; fall back to Groq.
  let provider: Provider = "anthropic"
  let apiKey = process.env.ANTHROPIC_API_KEY
  let model = ANTHROPIC_MODEL
  let parallel = PARALLEL_LOCALES_ANTHROPIC

  if (!apiKey) {
    provider = "groq"
    apiKey = process.env.GROQ_API_KEY
    model = GROQ_MODEL
    parallel = PARALLEL_LOCALES_GROQ
  }

  // Allow forcing Groq via env (useful when Anthropic key is out of credit).
  if (process.env.TRANSLATE_PROVIDER === "groq") {
    provider = "groq"
    apiKey = process.env.GROQ_API_KEY
    model = GROQ_MODEL
    parallel = PARALLEL_LOCALES_GROQ
  }

  if (!apiKey) {
    console.error("No translation API key available. Set ANTHROPIC_API_KEY or GROQ_API_KEY in .env.")
    process.exit(1)
  }

  const requested = process.argv.slice(2)
  const targets = requested.length ? LOCALES.filter((l) => requested.includes(l.code)) : LOCALES

  console.log(`Provider: ${provider} (${model}). Translating ${targets.length} locale(s), ${parallel} in parallel.`)
  const t0 = Date.now()

  const queue = [...targets]
  let nextIdx = 0
  const workers: Promise<void>[] = []
  for (let w = 0; w < parallel; w++) {
    workers.push(
      (async () => {
        while (true) {
          const next = queue.shift()
          if (!next) return
          const idx = ++nextIdx
          const label = `[${idx}/${targets.length}]`
          await translateLocale(next, provider, apiKey!, label)
        }
      })()
    )
  }
  await Promise.all(workers)

  console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
