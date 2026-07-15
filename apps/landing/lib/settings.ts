/**
 * App settings — admin-managed runtime config replacing process.env for
 * rotatable secrets (Stripe live key, webhook secret, price IDs).
 *
 * Storage: AppSetting table, value AES-256-GCM encrypted at rest with a
 * key derived from AUTH_SECRET + "_strype_keys" via SHA-256.
 *
 * Read pattern: getSetting(key) — returns plaintext or null. Caches per
 * process so the webhook handler doesn't pay a DB round-trip per call.
 *
 * Write pattern: setSetting(key, value, userId) — re-encrypts with a
 * fresh IV every time. We never display the value back; admin UI shows
 * "set" / "not set" + last-updated only.
 *
 * Why no process.env fallback: the user wants the panel to be the only
 * source of truth. Mixing env + DB silently is how prod end up running
 * the wrong key for hours after a rotation.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { prisma } from "./prisma"

const ALGO = "aes-256-gcm"
const IV_BYTES = 12

// In-process cache. Cleared on setSetting + on TTL expiry so a hot
// path (Stripe webhook) doesn't read the DB on every event.
const cache = new Map<string, { value: string; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

function deriveKey(): Buffer {
  const base = process.env.AUTH_SECRET
  if (!base) {
    throw new Error(
      "AUTH_SECRET is not set — required for app-settings encryption",
    )
  }
  // SHA-256 of the user-specified derivation string. Stable as long as
  // AUTH_SECRET doesn't rotate. If you ever rotate AUTH_SECRET, all
  // stored AppSetting values become unreadable — back them up and
  // re-enter them in the admin panel after the rotation.
  return createHash("sha256").update(base + "_strype_keys").digest()
}

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }
  const row = await prisma.appSetting.findUnique({ where: { key } })
  if (!row) {
    cache.delete(key)
    return null
  }
  try {
    const decipher = createDecipheriv(ALGO, deriveKey(), row.iv)
    decipher.setAuthTag(row.tag)
    const plain = Buffer.concat([decipher.update(row.value), decipher.final()]).toString("utf8")
    cache.set(key, { value: plain, expiresAt: Date.now() + CACHE_TTL_MS })
    return plain
  } catch (err) {
    // Decryption failure → either AUTH_SECRET rotated or the row is
    // corrupted. Don't leak which; just treat the value as missing so
    // the caller falls through to whatever its safe default is (Stripe
    // calls will fail loudly, which is the correct behavior).
    console.error(`[settings] decrypt failed for key=${key}:`, (err as Error).message)
    return null
  }
}

export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, deriveKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: ciphertext, iv, tag, updatedBy: updatedBy || null },
    update: { value: ciphertext, iv, tag, updatedBy: updatedBy || null },
  })
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

export async function clearSetting(key: string): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key } })
  cache.delete(key)
}

export interface SettingMetadata {
  key: string
  set: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export async function listSettingsMeta(keys: string[]): Promise<SettingMetadata[]> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, updatedAt: true, updatedBy: true },
  })
  const byKey = new Map(rows.map((r) => [r.key, r]))
  return keys.map((k) => {
    const row = byKey.get(k)
    return {
      key: k,
      set: !!row,
      updatedAt: row ? row.updatedAt.toISOString() : null,
      updatedBy: row?.updatedBy ?? null,
    }
  })
}

// ── Stripe-specific accessors ─────────────────────────────────

export const STRIPE_KEYS = {
  SECRET: "STRIPE_SECRET_KEY",
  WEBHOOK: "STRIPE_WEBHOOK_SECRET",
  PRICE_STARTER: "STRIPE_PRICE_STARTER",
  PRICE_PRO: "STRIPE_PRICE_PRO",
  PRICE_ENTERPRISE: "STRIPE_PRICE_ENTERPRISE",
  PRICE_CREDITS_25: "STRIPE_PRICE_CREDITS_25",
  PRICE_CREDITS_100: "STRIPE_PRICE_CREDITS_100",
  PRICE_CREDITS_400: "STRIPE_PRICE_CREDITS_400",
} as const

export const ALL_STRIPE_KEYS = Object.values(STRIPE_KEYS)

// ── Meta (Facebook) Conversions API ─────────────────────────
//
// Server-side purchase tracking. The public Pixel ID lives in code
// (lib/fbpixel.ts) — only the CAPI access token is a secret, stored here
// so it can be rotated from /admin/settings without a redeploy. The
// optional test-event code routes events to Events Manager → Test Events
// for validation; leave it unset in production.
export const META_KEYS = {
  CAPI_TOKEN: "META_CAPI_ACCESS_TOKEN",
  CAPI_TEST_CODE: "META_CAPI_TEST_CODE",
} as const

export const ALL_META_KEYS = Object.values(META_KEYS)

// ── Google Analytics 4 — Measurement Protocol ───────────────
//
// Server-side `purchase` events sent from the Stripe webhook straight to
// GA4 (which feeds Google Ads via the GA4↔Ads conversion import). The
// Measurement ID (G-816EPS8GX8) is public and lives in code — only the
// Measurement Protocol API secret is a secret, stored here. Generate it in
// GA4 Admin → Data Streams → (web stream) → Measurement Protocol API secrets.
export const GA_KEYS = {
  MP_API_SECRET: "GA4_MP_API_SECRET",
} as const

export const ALL_GA_KEYS = Object.values(GA_KEYS)

// Every writable app-setting key — the admin write/clear allowlist checks
// against this so newly-added groups don't get silently rejected.
export const ALL_SETTING_KEYS = [...ALL_STRIPE_KEYS, ...ALL_META_KEYS, ...ALL_GA_KEYS]

export async function getMetaCapiAccessToken(): Promise<string | null> {
  return getSetting(META_KEYS.CAPI_TOKEN)
}

export async function getMetaCapiTestCode(): Promise<string | null> {
  return getSetting(META_KEYS.CAPI_TEST_CODE)
}

export async function getGa4MpApiSecret(): Promise<string | null> {
  return getSetting(GA_KEYS.MP_API_SECRET)
}

export async function getStripeSecretKey(): Promise<string | null> {
  return getSetting(STRIPE_KEYS.SECRET)
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  return getSetting(STRIPE_KEYS.WEBHOOK)
}

export async function getStripePriceId(planKey: string): Promise<string | null> {
  switch (planKey.toLowerCase()) {
    case "starter":
      return getSetting(STRIPE_KEYS.PRICE_STARTER)
    case "pro":
      return getSetting(STRIPE_KEYS.PRICE_PRO)
    case "enterprise":
      return getSetting(STRIPE_KEYS.PRICE_ENTERPRISE)
    default:
      return null
  }
}

// Reverse lookup: given a Stripe price id (e.g. from a webhook event),
// return the plan key it maps to, or null if unknown.
export async function getPlanKeyByPriceId(priceId: string): Promise<string | null> {
  if (!priceId) return null
  const [starter, pro, enterprise] = await Promise.all([
    getSetting(STRIPE_KEYS.PRICE_STARTER),
    getSetting(STRIPE_KEYS.PRICE_PRO),
    getSetting(STRIPE_KEYS.PRICE_ENTERPRISE),
  ])
  if (priceId === starter) return "starter"
  if (priceId === pro) return "pro"
  if (priceId === enterprise) return "enterprise"
  return null
}

export async function getCreditPackPriceId(packKey: string): Promise<string | null> {
  switch (packKey) {
    case "credits_25":
      return getSetting(STRIPE_KEYS.PRICE_CREDITS_25)
    case "credits_100":
      return getSetting(STRIPE_KEYS.PRICE_CREDITS_100)
    case "credits_400":
      return getSetting(STRIPE_KEYS.PRICE_CREDITS_400)
    default:
      return null
  }
}

// Reverse lookup for one-off credit pack purchases — used by the webhook
// when `checkout.session.completed` fires in mode=payment.
export async function getCreditPackByPriceId(priceId: string): Promise<string | null> {
  if (!priceId) return null
  const [p25, p100, p400] = await Promise.all([
    getSetting(STRIPE_KEYS.PRICE_CREDITS_25),
    getSetting(STRIPE_KEYS.PRICE_CREDITS_100),
    getSetting(STRIPE_KEYS.PRICE_CREDITS_400),
  ])
  if (priceId === p25) return "credits_25"
  if (priceId === p100) return "credits_100"
  if (priceId === p400) return "credits_400"
  return null
}
