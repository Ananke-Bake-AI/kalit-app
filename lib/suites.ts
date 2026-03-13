export type SuiteId = "pentest" | "flow" | "marketing" | "project"

export interface SuiteConfig {
  id: SuiteId
  color: string
  title: string
  button: string
  description: string
}

export const SUITES: SuiteConfig[] = [
  {
    id: "pentest",
    color: "var(--color-1)",
    title: "pentest",
    button: "Start with Pentest",
    description: "Continuously scan and secure your systems. AI detects vulnerabilities before they become threats."
  },
  {
    id: "flow",
    color: "var(--color-2)",
    title: "flow",
    button: "Create my landing",
    description: "Generate high-quality websites and landing pages in minutes. Design, copy, and hosting included."
  },
  {
    id: "marketing",
    color: "var(--color-3)",
    title: "marketing",
    button: "Start my campaign",
    description: "Automate user acquisition. AI creates, runs, and optimizes campaigns to maximize conversions."
  },
  {
    id: "project",
    color: "var(--color-4)",
    title: "project",
    button: "Launch my project",
    description: "Turn a prompt into a fully deployed application. AI builds and launches your product end-to-end."
  }
]
