// Case-study placeholders. Replace each `comingSoon` entry with a real story
// as design-partner cohorts ship — keep the shape identical so the page
// doesn't need to change.
export interface CaseStudy {
  slug: string
  customer: string
  oneLiner: string
  industry: string
  useCase: string
  result: string
  comingSoon: boolean
  body?: {
    background: string
    approach: string
    outcome: string
    quote?: { text: string; author: string; role: string }
  }
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "early-stage-founder",
    customer: "Solo founder, B2B SaaS",
    oneLiner: "From idea to deployed MVP in 9 days, with a pentest report in hand at launch.",
    industry: "B2B SaaS",
    useCase: "Flow + Pentest",
    result: "MVP launched in 9 days, zero high-severity findings at launch.",
    comingSoon: true
  },
  {
    slug: "agency-client-delivery",
    customer: "Boutique product agency",
    oneLiner: "3× client landing sites delivered in a week — built with Flow, scanned with Pentest, handed off as a real codebase.",
    industry: "Agency",
    useCase: "Flow + Pentest",
    result: "Throughput up 3×, no extra headcount.",
    comingSoon: true
  },
  {
    slug: "internal-tool-launch",
    customer: "Mid-size operations team",
    oneLiner: "Replaced a 6-week internal-tools backlog with a Flow workspace — and got a security review for free.",
    industry: "Internal tools",
    useCase: "Flow",
    result: "4 internal apps shipped in 2 weeks.",
    comingSoon: true
  }
]

export const getCaseStudy = (slug: string) => CASE_STUDIES.find((c) => c.slug === slug)
