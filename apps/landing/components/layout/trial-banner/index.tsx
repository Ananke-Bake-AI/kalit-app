"use client"

import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { useBillingSummary } from "@/lib/use-billing-summary"
import { useTranslation } from "@/stores/i18n"
import { useState } from "react"
import s from "./trial-banner.module.scss"

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
  const [dismissed, setDismissed] = useState(false)

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
        onClick={() => setDismissed(true)}
        aria-label={t("common.dismiss")}
      >
        <Icon icon="hugeicons:cancel-01" />
      </button>
    </div>
  )
}
