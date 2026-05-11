"use server"

import { auth } from "@/lib/auth"
import { APP_URL } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getPlan, resolveStripePriceId } from "@/lib/plans"

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
    success_url: new URL("/dashboard?checkout=success", APP_URL).toString(),
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
