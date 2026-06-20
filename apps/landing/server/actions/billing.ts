"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { APP_URL } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getCreditPack, getPlan, resolveCreditPackPriceId, resolveStripePriceId } from "@/lib/plans"

export async function createCheckoutSession(planKey: string) {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) {
    return { error: "Not authenticated" }
  }

  const plan = getPlan(planKey)
  if (!plan) {
    return { error: "Invalid plan" }
  }
  const priceId = await resolveStripePriceId(planKey)
  if (!priceId) {
    return { error: "Stripe price not configured for this plan — set it in /admin/settings" }
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
  })
  if (!org) {
    return { error: "Organization not found" }
  }

  const stripe = await getStripe()

  // Get or create Stripe customer
  let customerId = org.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: org.name,
      metadata: { orgId: org.id },
    })
    customerId = customer.id
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: new URL(
      `/dashboard?checkout=success&type=subscription&plan=${plan.key}&value=${plan.monthlyPrice / 100}&currency=USD`,
      APP_URL
    ).toString(),
    cancel_url: new URL("/settings/billing?checkout=canceled", APP_URL).toString(),
    metadata: {
      orgId: org.id,
      planKey: plan.key,
    },
    subscription_data: {
      metadata: {
        orgId: org.id,
        planKey: plan.key,
      },
    },
  })

  return { url: checkoutSession.url }
}

export async function createPortalSession() {
  const session = await auth()
  if (!session?.user?.orgId) {
    return { error: "Not authenticated" }
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
  })

  if (!org?.stripeCustomerId) {
    return { error: "No billing account found" }
  }

  const stripe = await getStripe()
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: new URL("/settings/billing", APP_URL).toString(),
  })

  return { url: portalSession.url }
}

// ── Subscription lifecycle ───────────────────────────────────────

/**
 * Mark the active subscription to cancel at the end of the current billing
 * period. The user keeps access until `currentPeriodEnd`, then Stripe flips
 * it to canceled and our `customer.subscription.deleted` webhook tears down
 * entitlements.
 */
export async function scheduleCancellation() {
  const session = await auth()
  if (!session?.user?.orgId) return { error: "Not authenticated" }

  const sub = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  })
  if (!sub) return { error: "No active subscription" }

  try {
    const stripe = await getStripe()
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    })
    revalidatePath("/[locale]/(dashboard)/settings/billing", "page")
    return { ok: true }
  } catch (err) {
    console.error("[billing] scheduleCancellation failed:", err)
    return { error: "Failed to schedule cancellation" }
  }
}

/**
 * Undo a previously scheduled cancellation — the subscription resumes its
 * normal monthly cadence with no gap in access.
 */
export async function resumeSubscription() {
  const session = await auth()
  if (!session?.user?.orgId) return { error: "Not authenticated" }

  const sub = await prisma.subscription.findFirst({
    where: { orgId: session.user.orgId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  })
  if (!sub) return { error: "No active subscription" }

  try {
    const stripe = await getStripe()
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    })
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: false },
    })
    revalidatePath("/[locale]/(dashboard)/settings/billing", "page")
    return { ok: true }
  } catch (err) {
    console.error("[billing] resumeSubscription failed:", err)
    return { error: "Failed to resume subscription" }
  }
}

// ── One-off credit packs ─────────────────────────────────────────

/**
 * One-off credit pack purchase. Spawns a Stripe Checkout in `mode: "payment"`
 * (vs subscriptions); the webhook handler watches for `session.mode === "payment"`
 * and writes a `CreditRecord` so the org's monthly credit pool inflates by
 * the pack amount.
 */
export async function createCreditCheckoutSession(packKey: string) {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) {
    return { error: "Not authenticated" }
  }

  const pack = getCreditPack(packKey)
  if (!pack) return { error: "Invalid credit pack" }

  const priceId = await resolveCreditPackPriceId(packKey)
  if (!priceId) {
    return { error: "Credit pack price not configured — set it in /admin/settings" }
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
  })
  if (!org) return { error: "Organization not found" }

  const stripe = await getStripe()

  let customerId = org.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: org.name,
      metadata: { orgId: org.id },
    })
    customerId = customer.id
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: new URL(
      `/settings/billing?checkout=success&type=credits&amount=${pack.credits}&value=${pack.priceCents / 100}&currency=USD`,
      APP_URL
    ).toString(),
    cancel_url: new URL("/settings/billing?checkout=canceled", APP_URL).toString(),
    metadata: {
      orgId: org.id,
      packKey: pack.key,
      credits: String(pack.credits),
      kind: "credit_pack",
    },
    payment_intent_data: {
      metadata: {
        orgId: org.id,
        packKey: pack.key,
        credits: String(pack.credits),
        kind: "credit_pack",
      },
    },
  })

  return { url: checkout.url }
}
