"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getPlan } from "@/lib/plans"

export async function createCheckoutSession(planKey: string) {
  const session = await auth()
  if (!session?.user?.id || !session.user.orgId) {
    return { error: "Not authenticated" }
  }

  const plan = getPlan(planKey)
  if (!plan || !plan.stripePriceId) {
    return { error: "Invalid plan" }
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
  })
  if (!org) {
    return { error: "Organization not found" }
  }

  const stripe = getStripe()

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
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?checkout=canceled`,
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

  const stripe = getStripe()
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  })

  return { url: portalSession.url }
}
