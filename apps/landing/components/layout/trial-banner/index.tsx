"use client"

import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { useBillingSummary } from "@/lib/use-billing-summary"
import { useTranslation } from "@/stores/i18n"
import { useEffect, useState } from "react"
import s from "./trial-banner.module.scss"

// Re-show at most once per day after a dismissal. The persistent header
// billing pill is the always-on gentle CTA; this top banner is the louder
// nudge, so once the user closes it we stay quiet for a day instead of
// popping back on every nav/refresh (the previous behavior felt like harassment).
const DISMISS_KEY = "kalit-trial-banner-dismissed-at"
const COOLDOWN_MS = 24 * 60 * 60 * 1000

/**
 * Top-of-page nudge for users without a paid Stripe subscription.
 *
 * Two flavors, picked by `summary.isTrial`:
 *   - Trialing (Free + active trial window) → countdown copy
 *     "🎁 N days of free trial left · Pick a plan →"
 *   - Free, trial expired or never started → soft upgrade prompt
 *     "Free plan · 15 credits/mo · Upgrade for more →"
 *
 * Hidden as soon as the org becomes paid. Dismissible per session so a
 * user who just chose to wait doesn't see it on every page nav (we
 * keep dismissal state in component-local React state — it pops back
 * after a full refresh, which is the right behavior for a CTA we
 * actually want noticed).
 *
 * Reads `summary` from `BillingSummaryProvider` instead of a SSR
 * prop — the studio layout no longer blocks on the billing fetch.
 * If the provider hasn't loaded yet (first 100-300 ms), `summary`
 * is null and the banner stays hidden until data arrives.
 */
export function TrialBanner() {
  const t = useTranslation()
  const { summary } = useBillingSummary()
  // Start hidden, then reveal only if there's no recent dismissal in storage.
  // Avoids a flash of the banner before the (client-only) cooldown check.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
      setDismissed(Date.now() - at < COOLDOWN_MS)
    } catch {
      setDismissed(false)
    }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* private mode — best effort */
    }
  }

  if (!summary) return null
  if (summary.isPaid) return null
  if (dismissed) return null

  const trialing = summary.isTrial && summary.trialDaysLeft !== null

  return (
    <div className={`${s.banner} ${trialing ? s.urgent : s.soft}`}>
      <div className={s.content}>
        <Icon icon={trialing ? "hugeicons:gift" : "hugeicons:rocket-02"} />
        {trialing ? (
          <span className={s.text}>
            <strong>{t("billing.trialDaysLeft", { count: summary.trialDaysLeft! })}</strong>
            {" — "}
            {t("billing.trialBannerBody")}
          </span>
        ) : (
          <span className={s.text}>
            <strong>{t("billing.freePlanLabel")}</strong>
            {" — "}
            {t("billing.freeBannerBody", { credits: summary.planMonthly })}
          </span>
        )}
        <Link href="/settings/billing" className={s.cta}>
          {t("billing.pickPlan")}
          <Icon icon="hugeicons:arrow-right-01" />
        </Link>
      </div>
      <button
        className={s.close}
        onClick={dismiss}
        aria-label={t("common.dismiss")}
      >
        <Icon icon="hugeicons:cancel-01" />
      </button>
    </div>
  )
}
