import { prisma } from "@/lib/prisma"
import { getCreditPack, getPlanByPriceId } from "@/lib/plans"

/**
 * Stripe API 2025+ (incl. 2026-02-25.clover) moved billing-period fields
 * from the subscription root to each `items.data[i]` — `subscription.current_period_start`
 * is now undefined and the per-item fields are authoritative. We read from
 * the first item with a fallback to the (legacy) root field so older API
 * versions still work without a code change.
 */
function readPeriodStart(sub: any): Date {
  const epoch = sub?.items?.data?.[0]?.current_period_start ?? sub?.current_period_start ?? sub?.start_date
  return new Date((epoch || 0) * 1000)
}

function readPeriodEnd(sub: any): Date {
  const epoch = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end
  return new Date((epoch || 0) * 1000)
}

export async function handleCheckoutCompleted(session: any) {
  const orgId = session.metadata?.orgId
  if (!orgId) return

  // One-off credit pack purchase — flagged via `kind: "credit_pack"` in
  // the Checkout metadata (vs the subscription mode below). We credit the
  // ledger and return early; no subscription bookkeeping to do.
  if (session.mode === "payment" && session.metadata?.kind === "credit_pack") {
    const packKey = session.metadata?.packKey as string | undefined
    const pack = packKey ? getCreditPack(packKey) : undefined
    const credits = pack?.credits ?? Number(session.metadata?.credits || 0)
    if (!credits || credits <= 0) return

    // Idempotency: Stripe re-delivers this event on its own retry schedule.
    // Keying CreditRecord.invoiceId on the Checkout session id prevents
    // double-crediting if the webhook handler runs twice for the same buy.
    const existing = await prisma.creditRecord.findFirst({
      where: { orgId, invoiceId: session.id, direction: "CREDIT" },
    })
    if (existing) return

    await prisma.creditRecord.create({
      data: {
        orgId,
        direction: "CREDIT",
        amount: credits,
        reason: `Credit pack purchase (${credits} credits)`,
        invoiceId: session.id,
      },
    })
    return
  }

  // Subscription mode — original behavior.
  const planKey = session.metadata?.planKey
  if (!planKey || !session.subscription) return

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id

  const { getStripe } = await import("@/lib/stripe")
  const stripe = await getStripe()
  const sub: any = await stripe.subscriptions.retrieve(subscriptionId)

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    create: {
      orgId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: sub.items.data[0].price.id,
      planKey,
      status: "ACTIVE",
      currentPeriodStart: readPeriodStart(sub),
      currentPeriodEnd: readPeriodEnd(sub),
    },
    update: {
      status: "ACTIVE",
      planKey,
      stripePriceId: sub.items.data[0].price.id,
      currentPeriodStart: readPeriodStart(sub),
      currentPeriodEnd: readPeriodEnd(sub),
    },
  })

  await provisionEntitlements(orgId, planKey)
}

export async function handleSubscriptionUpdated(sub: any) {
  const orgId = sub.metadata?.orgId
  if (!orgId) return

  const priceId = sub.items.data[0]?.price.id
  const plan = await getPlanByPriceId(priceId || "")
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
      currentPeriodStart: readPeriodStart(sub),
      currentPeriodEnd: readPeriodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      status: (statusMap[sub.status] || "ACTIVE") as any,
      planKey,
      stripePriceId: priceId || "",
      currentPeriodStart: readPeriodStart(sub),
      currentPeriodEnd: readPeriodEnd(sub),
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
