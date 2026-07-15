import { prisma } from "@/lib/prisma"
import { APP_URL } from "@/lib/config"
import { getCreditPack, getPlan, getPlanByPriceId } from "@/lib/plans"
import { sendMetaPurchaseEvent } from "@/lib/meta-capi"
import { sendGa4Purchase } from "@/lib/ga4-mp"

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

  // ── Server-side conversion events ──────────────────────────────
  // Fired straight from the webhook (no browser → ad-blocker/ITP proof). Each
  // is isolated in its own try/catch so a marketing-pixel failure can never
  // break subscription provisioning. All keyed on `session.id` — the SAME id
  // the browser events use — so each platform dedups server↔browser.
  const plan = getPlan(planKey)
  const value = plan ? plan.monthlyPrice / 100 : undefined
  const currency = (session.currency || "usd").toUpperCase()
  const eventSourceUrl = new URL("/dashboard?checkout=success", APP_URL).toString()

  // Meta CAPI Purchase — dedups against the browser Pixel via event_id = session.id.
  try {
    await sendMetaPurchaseEvent({
      eventId: session.id,
      value,
      currency,
      email: session.customer_details?.email || session.customer_email || null,
      fbp: session.metadata?.fbp || null,
      fbc: session.metadata?.fbc || null,
      clientIp: session.metadata?.capiIp || null,
      clientUserAgent: session.metadata?.capiUa || null,
      eventSourceUrl,
    })
  } catch (err) {
    console.error("[stripe] Meta CAPI Purchase dispatch failed:", (err as Error).message)
  }

  // GA4 Measurement Protocol `purchase` — feeds GA4 + (via the GA4↔Ads import)
  // Google Ads. Attributed to the user's GA4 session via client_id from `_ga`.
  try {
    if (session.metadata?.gaCid) {
      await sendGa4Purchase({
        clientId: session.metadata.gaCid,
        sessionId: session.metadata?.gaSid || null,
        transactionId: session.id,
        value,
        currency,
        itemName: plan?.name || planKey,
        eventSourceUrl,
      })
    }
  } catch (err) {
    console.error("[stripe] GA4 MP purchase dispatch failed:", (err as Error).message)
  }
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

  // Clear PLAN entitlements (they get re-created below) AND any leftover
  // TRIAL entitlements — once the user converts to a paid plan, the trial
  // is no longer relevant. Without this, `resolveEntitlements` keeps
  // setting `isTrial: true` and the dashboard still reads "Your trial
  // expires on …" under the Starter badge.
  await prisma.entitlement.deleteMany({
    where: { orgId, source: { in: ["PLAN", "TRIAL"] } },
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
