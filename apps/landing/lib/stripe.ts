import Stripe from "stripe"
import { getStripeSecretKey } from "./settings"

let _stripe: Stripe | null = null
let _stripeKey: string | null = null

// Async version reads the secret from the admin-managed AppSetting
// table. Re-instantiates the SDK if the key has rotated since the last
// call so a fresh admin update takes effect on the next request without
// a server restart.
export async function getStripe(): Promise<Stripe> {
  const key = await getStripeSecretKey()
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY not configured — set it in /admin/settings")
  }
  if (!_stripe || _stripeKey !== key) {
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
    _stripeKey = key
  }
  return _stripe
}

export { Stripe }
