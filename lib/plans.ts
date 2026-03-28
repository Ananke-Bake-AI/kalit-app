import type { SuiteId } from "./suites"

export interface PlanConfig {
  key: string
  name: string
  monthlyPrice: number // cents
  suites: SuiteId[]
  creditsPerMonth: number
  maxMembers: number
  features: string[]
  stripePriceId: string
  popular?: boolean
}

export const PLANS: PlanConfig[] = [
  {
    key: "starter",
    name: "Starter",
    monthlyPrice: 2900,
    suites: ["flow"],
    creditsPerMonth: 100,
    maxMembers: 2,
    features: [
      "Kalit Flow access",
      "100 credits / month",
      "2 team members",
      "Custom domain",
      "Email support",
    ],
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 9900,
    suites: ["flow", "project", "marketing"],
    creditsPerMonth: 500,
    maxMembers: 10,
    popular: true,
    features: [
      "Flow + Project + Marketing",
      "500 credits / month",
      "10 team members",
      "Deploy to production",
      "Priority support",
      "Custom domains",
    ],
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
  },
  {
    key: "enterprise",
    name: "Enterprise",
    monthlyPrice: 29900,
    suites: ["flow", "project", "marketing", "pentest", "search"],
    creditsPerMonth: 2000,
    maxMembers: -1,
    features: [
      "All 4 suites",
      "2,000 credits / month",
      "Unlimited team members",
      "Priority execution",
      "Pentest scanning",
      "Dedicated support",
      "Custom integrations",
    ],
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || "",
  },
]

export function getPlan(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key)
}

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  return PLANS.find((p) => p.stripePriceId === priceId)
}
