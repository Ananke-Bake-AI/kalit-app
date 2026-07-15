"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { auth } from "@/lib/auth"
import { APP_URL } from "@/lib/config"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { getCreditPack, getPlan, resolveCreditPackPriceId, resolveStripePriceId } from "@/lib/plans"
import { parseGaClientId, parseGaSessionId, GA4_STREAM_COOKIE } from "@/lib/ga4-mp"

/**
 * Read ad-platform match/attribution data available on the current request,
 * for the server-side conversion events fired later from the Stripe webhook:
 *
 *   Meta CAPI — the _fbp/_fbc first-party cookies + real client IP/UA.
 *   GA4 MP    — the client_id (from `_ga`) + session_id (from `_ga_<stream>`),
 *               which GA4 needs to attribute the purchase to the user's
 *               session (and thus to their Google Ads click).
 *
 * Returned as string-only key/values for Stripe Checkout metadata (all capped
 * well under Stripe's 500-char limit). Only present keys are included so we
 * never write empty metadata. This runs in the user's request context, so the
 * cookies/headers are the real client's — the webhook can't read them itself.
 */
async function collectAdTrackingData(): Promise<Record<string, string>> {
  const [cookieStore, hdrs] = await Promise.all([cookies(), headers()])
  const out: Record<string, string> = {}
  // Meta
  const fbp = cookieStore.get("_fbp")?.value
  const fbc = cookieStore.get("_fbc")?.value
  if (fbp) out.fbp = fbp
  if (fbc) out.fbc = fbc
  const ip = (hdrs.get("x-forwarded-for") || "").split(",")[0].trim()
  if (ip) out.capiIp = ip
  const ua = hdrs.get("user-agent")
  if (ua) out.capiUa = ua.slice(0, 480)
  // GA4
  const gaCid = parseGaClientId(cookieStore.get("_ga")?.value)
  const gaSid = parseGaSessionId(cookieStore.get(GA4_STREAM_COOKIE)?.value)
  if (gaCid) out.gaCid = gaCid
  if (gaSid) out.gaSid = gaSid
  return out
}

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

  // Capture ad-platform match/attribution data at checkout-create time. This
  // server action runs in response to the user's click, so the _fbp/_fbc and
  // _ga cookies plus the real client IP/UA are all here — unlike the Stripe
  // webhook, whose request comes from Stripe. We stash them in the Checkout
  // metadata so the webhook can attach them to the server-side conversion
  // events (Meta CAPI Purchase + GA4 Measurement Protocol purchase).
  const capiMeta = await collectAdTrackingData()

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // `{CHECKOUT_SESSION_ID}` is substituted by Stripe with the real session
    // id on redirect. The browser Pixel reads it as its Purchase `eventID`,
    // and the webhook uses the same id as the CAPI `event_id` — that shared
    // key is what lets Meta dedup the two events into one conversion.
    success_url: new URL(
      `/dashboard?checkout=success&type=subscription&plan=${plan.key}&value=${plan.monthlyPrice / 100}&currency=USD&session_id={CHECKOUT_SESSION_ID}`,
      APP_URL
    ).toString(),
    cancel_url: new URL("/settings/billing?checkout=canceled", APP_URL).toString(),
    metadata: {
      orgId: org.id,
      planKey: plan.key,
      ...capiMeta,
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
