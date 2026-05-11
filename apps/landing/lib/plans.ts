import type { SuiteId } from "./suites"
import { getPlanKeyByPriceId, getStripePriceId } from "./settings"

// PlanConfig — STATIC part only. stripePriceId is no longer read from
// process.env at module load; it lives in the admin-managed AppSetting
// table and must be resolved at runtime via resolveStripePriceId().
// This file used to expose `stripePriceId: process.env.STRIPE_PRICE_*`
// — that evaluated at import time so a price update required a redeploy.
export interface PlanConfig {
  key: string
  name: string
  monthlyPrice: number // cents
  suites: SuiteId[]
  creditsPerMonth: number
  maxMembers: number
  features: string[]
  popular?: boolean
}

export const FREE_PLAN: PlanConfig = {
  key: "free",
  name: "Free",
  monthlyPrice: 0,
  suites: ["flow"],
  creditsPerMonth: 15,
  maxMembers: 1,
  features: [
    "Kalit Flow access",
    "15 credits / month",
    "1 team member",
  ],
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
  },
  {
    key: "pro",
    name: "Pro",
    monthlyPrice: 9900,
    suites: ["flow"],
    creditsPerMonth: 500,
    maxMembers: 10,
    popular: true,
    features: [
      "Kalit Flow — pages and apps",
      "500 credits / month",
      "10 team members",
      "Deploy to production",
      "Priority support",
      "Custom domains",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    monthlyPrice: 29900,
    suites: ["flow", "pentest", "search"],
    creditsPerMonth: 2000,
    maxMembers: -1,
    features: [
      "Flow + Pentest + Search",
      "2,000 credits / month",
      "Unlimited team members",
      "Priority execution",
      "Pre-launch security scans",
      "Dedicated support",
      "Custom integrations",
    ],
  },
]

export function getPlan(key: string): PlanConfig | undefined {
  return PLANS.find((p) => p.key === key)
}

// Resolve a plan's Stripe price ID at runtime from the admin-managed
// AppSetting store. Returns null when the admin hasn't set it yet.
export async function resolveStripePriceId(planKey: string): Promise<string | null> {
  return getStripePriceId(planKey)
}

// Reverse: given a Stripe price id (typically from a webhook), find
// the matching PlanConfig. Async because price ids live in DB.
export async function getPlanByPriceId(priceId: string): Promise<PlanConfig | undefined> {
  const planKey = await getPlanKeyByPriceId(priceId)
  if (!planKey) return undefined
  return getPlan(planKey)
}
