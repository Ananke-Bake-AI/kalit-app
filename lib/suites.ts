export type SuiteId = "pentest" | "flow" | "marketing" | "project"

export interface SuiteConfig {
  id: SuiteId
  color: string
  title: string
  button: string
  description: string
  smallDescription: string
}

export const SUITES: SuiteConfig[] = [
  {
    id: "pentest",
    color: "var(--color-1)",
    title: "pentest",
    button: "Secure my product",
    description: "Detect vulnerabilities before they become costly. AI scans your apps and systems, uncovers risks, and delivers actionable fixes.",
    smallDescription: "Find and fix vulnerabilities automatically."
  },
  {
    id: "flow",
    color: "var(--color-2)",
    title: "flow",
    button: "Create my site",
    description: "Launch high-converting websites and landing pages in minutes. Design, copy, structure, and hosting included.",
    smallDescription: "Websites and landing pages in minutes."
  },
  {
    id: "marketing",
    color: "var(--color-3)",
    title: "marketing",
    button: "Launch my growth",
    description: "Plan, create, run, and optimize acquisition campaigns across channels. AI handles the execution, you focus on the product.",
    smallDescription: "Autonomous campaigns and growth."
  },
  {
    id: "project",
    color: "var(--color-4)",
    title: "project",
    button: "Build my app",
    description: "Turn a prompt into a fully deployed application. AI agents plan, build, test, and ship your product end-to-end.",
    smallDescription: "From prompt to deployed app."
  }
]
