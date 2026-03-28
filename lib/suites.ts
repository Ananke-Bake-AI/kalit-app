export type SuiteId = "pentest" | "flow" | "marketing" | "project" | "search"

/** Contexte d’URL / store : hors suite ou id de suite active */
export type AppPageState = "default" | SuiteId

export interface SuiteConfig {
  id: SuiteId
  color: string
  /** Valeur CSS pour `var(--gradient-primary)` quand cette suite est active */
  gradient: string
  gradientRadial: string
  /** Vignette marketing (chemin public ou URL) — optionnel pour l’instant */
  thumbnail?: string
  /** Icône onglet / PWA — optionnel pour l’instant */
  favicon?: string
  title: string
  button: string
  description: string
  smallDescription: string
  /** Copy affichée quand une suite est recommandée depuis le prompt (hero, etc.) */
  matchDescription: string
  /** Exemple de prompt pour les raccourcis « quick select » */
  quickPrompt: string
  /** Path SVG du pictogramme (attribut `d`) */
  logoD: string
  /** Texte `<title>` du SVG pour l’accessibilité */
  logoTitle: string
  /** URL de base de l’app suite (SSO, redirections serveur) */
  appUrl: string
}

/** Dégradé global quand aucune suite n’est « active » (dashboard, settings, landing, etc.) */
export const APP_DEFAULT_GRADIENT_PRIMARY = "var(--gradient-linear-3)"
export const APP_DEFAULT_GRADIENT_PRIMARY_RADIAL = "var(--gradient-radial-1)"

export const SUITES: SuiteConfig[] = [
  {
    id: "pentest",
    color: "var(--color-1)",
    gradient: "var(--gradient-color-1)",
    gradientRadial: "var(--gradient-color-1-radial)",
    title: "pentest",
    button: "Secure my product",
    description:
      "Detect vulnerabilities before they become costly. AI scans your apps and systems, uncovers risks, and delivers actionable fixes.",
    smallDescription: "Find and fix vulnerabilities automatically.",
    matchDescription: "AI will scan your systems, find vulnerabilities, and suggest fixes.",
    quickPrompt: "Scan my web application for security vulnerabilities",
    logoD:
      "M20.366 10.1298H30.6829C42.0383 10.1298 51.2437 19.3351 51.2437 30.6906C51.2437 42.046 42.0383 51.2513 30.6829 51.2513C19.3274 51.2513 10.1221 42.046 10.1221 30.6906V82.0436",
    logoTitle: "Kalit — Pentest Suite",
    appUrl: process.env.SUITE_PENTEST_URL || "http://localhost:3005"
  },
  {
    id: "flow",
    color: "var(--color-2)",
    gradient: "var(--gradient-color-2)",
    gradientRadial: "var(--gradient-color-2-radial)",
    title: "flow",
    button: "Create my site",
    description:
      "Launch high-converting websites and landing pages in minutes. Design, copy, structure, and hosting included.",
    smallDescription: "Websites and landing pages in minutes.",
    matchDescription: "Design, copy, and structure — your site will be live in minutes.",
    quickPrompt: "Create a landing page for my product with pricing",
    logoD: "M61.3701 10.5157H40.9951C16.2951 10.5157 10.1201 31.099 10.1201 41.3907V81.9811M40.9951 50.7657H61.3701",
    logoTitle: "Kalit — Flow Orchestration",
    appUrl: process.env.SUITE_FLOW_URL || "http://localhost:3004"
  },
  {
    id: "marketing",
    color: "var(--color-3)",
    gradient: "var(--gradient-color-3)",
    gradientRadial: "var(--gradient-color-3-radial)",
    title: "marketing",
    button: "Launch my growth",
    description:
      "Plan, create, run, and optimize acquisition campaigns across channels. AI handles the execution, you focus on the product.",
    smallDescription: "Autonomous campaigns and growth.",
    matchDescription: "AI will plan, create, and optimize your campaigns across channels.",
    quickPrompt: "Launch a growth campaign across social media channels",
    logoD:
      "M71.751 0C71.751 17.0534 57.9265 30.8779 40.873 30.8779C23.8196 30.8779 9.99512 17.0534 9.99512 0V81.9811M71.7665 36.1279L71.6221 81.9124",
    logoTitle: "Kalit — Marketing Suite",
    appUrl: process.env.SUITE_MARKETING_URL || "http://localhost:3002"
  },
  {
    id: "project",
    color: "var(--color-4)",
    gradient: "var(--gradient-color-4)",
    gradientRadial: "var(--gradient-color-4-radial)",
    title: "project",
    button: "Build my app",
    description:
      "Turn a prompt into a fully deployed application. AI agents plan, build, test, and ship your product end-to-end.",
    smallDescription: "From prompt to deployed app.",
    matchDescription: "AI agents will plan, build, test, and deploy your app end-to-end.",
    quickPrompt: "Build me a SaaS application with authentication and billing",
    logoD:
      "M30.6809 51.2513C42.0363 51.2513 51.2417 42.046 51.2417 30.6905C51.2417 19.3351 42.0363 10.1298 30.6809 10.1298C19.3255 10.1298 10.1201 19.3351 10.1201 30.6906L10.1201 81.9968",
    logoTitle: "Kalit — Project Workspace",
    appUrl: process.env.SUITE_PROJECT_URL || "http://localhost:3003"
  },
  {
    id: "search",
    color: "var(--color-2)",
    gradient: "var(--gradient-color-2)",
    gradientRadial: "var(--gradient-color-2-radial)",
    title: "search",
    button: "Find ideas",
    description:
      "Discover trending project ideas backed by real data. AI agents analyze markets, score viability, and generate build-ready specs for entrepreneurs.",
    smallDescription: "R&D intelligence for entrepreneurs.",
    matchDescription: "AI will scan trends, analyze markets, and surface the best project ideas to build.",
    quickPrompt: "Find trending SaaS ideas with high monetization potential",
    logoD:
      "M30.6809 51.2513C42.0363 51.2513 51.2417 42.046 51.2417 30.6905C51.2417 19.3351 42.0363 10.1298 30.6809 10.1298C19.3255 10.1298 10.1201 19.3351 10.1201 30.6906L10.1201 81.9968",
    logoTitle: "Kalit — Search Suite",
    appUrl: process.env.SUITE_SEARCH_URL || "http://localhost:3003"
  }
]

/** Ordre des boutons suite sous le prompt hero */
export const HERO_PROMPT_SUITE_ORDER: readonly SuiteId[] = ["project", "flow", "marketing", "pentest"]

const SUITE_KEYWORD_TO_ID: Record<string, SuiteId> = {
  app: "project",
  application: "project",
  saas: "project",
  dashboard: "project",
  backend: "project",
  api: "project",
  database: "project",
  fullstack: "project",
  "full-stack": "project",
  mobile: "project",
  ios: "project",
  android: "project",
  deploy: "project",
  software: "project",
  platform: "project",
  crud: "project",
  auth: "project",
  authentication: "project",
  billing: "project",
  stripe: "project",
  landing: "flow",
  website: "flow",
  "landing page": "flow",
  page: "flow",
  portfolio: "flow",
  blog: "flow",
  site: "flow",
  homepage: "flow",
  design: "flow",
  restaurant: "flow",
  agency: "flow",
  marketing: "marketing",
  campaign: "marketing",
  ads: "marketing",
  seo: "marketing",
  social: "marketing",
  growth: "marketing",
  acquisition: "marketing",
  instagram: "marketing",
  facebook: "marketing",
  google: "marketing",
  tiktok: "marketing",
  email: "marketing",
  newsletter: "marketing",
  content: "marketing",
  leads: "marketing",
  funnel: "marketing",
  security: "pentest",
  pentest: "pentest",
  vulnerability: "pentest",
  vulnerabilities: "pentest",
  scan: "pentest",
  hack: "pentest",
  secure: "pentest",
  audit: "pentest",
  penetration: "pentest",
  owasp: "pentest",
  xss: "pentest",
  injection: "pentest",
  firewall: "pentest"
}

export function getSuiteDisplayTitle(suite: SuiteConfig): string {
  return suite.title.charAt(0).toUpperCase() + suite.title.slice(1)
}

export function getSuiteById(id: SuiteId): SuiteConfig | undefined {
  return SUITES.find((s) => s.id === id)
}

/** URL de base de l’app suite (même logique que `appUrl` dans `SUITES`) */
export function getSuiteAppUrl(id: SuiteId): string | undefined {
  return getSuiteById(id)?.appUrl
}

export function resolveAppGradientPrimary(page: AppPageState): string {
  if (page === "default") return APP_DEFAULT_GRADIENT_PRIMARY
  return getSuiteById(page)?.gradient ?? APP_DEFAULT_GRADIENT_PRIMARY
}

export function resolveAppGradientPrimaryRadial(page: AppPageState): string {
  if (page === "default") return APP_DEFAULT_GRADIENT_PRIMARY_RADIAL
  return getSuiteById(page)?.gradientRadial ?? APP_DEFAULT_GRADIENT_PRIMARY_RADIAL
}

/** Suite courante selon le store / l’URL, ou `null` si contexte `default` */
export function resolveActiveSuite(page: AppPageState): SuiteConfig | null {
  if (page === "default") return null
  return getSuiteById(page) ?? null
}

export function getHeroPromptSuites(): SuiteConfig[] {
  return HERO_PROMPT_SUITE_ORDER.map((id) => getSuiteById(id)!)
}

export function detectSuiteFromPrompt(input: string): SuiteConfig {
  const lower = input.toLowerCase()
  const scores: Record<SuiteId, number> = {
    project: 0,
    flow: 0,
    marketing: 0,
    pentest: 0
  }
  for (const [keyword, suiteId] of Object.entries(SUITE_KEYWORD_TO_ID)) {
    if (lower.includes(keyword)) scores[suiteId] += keyword.split(" ").length
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] as [SuiteId, number]
  if (best[1] === 0) return getSuiteById("project")!
  return getSuiteById(best[0])!
}
