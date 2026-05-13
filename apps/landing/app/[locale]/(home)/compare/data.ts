// Capability values are language-neutral. Labels and prose are resolved at
// render time from lib/page-strings. The competitor list here is the
// single source of truth for routing and for the capability matrix shape.
export type CapValue = "yes" | "partial" | "no"

export interface CapRow {
  kalit: CapValue
  competitor: CapValue
}

export type CompetitorSlug = "kalit-vs-lovable" | "kalit-vs-base44" | "kalit-vs-emergent" | "kalit-vs-bolt"

export interface Competitor {
  slug: CompetitorSlug
  /** Matches the key under `compare.competitors` in EN_PAGE_STRINGS. */
  stringsKey: "lovable" | "base44" | "emergent" | "bolt"
  /** Display name, kept untranslated. */
  name: string
  /** Per-row capability marks. Order MUST match `compare.capabilities`. */
  capabilities: CapRow[]
}

// Helper: many rows are "yes/yes" for the AI-builder category and "yes/no" or
// "yes/partial" for the Kalit-specific differentiators.
const Y: CapValue = "yes"
const P: CapValue = "partial"
const N: CapValue = "no"

const ROW_DEFAULTS: CapRow[] = [
  { kalit: Y, competitor: Y }, // 0  full-stack generation
  { kalit: Y, competitor: Y }, // 1  deploy
  { kalit: Y, competitor: P }, // 2  import GitHub repo
  { kalit: Y, competitor: N }, // 3  multi-agent build team
  { kalit: Y, competitor: N }, // 4  Docker output
  { kalit: Y, competitor: N }, // 5  built-in pentest
  { kalit: Y, competitor: N }, // 6  compliance mapping
  { kalit: Y, competitor: N }, // 7  free research suite
  { kalit: Y, competitor: N }, // 8  16-language UI
  { kalit: Y, competitor: P }, // 9  public portfolio
  { kalit: N, competitor: Y }, // 10 "built by competitor only"
  { kalit: Y, competitor: P }  // 11 founder-led / EU
]

function override(base: CapRow[], patches: Partial<Record<number, Partial<CapRow>>>): CapRow[] {
  return base.map((row, i) => ({ ...row, ...(patches[i] ?? {}) }))
}

export const COMPETITORS: Competitor[] = [
  {
    slug: "kalit-vs-lovable",
    stringsKey: "lovable",
    name: "Lovable",
    capabilities: ROW_DEFAULTS
  },
  {
    slug: "kalit-vs-base44",
    stringsKey: "base44",
    name: "Base44",
    // Base44 hides the stack — no repo import, no Docker output.
    capabilities: override(ROW_DEFAULTS, { 2: { competitor: N }, 4: { competitor: N } })
  },
  {
    slug: "kalit-vs-emergent",
    stringsKey: "emergent",
    name: "Emergent",
    capabilities: ROW_DEFAULTS
  },
  {
    slug: "kalit-vs-bolt",
    stringsKey: "bolt",
    name: "Bolt",
    // Bolt is prototyping-first — Docker output absent, repo handoff limited.
    capabilities: override(ROW_DEFAULTS, { 4: { competitor: N }, 2: { competitor: P } })
  }
]

export const getCompetitor = (slug: string) => COMPETITORS.find((c) => c.slug === slug)
