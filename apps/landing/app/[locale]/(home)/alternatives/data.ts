// Alternatives pages target a different search intent than /compare. They
// reuse the same capability rows but lead with "why someone leaves X" and
// "what they gain by switching."
import { COMPETITORS, type Competitor } from "../compare/data"

export interface Alternative {
  slug: string
  competitorName: string
  competitor: Competitor
  searchHook: string
  whyLeave: string[]
  whyKalit: string[]
}

const byName = (name: string): Competitor => {
  const found = COMPETITORS.find((c) => c.name === name)
  if (!found) throw new Error(`Unknown competitor: ${name}`)
  return found
}

export const ALTERNATIVES: Alternative[] = [
  {
    slug: "lovable-alternative",
    competitorName: "Lovable",
    competitor: byName("Lovable"),
    searchHook:
      "Looking for a Lovable alternative? Kalit AI starts where Lovable stops: a 21-agent build team, an autonomous pentest suite, and a workspace that goes from idea to launch.",
    whyLeave: [
      "Generated apps don't ship with any security review.",
      "Hard to keep iterating once the prompt-to-app excitement wears off.",
      "Limited support for keeping your own GitHub workflow.",
      "English-only experience for international audiences."
    ],
    whyKalit: [
      "Built-in Pentest produces a CVSS-scored, SARIF-exportable report.",
      "A 21-agent Taskforce builds, tests, ships and documents — not just generates.",
      "Bring or take any GitHub repo. Output is a real Dockerfile.",
      "16-language UI from day one — sell to global audiences without rebuilding."
    ]
  },
  {
    slug: "base44-alternative",
    competitorName: "Base44",
    competitor: byName("Base44"),
    searchHook:
      "Looking for a Base44 alternative? Kalit AI gives you the same \"prompt and ship\" speed but with real code, real Docker output, and a security report attached.",
    whyLeave: [
      "Vibe-coded apps are hard to take with you if you outgrow the platform.",
      "No security scan before you ship.",
      "Limited team workflow for agencies and product teams.",
      "Stack is hidden — debugging gets harder at scale."
    ],
    whyKalit: [
      "Real code in a real framework, exported to your GitHub.",
      "Every project is Dockerized — your infra team can take it from there.",
      "Pentest comes with the workspace, not as a third-party add-on.",
      "EU-based, founder-led, transparent build-in-public."
    ]
  },
  {
    slug: "bolt-alternative",
    competitorName: "Bolt",
    competitor: byName("Bolt"),
    searchHook:
      "Looking for a Bolt alternative when you need to graduate from prototype to launch? Kalit AI takes a prompt to a deployed, scanned, growth-ready product.",
    whyLeave: [
      "Bolt is excellent for prototyping, but launch tooling is thin.",
      "Migrating from prototype to a real codebase is a manual lift.",
      "No security tooling in the same workspace.",
      "No market research suite to validate before building."
    ],
    whyKalit: [
      "21-agent build team explicitly designed to ship, not just prototype.",
      "Free Search suite to validate before you build.",
      "Pentest scan included on the same workspace.",
      "Deploy to production from the same prompt."
    ]
  }
]

export const getAlternative = (slug: string) => ALTERNATIVES.find((a) => a.slug === slug)
