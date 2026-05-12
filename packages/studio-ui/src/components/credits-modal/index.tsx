"use client"

import { useEffect } from "react"
import { useI18n } from "@kalit/i18n/react"
import { Icon } from "../../primitives/icon"
import s from "./credits-modal.module.scss"

interface CreditsModalPlan {
  key: string
  name: string
  /** Price already formatted (e.g. "$29"). */
  price: string
  /** Credits per month, formatted as a plain number string. */
  credits: number
  popular?: boolean
}

interface CreditsModalProps {
  open: boolean
  onClose: () => void
  /** Billing portal URL — typically "/settings/billing" on the landing host. */
  billingHref: string
  /** Plans shown inline. Caller decides which (usually all 3 paid tiers). */
  plans: CreditsModalPlan[]
  /** Defaults to "out_of_credits" — used to swap copy between the
   *  hard-block "you just hit zero" state and the soft-nudge
   *  "running low" state. */
  mode?: "out_of_credits" | "low_credits"
}

/**
 * Blocking-ish modal that surfaces the three subscription plans inline
 * when the user runs out of credits mid-session, or as a soft nudge
 * when they cross the low-credit threshold. Both states route to
 * /settings/billing for actual purchase — this modal exists purely as
 * the highest-intent conversion moment we have in the app (user wants
 * to send a message NOW, can't, needs to upgrade NOW).
 *
 * Generic enough to live in the shared studio-ui package: takes the
 * billing URL + the plan list as props so the landing can use its
 * own pricing model without the package taking a dependency on
 * lib/plans.ts.
 */
export function CreditsModal({ open, onClose, billingHref, plans, mode = "out_of_credits" }: CreditsModalProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const title = mode === "out_of_credits"
    ? t("studio.outOfCreditsModalTitle")
    : t("studio.lowCreditsModalTitle")
  const body = mode === "out_of_credits"
    ? t("studio.outOfCreditsModalBody")
    : t("studio.lowCreditsModalBody")

  return (
    <div className={s.overlay} onClick={onClose} role="presentation">
      <div className={s.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className={s.close} onClick={onClose} aria-label={t("common.dismiss")}>
          <Icon icon="hugeicons:cancel-01" />
        </button>

        <div className={s.icon}>
          <Icon icon={mode === "out_of_credits" ? "hugeicons:credit-card" : "hugeicons:alert-02"} />
        </div>

        <h2 className={s.title}>{title}</h2>
        <p className={s.body}>{body}</p>

        <div className={s.plans}>
          {plans.map((plan) => (
            <a key={plan.key} href={billingHref} className={`${s.plan} ${plan.popular ? s.popular : ""}`}>
              <span className={s.planName}>{plan.name}</span>
              <span className={s.planPrice}>
                <span className={s.planPriceAmount}>{plan.price}</span>
                <span className={s.planPriceSuffix}>/mo</span>
              </span>
              <span className={s.planCredits}>
                {t("studio.creditsPerMonthLine", { credits: plan.credits })}
              </span>
              {plan.popular ? <span className={s.planBadge}>{t("studio.mostSelected")}</span> : null}
            </a>
          ))}
        </div>

        <div className={s.footer}>
          <a href={billingHref} className={s.primaryCta}>
            {t("studio.openBilling")}
            <Icon icon="hugeicons:arrow-right-01" />
          </a>
          <button className={s.dismiss} onClick={onClose}>
            {t("studio.maybeLater")}
          </button>
        </div>
      </div>
    </div>
  )
}
