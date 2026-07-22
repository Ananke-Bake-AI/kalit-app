import { Container } from "@/components/container"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { formatLocalizedPrices } from "@/lib/currency"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { CREDIT_PACKS, FREE_PLAN, PLANS } from "@/lib/plans"
import { getPublicModels, modelMatrix, tierRank } from "@/lib/model-tiers"
import { PricingCta, PricingPackCta } from "./pricing-cta"
import { PricingViewed } from "./pricing-viewed"
import s from "./pricing.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const p = (await getPageStrings(locale)).pricing
  return MetadataSeo({
    fullTitle: p.metaTitle,
    description: p.metaDescription,
    locale,
    pathname: "/pricing"
  })
}

const ALL_PLANS = [FREE_PLAN, ...PLANS]

type PlanKey = "free" | "starter" | "pro" | "enterprise" | "custom"

const PLAN_CTA: Record<PlanKey, { href: string }> = {
  free: { href: "/register" },
  starter: { href: "/register?plan=starter" },
  pro: { href: "/register?plan=pro" },
  enterprise: { href: "/register?plan=enterprise" },
  custom: { href: "/contact-us" }
}

export default async function PricingPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const p = (await getPageStrings(locale)).pricing

  // Localize all plan + credit-pack prices in one detection pass so we
  // don't re-detect / re-fetch FX rates for each card. The first slot
  // (FREE) is $0 — it formats to "$0" / "0,00 €" but we render "$0"
  // verbatim anyway for that card.
  const planPrices = await formatLocalizedPrices(ALL_PLANS.map((p) => p.monthlyPrice))
  const packPrices = await formatLocalizedPrices(CREDIT_PACKS.map((c) => c.priceCents))
  const showFxDisclaimer = planPrices.some((p) => p.converted)

  // Model access matrix — derived live from the broker-owned flow_models catalogue
  // (families + min tier), so it tracks whatever the admin has enabled/re-tiered.
  const modelMatrixRows = modelMatrix(await getPublicModels())

  const offers = ALL_PLANS.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: (plan.monthlyPrice / 100).toFixed(2),
    priceCurrency: "USD",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: (plan.monthlyPrice / 100).toFixed(2),
      priceCurrency: "USD",
      billingDuration: "P1M"
    },
    availability: "https://schema.org/InStock",
    url: `https://kalit.ai${PLAN_CTA[plan.key as PlanKey]?.href ?? "/register"}`
  }))

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Kalit AI",
    description:
      "AI software factory that builds, secures and grows your product. Includes Flow (app builder), Pentest (autonomous security scans), Search (market research).",
    brand: { "@type": "Brand", name: "Kalit AI" },
    offers
  }

  return (
    <PageSection>
      <PricingViewed />
      <Container>
        <PageHeader title={p.title} description={p.description} />

        <div className={s.plansGrid}>
          {ALL_PLANS.map((plan, i) => {
            const key = plan.key as PlanKey
            return (
              <div
                key={plan.key}
                className={`${s.planCard} ${plan.popular ? s.popular : ""}`}
              >
                {plan.popular && <span className={s.popularBadge}>{p.popularBadge}</span>}
                <h2 className={s.planName}>{plan.name}</h2>
                <div className={s.priceRow}>
                  <span className={s.price}>{planPrices[i].display}</span>
                  <span className={s.interval}>{p.intervalMonth}</span>
                </div>
                <p className={s.outcome}>{p.planOutcomes[key]}</p>
                <ul className={s.features}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                {p.moreUsage[key as keyof typeof p.moreUsage] && (
                  <p className={s.usageNote}>
                    <span className={s.usageNoteLabel}>{p.moreUsage.label}</span>
                    <span className={s.usageNoteStar}>
                      {p.moreUsage[key as keyof typeof p.moreUsage]}
                    </span>
                  </p>
                )}
                <PricingCta
                  planKey={plan.key}
                  label={p.planCtas[key]}
                  signedOutHref={PLAN_CTA[key]?.href ?? "/register"}
                  className={`${s.cta} ${plan.key === "free" ? s.secondary : ""}`}
                />
              </div>
            )
          })}

        </div>

        {/* Custom plan — separate horizontal callout below the 4-card
            self-serve grid. Five cards on one row got visually crowded
            and made every card narrower than it should be. Custom is
            an inherently different offer (contact-sales, not Stripe
            Checkout) so a different visual treatment also reinforces
            that — narrow tagline row + features inline + CTA at the
            end, instead of a full vertical card. */}
        <aside className={s.customBanner}>
          <div className={s.customCopy}>
            <span className={s.customLabel}>{p.customPlanName}</span>
            <h3 className={s.customTitle}>{p.planOutcomes.custom}</h3>
            <ul className={s.customFeaturesInline}>
              {p.customFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <PricingCta
            planKey="custom"
            label={p.planCtas.custom}
            signedOutHref={PLAN_CTA.custom.href}
            className={s.customCta}
          />
        </aside>

        {/* AI models by plan — open, titled comparison matrix, derived live from
            flow_models (families x tiers, cumulative). Placed right under the plans
            so users immediately see which models each tier unlocks. */}
        {modelMatrixRows.length > 0 && (
          <section className={s.modelsSection}>
            <h2 className={s.sectionTitle}>{p.modelsTitle}</h2>
            <p className={s.modelsNote}>{p.modelsNote}</p>
            <div className={s.modelsTableWrap}>
              <table className={s.modelsTable}>
                <thead>
                  <tr>
                    <th scope="col">{p.modelsColLabel}</th>
                    {ALL_PLANS.map((pl) => (
                      <th scope="col" key={pl.key}>{pl.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modelMatrixRows.map((row) => (
                    <tr key={row.family}>
                      <th scope="row">{row.family}</th>
                      {ALL_PLANS.map((pl) => {
                        const on = row.rank <= tierRank(pl.key)
                        return (
                          <td key={pl.key} data-on={on}>
                            <span aria-hidden="true">{on ? "✓" : "–"}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showFxDisclaimer && (
          <p className={s.fxDisclaimer}>{p.fxDisclaimer}</p>
        )}

        <h2 className={s.sectionTitle}>{p.packsTitle}</h2>
        <p className={s.creditsNote}>{p.packsNote}</p>
        <div className={s.packsRow}>
          {CREDIT_PACKS.map((pack, i) => (
            <div key={pack.key} className={`${s.packCard} ${pack.popular ? s.popular : ""}`}>
              <span className={s.packCredits}>
                {pack.credits} {p.creditsLabel}
              </span>
              <span className={s.packPrice}>
                {packPrices[i].display} {p.oneTimeLabel}
              </span>
              <PricingPackCta packKey={pack.key} credits={pack.credits} className={s.packCta} />
            </div>
          ))}
        </div>

        <h2 className={s.sectionTitle}>{p.faqTitle}</h2>
        <div className={s.faqList}>
          {p.faqs.map((faq, i) => (
            <details key={i} name="pricing-faq">
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      </Container>
    </PageSection>
  )
}
