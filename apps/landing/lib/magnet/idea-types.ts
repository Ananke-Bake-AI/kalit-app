/**
 * Shared, dependency-free types for the idea-finder magnet.
 *
 * Safe to import from client components (no server-only code here) — the scout
 * engine (scout.ts) re-uses these and adds the Groq/Search machinery.
 */

export interface ScoutProfile {
  /** Free text: what they'd love to build / the problem they want to solve. */
  goal: string
  /** Domains that excite them (chips). */
  interests: string[]
  /** Who they want to serve (B2B, B2C, Developers, Creators, SMBs…). */
  audience: string
  /** How far along they are (Just exploring, Validating, Ready to build). */
  stage: string
}

export interface IdeaScores {
  opportunity: number
  kalitFit: number
  market: number
  signal: number
}

/** A matched idea, fully hydrated (stored server-side; gated for anon). */
export interface IdeaFull {
  projectId: string
  name: string
  category: string
  tagline: string
  fitReason: string
  scores: IdeaScores
  whyNow: string
  targetAudience: string
  // ↓ gated (revealed after signup)
  marketSize: string
  uniqueAngle: string
  businessModel: {
    revenueModel: string
    pricing: string
    estimatedMRR: string
    summary: string
  }
  gtm: string[]
  competitors: string[]
  mvp: { pages: string[]; keyFlows: string[]; launchScope: string }
  demoIdea: string
  sourceUrls: string[]
  searchUrl: string
  timeToMVP: string
  complexity: string
}

/** Free preview: enough to intrigue, the actionable depth stays locked. */
export interface IdeaPreview {
  projectId: string
  name: string
  category: string
  tagline: string
  fitReason: string
  scores: IdeaScores
  whyNow: string
  targetAudience: string
  searchUrl: string
  timeToMVP: string
  locked: true
}

/** The shape stored in MagnetSession.teaser for door "idea_finder". */
export interface IdeaTeaser {
  profile: ScoutProfile
  founderSummary: string
  ideas: IdeaFull[]
  topProjectId: string | null
}

export function previewIdea(idea: IdeaFull): IdeaPreview {
  return {
    projectId: idea.projectId,
    name: idea.name,
    category: idea.category,
    tagline: idea.tagline,
    fitReason: idea.fitReason,
    scores: idea.scores,
    whyNow: idea.whyNow,
    targetAudience: idea.targetAudience,
    searchUrl: idea.searchUrl,
    timeToMVP: idea.timeToMVP,
    locked: true,
  }
}
