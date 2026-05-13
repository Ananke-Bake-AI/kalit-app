import { COMPETITORS, type Competitor } from "../compare/data"

export interface Alternative {
  slug: string
  /** Key in EN_PAGE_STRINGS.alternatives.competitors */
  stringsKey: "lovable" | "base44" | "bolt"
  /** Display name, kept untranslated. */
  competitorName: string
  competitor: Competitor
}

const byName = (name: string): Competitor => {
  const found = COMPETITORS.find((c) => c.name === name)
  if (!found) throw new Error(`Unknown competitor: ${name}`)
  return found
}

export const ALTERNATIVES: Alternative[] = [
  { slug: "lovable-alternative", stringsKey: "lovable", competitorName: "Lovable", competitor: byName("Lovable") },
  { slug: "base44-alternative", stringsKey: "base44", competitorName: "Base44", competitor: byName("Base44") },
  { slug: "bolt-alternative", stringsKey: "bolt", competitorName: "Bolt", competitor: byName("Bolt") }
]

export const getAlternative = (slug: string) => ALTERNATIVES.find((a) => a.slug === slug)
