import { prisma } from "@/lib/prisma"
import { getPlanByPriceId } from "@/lib/plans"

export async function handleCheckoutCompleted(session: any) {
  const orgId = session.metadata?.orgId
  const planKey = session.metadata?.planKey

  if (!orgId || !planKey || !session.subscription) return

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id

  const { getStripe } = await import("@/lib/stripe")
  const stripe = getStripe()
  const sub: any = await stripe.subscriptions.retrieve(subscriptionId)

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    create: {
      orgId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: sub.items.data[0].price.id,
      planKey,
      status: "ACTIVE",
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
    update: {
      status: "ACTIVE",
      planKey,
      stripePriceId: sub.items.data[0].price.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  })

  await provisionEntitlements(orgId, planKey)
}

export async function handleSubscriptionUpdated(sub: any) {
  const orgId = sub.metadata?.orgId
  if (!orgId) return

  const priceId = sub.items.data[0]?.price.id
  const plan = getPlanByPriceId(priceId || "")
  const planKey = plan?.key || sub.metadata?.planKey || "unknown"

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
  }

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      orgId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId || "",
      planKey,
      status: (statusMap[sub.status] || "ACTIVE") as any,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      status: (statusMap[sub.status] || "ACTIVE") as any,
      planKey,
      stripePriceId: priceId || "",
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })

  if (sub.status === "active" || sub.status === "trialing") {
    await provisionEntitlements(orgId, planKey)
  }
}

export async function handleSubscriptionDeleted(sub: any) {
  const orgId = sub.metadata?.orgId
  if (!orgId) return

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: "CANCELED" },
  })

  await prisma.entitlement.deleteMany({
    where: { orgId, source: "PLAN" },
  })
}

export async function handleInvoicePaymentFailed(invoice: any) {
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id

  if (!subId) return

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "PAST_DUE" },
  })
}

async function provisionEntitlements(orgId: string, planKey: string) {
  const { getPlan } = await import("@/lib/plans")
  const plan = getPlan(planKey)
  if (!plan) return

  await prisma.entitlement.deleteMany({
    where: { orgId, source: "PLAN" },
  })

  const entitlements = plan.suites.map((suiteId) => ({
    orgId,
    key: `suite.${suiteId}.access`,
    value: { granted: true } as any,
    source: "PLAN" as const,
  }))

  entitlements.push({
    orgId,
    key: "monthly.credits",
    value: { amount: plan.creditsPerMonth } as any,
    source: "PLAN" as const,
  })

  entitlements.push({
    orgId,
    key: "workspace.members.max",
    value: { amount: plan.maxMembers } as any,
    source: "PLAN" as const,
  })

  for (const ent of entitlements) {
    await prisma.entitlement.upsert({
      where: { orgId_key: { orgId, key: ent.key } },
      create: ent,
      update: { value: ent.value, source: ent.source },
    })
  }
}
