import type { SuiteId } from "./suites"
import { getCreditPackPriceId, getPlanKeyByPriceId, getStripePriceId } from "./settings"

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
  // Per-account storage cap (workspace files + R2 archives), in megabytes.
  // free 200 MB / starter 10 GB / pro 100 GB / enterprise 300 GB.
  storageMB: number
  features: string[]
  popular?: boolean
}

// Human label for a plan's storage cap ("200 MB", "10 GB", …).
export function formatStorage(mb: number): string {
  return mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`
}

// The "free" entry is the 14-DAY TRIAL, not a perpetual free tier. Signing up
// grants full access to every suite + 15 credits for 14 days (see
// server/actions/onboarding.ts) — i.e. 5× less than Starter's 75. After that
// the org is hard-paywalled (0 credits, no suites — enforced in
// lib/entitlements.ts). The fields below are display/lookup only; the real
// trial allocation is the onboarding grant.
export const FREE_PLAN: PlanConfig = {
  key: "free",
  name: "Free trial",
  monthlyPrice: 0,
  suites: ["flow"],
  creditsPerMonth: 15,
  maxMembers: 1,
  storageMB: 200,
  features: [
    "Full access for 14 days",
    "15 credits / month",
    "200 MB storage",
    "Every suite included",
    "No credit card required",
  ],
}

export const PLANS: PlanConfig[] = [
  {
    key: "starter",
    name: "Starter",
    monthlyPrice: 2900,
    suites: ["flow"],
    creditsPerMonth: 75,
    maxMembers: 2,
    storageMB: 10240,
    features: [
      "Kalit Flow access",
      "75 credits / month",
      "10 GB storage",
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
    creditsPerMonth: 350,
    maxMembers: 10,
    storageMB: 102400,
    popular: true,
    features: [
      "Kalit Flow — pages and apps",
      "350 credits / month",
      "Access to more intelligent models",
      "100 GB storage",
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
    creditsPerMonth: 1200,
    maxMembers: -1,
    storageMB: 307200,
    features: [
      "Flow + Pentest + Search",
      "1,200 credits / month",
      "Access to more intelligent models",
      "300 GB storage",
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

// True only for a real PAID tier (starter/pro/enterprise). "free" (the trial /
// post-trial state) and null are NOT paid. Used to gate paid-only features like
// exporting/downloading the project code.
export function isPaidPlan(key: string | null | undefined): boolean {
  return !!key && PLANS.some((p) => p.key === key)
}

// One-off credit packs — purchased on top of the monthly subscription. Same
// admin-managed-price-id pattern as PLANS: the price IDs live in AppSetting
// under STRIPE_PRICE_CREDITS_<KEY> and resolve at runtime.
export interface CreditPackConfig {
  key: string
  credits: number
  priceCents: number
  popular?: boolean
}

export const CREDIT_PACKS: CreditPackConfig[] = [
  { key: "credits_25", credits: 25, priceCents: 1500 },
  { key: "credits_100", credits: 100, priceCents: 4900, popular: true },
  { key: "credits_400", credits: 400, priceCents: 15900 },
]

export function getCreditPack(key: string): CreditPackConfig | undefined {
  return CREDIT_PACKS.find((p) => p.key === key)
}

export async function resolveCreditPackPriceId(packKey: string): Promise<string | null> {
  return getCreditPackPriceId(packKey)
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
