"use client"

import { Link } from "@/components/link"
import type { BillingSummary } from "@/lib/billing-summary"
import { useTranslation } from "@/stores/i18n"
import clsx from "clsx"
import s from "./billing-badge.module.scss"

/**
 * Persistent billing pill in the global header, on every authenticated page.
 *
 * Shows the org's live credit consumption — plan name · remaining/total + a
 * thin usage bar — on EVERY tier. Free users used to see ONLY a bright
 * "Upgrade" pill, which hid their own usage; now they get the same consumption
 * view plus a small upgrade arrow (the whole pill still links to
 * /settings/billing, so the upgrade path stays one tap away).
 *
 * Credit numbers are rounded for display — the raw credit math carries Decimal
 * float dust (e.g. 12.6499999); gating still uses the exact values server-side.
 */
interface BillingBadgeProps {
  summary: BillingSummary | null
  className?: string
}

export function BillingBadge({ summary, className }: BillingBadgeProps) {
  const t = useTranslation()

  if (!summary) return null

  const isFree = summary.planKey === "free" && !summary.isPaid
  const total = Math.round(summary.total)
  const remaining = Math.round(summary.remaining)
  const usedPct = total > 0 ? Math.min(100, Math.round((summary.used / total) * 100)) : 0
  // Low-credit nudge when remaining < 20% of the pool (amber bar + tint).
  const lowCredits = total > 0 && remaining < total * 0.2

  return (
    <Link
      href="/settings/billing"
      className={clsx(s.badge, s.paid, isFree && s.free, lowCredits && s.warn, className)}
    >
      <span className={s.planName}>{summary.planName}</span>
      <span className={s.divider}>·</span>
      <span className={s.credits}>
        {remaining}
        <span className={s.creditsTotal}>/{total}</span>
      </span>
      <span className={s.bar}>
        <span style={{ width: `${usedPct}%` }} />
      </span>
      {isFree && (
        <span className={s.upIcon} title={t("billing.upgrade")} aria-hidden="true">
          ↗
        </span>
      )}
    </Link>
  )
}
