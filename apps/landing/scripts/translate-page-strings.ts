/**
 * AI fan-out for marketing page strings. Reads lib/page-strings/en.ts as the
 * source of truth and translates the whole structure to every other locale via
 * Groq, writing one JSON file per locale into lib/page-strings/.
 *
 * Run: pnpm tsx scripts/translate-page-strings.ts
 *
 * Optional locale filter: pnpm tsx scripts/translate-page-strings.ts fr es
 *
 * Strategy: flatten the EN object into path-keyed strings, batch them in
 * small chunks (Groq free-tier TPM is tight), translate each batch, then
 * re-nest the result. Each request stays well under the model's TPM ceiling
 * so we don't get throttled.
 */
import fs from "node:fs/promises"
import path from "node:path"
import { EN_PAGE_STRINGS } from "../lib/page-strings/en"

// dotenv is bundled with prisma — require dynamically so we don't add a
// dev dependency just for this script. The `as` here is just to silence TS.
const dotenv = require("dotenv") as { config: (o: { path: string }) => void }
dotenv.config({ path: path.join(__dirname, "..", ".env") })

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "llama-3.3-70b-versatile"
const TARGET_TPM = 10000 // Stay under the free-tier 12k TPM ceiling.
const BATCH_SIZE = 12 // Keys per request — keeps each call < ~2.5k tokens.

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
    value.forEach((v, i) => {
      Object.assign(out, flatten(v, `${prefix}[${i}]`))
    })
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
  // Path syntax: "pricing.faqs[0].q" → ["pricing", "faqs", 0, "q"]
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

// ─── Groq call ────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryAfter(body: string): number {
  const m = /try again in (\d+(?:\.\d+)?)s/i.exec(body)
  if (m) return Math.ceil(parseFloat(m[1]) * 1000) + 500
  return 5000
}

function estimateTokens(text: string): number {
  // Crude — ~4 chars per token. Good enough for throttling.
  return Math.ceil(text.length / 4)
}

let tpmWindow: { startedAt: number; tokens: number } = { startedAt: Date.now(), tokens: 0 }

async function throttle(estimatedReqTokens: number) {
  const now = Date.now()
  const elapsed = now - tpmWindow.startedAt
  if (elapsed >= 60_000) {
    tpmWindow = { startedAt: now, tokens: 0 }
    return
  }
  if (tpmWindow.tokens + estimatedReqTokens > TARGET_TPM) {
    const wait = 60_000 - elapsed + 200
    process.stdout.write(`(throttle ${(wait / 1000).toFixed(0)}s) `)
    await sleep(wait)
    tpmWindow = { startedAt: Date.now(), tokens: 0 }
  }
}

async function callGroq(messages: { role: string; content: string }[], apiKey: string): Promise<string | null> {
  const promptSize = messages.reduce((s, m) => s + estimateTokens(m.content), 0)
  // Reserve ~2x for output.
  const estimated = promptSize + 1500

  for (let attempt = 0; attempt < 6; attempt++) {
    await throttle(estimated)

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      })
    })

    if (res.status === 429 || res.status === 413) {
      const txt = await res.text()
      const waitMs = parseRetryAfter(txt)
      process.stdout.write(`(${res.status}, ${(waitMs / 1000).toFixed(1)}s) `)
      await sleep(waitMs)
      // After a long wait, the TPM window has rolled over.
      tpmWindow = { startedAt: Date.now(), tokens: 0 }
      continue
    }

    if (!res.ok) {
      const txt = await res.text()
      console.error(`Groq ${res.status}:`, txt.slice(0, 400))
      return null
    }

    const data = await res.json()
    tpmWindow.tokens += data.usage?.total_tokens ?? estimated
    const raw = data.choices?.[0]?.message?.content?.trim()
    return raw || null
  }
  return null
}

function safeParse(raw: string): Record<string, string> | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  try {
    const obj = JSON.parse(cleaned)
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
  `You are a professional marketing translator for Kalit AI, a developer-marketing product. Translate the JSON object's values from English to ${langName} (${langCode}).

RULES:
- Translate every value naturally — never literal/word-by-word.
- Output a JSON object with the SAME KEYS as the input, only the values translated.
- Keep these untranslated wherever they appear inside a value: Kalit, Kalit AI, Flow, Pentest, Search, Marketing, Taskforce, Studio, OWASP, CWE, PCI DSS, NIST 800-53, ISO 27001, SOC 2, CVSS, SARIF, Anthropic, Claude, OpenAI, Neon, MongoDB Atlas, Stripe, Resend, Vercel, Cloudflare, Porkbun, GitHub, Lovable, Base44, Emergent, Bolt, Replit, Cursor, Merkle Tech Labs LTD., security@kalit.ai, abuse@kalit.ai, contact@kalit.ai, status.kalit.ai, kalit.ai, .env, /admin, the placeholder {name}, JWT, OAuth, WAF, SaaS, DPA, Argon2id, TLS, HTTPS, WSS, IDOR, CSWSH, IP, DNS, URL, HTTP, CDN, IP, MVP, CRM.
- Preserve number+symbol literals like "$29", "$99 / month", "3 credits / month", "12+", "30–40 minutes" — translate only surrounding text.
- Keep capitalisation natural for the target language. Don't shout.
- Use the technical jargon native speakers use in that language. For RTL languages, write naturally — the UI handles direction.
- Return ONLY raw JSON. No markdown fences, no explanation, no extra keys.`

async function translateBatch(
  batch: FlatMap,
  langName: string,
  langCode: string,
  apiKey: string
): Promise<FlatMap | null> {
  const system = SYSTEM(langName, langCode)
  const user = `Translate the values of the following JSON to ${langName}:\n\n${JSON.stringify(batch, null, 2)}`
  const raw = await callGroq(
    [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    apiKey
  )
  if (!raw) return null
  return safeParse(raw)
}

async function translateAll(langCode: string, langName: string, apiKey: string): Promise<Record<string, unknown>> {
  const flat = flatten(EN_PAGE_STRINGS)
  const keys = Object.keys(flat)
  const result: FlatMap = {}

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const slice = keys.slice(i, i + BATCH_SIZE)
    const batch: FlatMap = {}
    for (const k of slice) batch[k] = flat[k]

    process.stdout.write(`  ${i + 1}–${Math.min(i + BATCH_SIZE, keys.length)}/${keys.length} `)
    let translated = await translateBatch(batch, langName, langCode, apiKey)
    if (!translated) {
      // One retry from scratch.
      await sleep(2000)
      translated = await translateBatch(batch, langName, langCode, apiKey)
    }
    if (translated) {
      for (const k of slice) {
        if (typeof translated[k] === "string" && translated[k].length > 0) {
          result[k] = translated[k]
        }
      }
      process.stdout.write(`ok\n`)
    } else {
      process.stdout.write(`FAILED, falling back to EN for this batch\n`)
    }
  }

  return nest(result)
}

async function main() {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error("GROQ_API_KEY missing. Add it to .env first.")
    process.exit(1)
  }

  const requested = process.argv.slice(2)
  const targets = requested.length ? LOCALES.filter((l) => requested.includes(l.code)) : LOCALES

  for (const lang of targets) {
    console.log(`\n── ${lang.code} (${lang.name}) ──`)
    const translated = await translateAll(lang.code, lang.name, apiKey)
    const out = path.join(__dirname, "..", "lib", "page-strings", `${lang.code}.json`)
    await fs.writeFile(out, JSON.stringify(translated, null, 2) + "\n", "utf8")
    console.log(`✓ wrote ${out}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
