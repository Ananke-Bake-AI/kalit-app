// Capability rows shared between /compare/[slug] and /alternatives/[slug].
// "yes" / "partial" / "no" — partial means "available with caveats."
export type CapValue = "yes" | "partial" | "no"

export interface CapRow {
  label: string
  kalit: CapValue
  competitor: CapValue
  note?: string
}

export interface Competitor {
  slug: string
  name: string
  oneLiner: string
  competitorOneLiner: string
  intro: string
  capabilities: CapRow[]
  whenToPick: string[]
  whenToPickKalit: string[]
}

const FLOW_ROWS = (compName: string, partials: Record<string, CapValue> = {}): CapRow[] => [
  { label: "Generate full-stack web apps from a prompt", kalit: "yes", competitor: partials["fullstack"] ?? "yes" },
  { label: "Deploy to production from the workspace", kalit: "yes", competitor: partials["deploy"] ?? "yes" },
  { label: "Import existing GitHub repo to keep iterating", kalit: "yes", competitor: partials["repo"] ?? "partial" },
  { label: "Multi-agent build team (20+ specialist agents)", kalit: "yes", competitor: partials["agents"] ?? "no" },
  { label: "Per-project Docker container ships with the build", kalit: "yes", competitor: partials["docker"] ?? "no" },
  { label: "Built-in autonomous pentest with OWASP / SARIF export", kalit: "yes", competitor: "no" },
  { label: `Compliance mapping (OWASP, CWE, PCI DSS, NIST, ISO 27001, SOC 2)`, kalit: "yes", competitor: "no" },
  { label: "Free market-research suite (Search)", kalit: "yes", competitor: partials["research"] ?? "no" },
  { label: "16-language localized UI", kalit: "yes", competitor: partials["i18n"] ?? "no" },
  { label: "Public portfolio of real projects (/discover)", kalit: "yes", competitor: partials["portfolio"] ?? "partial" },
  { label: `Built by ${compName}'s team for ${compName} only`, kalit: "no", competitor: "yes", note: "Specialized vendor narrative" },
  { label: "Founder-led, EU-based, transparent build-in-public", kalit: "yes", competitor: partials["transparency"] ?? "partial" }
]

export const COMPETITORS: Competitor[] = [
  {
    slug: "kalit-vs-lovable",
    name: "Lovable",
    oneLiner: "Lovable is one of the strongest AI app builders for getting a working web app from a prompt. Kalit takes the same starting point and adds Pentest, Search and a 21-agent build team.",
    competitorOneLiner: "Lovable — \"AI fullstack engineer.\" Strong prompt-to-app with a large community.",
    intro:
      "Lovable is a great choice if you only need to build the app itself. Kalit AI is built for founders who need to build, secure and launch the product — not just generate code.",
    capabilities: FLOW_ROWS("Lovable"),
    whenToPick: [
      "You want the most established prompt-to-app community.",
      "You only need code generation, not security or research.",
      "You've already chosen your hosting and growth stack."
    ],
    whenToPickKalit: [
      "You want a security report attached to every launch.",
      "You want one workspace that goes from idea to live, with research and marketing on the side.",
      "You want a multi-agent build team and an explicit task plan, not a single-shot generator.",
      "You ship in multiple languages — Kalit is localized in 16."
    ]
  },
  {
    slug: "kalit-vs-base44",
    name: "Base44",
    oneLiner: "Base44 leans into \"vibe coding\" for non-coders. Kalit takes a different stance: the output is real, portable code in a real framework, built by a coordinated agent team.",
    competitorOneLiner: "Base44 — vibe-coded web apps for non-technical builders.",
    intro:
      "Base44 is optimized for non-coders who want a working app without thinking about the stack. Kalit AI gives you the same speed but a real codebase you can take with you, plus security and growth tooling.",
    capabilities: FLOW_ROWS("Base44", { repo: "no", docker: "no" }),
    whenToPick: [
      "You don't want to see code at all.",
      "You want a single tool that hides the stack entirely.",
      "Your needs are mostly internal, low-risk apps."
    ],
    whenToPickKalit: [
      "You want code you can export, version and own.",
      "You want a pentest report before you launch.",
      "You want to graduate from a no-code feel to a real engineering workflow without switching tools.",
      "You want EU-based infra and a clear DPA path."
    ]
  },
  {
    slug: "kalit-vs-emergent",
    name: "Emergent",
    oneLiner: "Emergent positions around production-ready apps from conversation. Kalit shares that ambition and adds a security suite, a multi-agent build team, and a free research front door.",
    competitorOneLiner: "Emergent — production-ready apps via natural conversation.",
    intro:
      "Emergent is a strong choice for a single-channel prompt-to-product workflow. Kalit AI extends the same idea into a four-suite software factory, with autonomous pentest as a first-class citizen.",
    capabilities: FLOW_ROWS("Emergent"),
    whenToPick: [
      "You want a single-channel prompt-to-app experience.",
      "You don't need security tooling.",
      "Your audience is mostly US-based and English-speaking."
    ],
    whenToPickKalit: [
      "You want autonomous pentest baked in.",
      "You want 16-language localization from day one.",
      "You want both build and growth suites under one workspace.",
      "You want CVSS-scored findings with SARIF export."
    ]
  },
  {
    slug: "kalit-vs-bolt",
    name: "Bolt",
    oneLiner: "Bolt is a fast in-browser builder for prototypes. Kalit is built for the next step — taking a prototype to a launchable, scanned, growth-ready product.",
    competitorOneLiner: "Bolt — in-browser AI prototyping that's fast and visual.",
    intro:
      "Bolt is a brilliant prototyping environment. Kalit AI complements it: when you outgrow the prototype phase and need a real deploy, a security scan, and a launch plan, you move to Kalit.",
    capabilities: FLOW_ROWS("Bolt", { docker: "no", repo: "partial" }),
    whenToPick: [
      "You want the fastest possible visual prototype.",
      "You're not yet thinking about launch or security.",
      "You're happy to migrate later."
    ],
    whenToPickKalit: [
      "You want to launch, not just prototype.",
      "You want a real Dockerized output and a real GitHub repo.",
      "You want security and research baked into the same workspace."
    ]
  }
]

export const getCompetitor = (slug: string) => COMPETITORS.find((c) => c.slug === slug)
