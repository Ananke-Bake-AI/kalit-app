/**
 * Server-side client for Kalit Search (kalit-research, search.kalit.ai).
 *
 * The idea-finder magnet pulls scored, business-ready startup ideas from here.
 * Search gates its API behind SSO for browsers, so we authenticate
 * server-to-server with a shared secret (the same KALIT_SEARCH_API_KEY the
 * broker's SearchClient uses) — see kalit-research's middleware Bearer bypass.
 *
 *   KALIT_SEARCH_URL       server-side base for API calls (e.g. http://localhost:3003)
 *   KALIT_SEARCH_API_KEY   shared secret presented as `Authorization: Bearer …`
 *   NEXT_PUBLIC_SEARCH_URL public base used for browser links to the one-pager
 */

const apiBase = () =>
  (process.env.KALIT_SEARCH_URL || process.env.SEARCH_URL || "https://search.kalit.ai").replace(/\/+$/, "")
const apiKey = () => process.env.KALIT_SEARCH_API_KEY || process.env.SEARCH_API_KEY || ""
const publicBase = () =>
  (process.env.NEXT_PUBLIC_SEARCH_URL || "https://search.kalit.ai").replace(/\/+$/, "")

/** Public link to a project's full one-pager on search.kalit.ai. */
export function searchProjectUrl(id: string): string {
  return `${publicBase()}/projects/${encodeURIComponent(id)}`
}

// ── Raw project shape (subset of kalit-research's Project we actually use) ──
// Many fields arrive as JSON-encoded strings — parse with the helpers below.
export interface SearchProject {
  id: string
  slug: string
  name: string
  description: string
  category: string
  targetAudience: string
  marketSize: string
  uniqueAngle: string
  whyNow: string
  competitors: string
  monetizationType: string
  revenueModel: string
  pricingStrategy: string | null
  estimatedMRR: string | null
  complexity: string
  techStack: string
  timeToMVP: string
  kalitSuite: string
  sourceUrls: string
  trendKeywords: string
  mvpDefinition: string
  opportunityType: string
  opportunityScore: number
  trendSignalScore: number
  marketValueScore: number
  revenueReadinessScore: number
  kalitMvpFitScore: number
  signalStrength: number
  overallScore: number
}

export interface SearchProjectsInput {
  query?: string
  category?: string
  opportunityType?: string
  suite?: string
  sort?: string
  order?: "asc" | "desc"
  page?: number
  limit?: number
  minScore?: number
  minSignal?: number
  minKalitFit?: number
}

async function searchFetch(path: string): Promise<unknown> {
  const base = apiBase()
  if (!base) throw new Error("KALIT_SEARCH_URL not configured")
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(base + path, {
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        ...(apiKey() ? { Authorization: `Bearer ${apiKey()}` } : {}),
      },
      // Never cache — ideas refresh continuously on the search side.
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`search ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

function buildQuery(input: SearchProjectsInput): string {
  const q = new URLSearchParams()
  const set = (k: string, v?: string) => {
    const t = (v || "").trim()
    if (t && t !== "all") q.set(k, t)
  }
  const setN = (k: string, v?: number) => {
    if (typeof v === "number" && v > 0) q.set(k, String(v))
  }
  set("search", input.query)
  set("category", input.category)
  set("opportunityType", input.opportunityType)
  set("suite", input.suite)
  set("sort", input.sort)
  set("order", input.order)
  setN("page", input.page)
  setN("limit", input.limit)
  setN("minScore", input.minScore)
  setN("minSignal", input.minSignal)
  setN("minKalitFit", input.minKalitFit)
  const s = q.toString()
  return s ? `?${s}` : ""
}

export async function searchProjects(
  input: SearchProjectsInput,
): Promise<{ projects: SearchProject[]; total: number }> {
  const data = (await searchFetch(`/api/projects${buildQuery(input)}`)) as {
    projects?: SearchProject[]
    pagination?: { total?: number }
  }
  const projects = Array.isArray(data?.projects) ? data.projects : []
  // `total` is how many ideas match this query across the whole DB (not just
  // this page) — the breadth signal the scout uses to weight keyword specificity.
  const total = typeof data?.pagination?.total === "number" ? data.pagination.total : projects.length
  return { projects, total }
}

export async function getSearchProject(id: string): Promise<SearchProject | null> {
  try {
    const data = (await searchFetch(`/api/project/${encodeURIComponent(id)}`)) as SearchProject & {
      error?: string
    }
    if (!data || data.error) return null
    return data
  } catch {
    return null
  }
}

// Strip em/en dashes (the "AI-written" tell) from any displayed string.
export function dedash(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ", ")
}

// ── JSON-field parsing (research stores several fields as JSON strings) ──
export function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(stringifyItem).filter(Boolean)
  if (typeof raw !== "string" || !raw.trim()) return []
  try {
    const v = JSON.parse(raw)
    if (Array.isArray(v)) return v.map(stringifyItem).filter(Boolean)
    if (v && typeof v === "object") return Object.values(v).map(stringifyItem).filter(Boolean)
  } catch {
    // Fall back to comma/newline split for plain-text fields.
    return raw
      .split(/[\n,]+/)
      .map((s) => dedash(s.trim()))
      .filter(Boolean)
  }
  return []
}

function stringifyItem(item: unknown): string {
  if (typeof item === "string") return dedash(item.trim())
  if (item && typeof item === "object") {
    const o = item as Record<string, unknown>
    const name = o.name || o.title || o.label || o.competitor || o.product
    if (typeof name === "string") return dedash(name.trim())
  }
  return ""
}

export function parseObject<T = Record<string, unknown>>(raw: unknown): T | null {
  if (raw && typeof raw === "object") return raw as T
  if (typeof raw !== "string" || !raw.trim()) return null
  try {
    const v = JSON.parse(raw)
    return v && typeof v === "object" ? (v as T) : null
  } catch {
    return null
  }
}
