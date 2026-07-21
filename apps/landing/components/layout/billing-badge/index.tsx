"use client"

import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import type { BillingSummary } from "@/lib/billing-summary"
import { useTranslation } from "@/stores/i18n"
import clsx from "clsx"
import s from "./billing-badge.module.scss"

/**
 * Persistent billing CTA in the global header. Visible on every
 * authenticated page so the upgrade path is always one click away —
 * specifically the moment Free users decide they want more, the path
 * to /settings/billing is right there next to their avatar.
 *
 * Two visual states:
 *   - Free             → bright "Upgrade" pill (highest contrast, accent gradient)
 *   - Paid             → muted "Plan · X cr" pill with a thin usage bar
 *
 * Always links to /settings/billing. No close button — this is the CTA,
 * not a banner.
 */
interface BillingBadgeProps {
  summary: BillingSummary | null
  className?: string
}

export function BillingBadge({ summary, className }: BillingBadgeProps) {
  const t = useTranslation()

  if (!summary) return null

  const isFree = summary.planKey === "free" && !summary.isPaid
  const usedPct = summary.total > 0
    ? Math.min(100, Math.round((summary.used / summary.total) * 100))
    : 0

  // Free — straight Upgrade pill
  if (isFree) {
    return (
      <Link href="/settings/billing" className={clsx(s.badge, s.accent, className)}>
        <Icon icon="hugeicons:rocket-02" className={s.icon} />
        <span className={s.cta}>{t("billing.upgrade")}</span>
      </Link>
    )
  }

  // Paid — show plan name + credit count + thin bar.
  // Low-credit warning when remaining < 20% of total nudges them toward
  // a top-up before they hit zero mid-job.
  const lowCredits = summary.total > 0 && summary.remaining < summary.total * 0.2

  return (
    <Link
      href="/settings/billing"
      className={clsx(s.badge, s.paid, lowCredits && s.warn, className)}
    >
      <span className={s.planName}>{summary.planName}</span>
      <span className={s.divider}>·</span>
      <span className={s.credits}>
        {summary.remaining}
        <span className={s.creditsTotal}>/{summary.total}</span>
      </span>
      <span className={s.bar}>
        <span style={{ width: `${usedPct}%` }} />
      </span>
    </Link>
  )
}
