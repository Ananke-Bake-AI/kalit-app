import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { formatLocalizedPrices } from "@/lib/currency"
import { PLANS } from "@/lib/plans"
import { getServerTranslation } from "@/lib/i18n-server"
import s from "./upgrade-pitch.module.scss"

/**
 * Free-tier upgrade pitch shown above the dashboard stats. Surfaces the
 * three plan tiles inline (price + key benefit) and routes the click
 * straight to /settings/billing. This is the highest-visibility CTA on
 * the post-login funnel — it lives on every dashboard page load for any
 * org without an active subscription.
 *
 * Render conditionally from the dashboard page (only when planKey is
 * "free"). Hidden once the user subscribes.
 */
export async function UpgradePitch() {
  const { t } = await getServerTranslation()
  const tilePrices = await formatLocalizedPrices(PLANS.map((p) => p.monthlyPrice))

  return (
    <section className={s.pitch}>
      <div className={s.header}>
        <div className={s.copy}>
          <span className={s.eyebrow}>
            <Icon icon="hugeicons:rocket-02" />
            {t("dashboard.pitchEyebrow")}
          </span>
          <h2 className={s.title}>{t("dashboard.pitchTitle")}</h2>
          <p className={s.body}>{t("dashboard.pitchBody")}</p>
        </div>
        <Link href="/settings/billing" className={s.primaryCta}>
          {t("dashboard.pitchSeePlans")}
          <Icon icon="hugeicons:arrow-right-01" />
        </Link>
      </div>
      <div className={s.tiles}>
        {PLANS.map((plan, i) => (
          <Link
            key={plan.key}
            href="/settings/billing"
            className={`${s.tile} ${plan.popular ? s.popular : ""}`}
          >
            <span className={s.tileName}>{plan.name}</span>
            <span className={s.tilePrice}>
              <span className={s.tilePriceAmount}>{tilePrices[i].display}</span>
              <span className={s.tilePriceSuffix}>/mo</span>
            </span>
            <span className={s.tileCredits}>
              {t("dashboard.pitchCreditsLine", { credits: plan.creditsPerMonth })}
            </span>
            {plan.popular ? <span className={s.tileBadge}>{t("settingsPages.mostSelected")}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
