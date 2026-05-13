import { Container } from "@/components/container"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { CREDIT_PACKS, FREE_PLAN, PLANS } from "@/lib/plans"
import { PricingCta, PricingPackCta } from "./pricing-cta"
import s from "./pricing.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Pricing - Kalit AI",
    description:
      "Simple, transparent pricing for the Kalit AI software factory. Free plan, paid tiers for solo builders, agencies and teams. Pentest and Search included on Enterprise.",
    locale,
    pathname: "/pricing"
  })
}

const dollars = (cents: number) => `$${(cents / 100).toFixed(0)}`

const ALL_PLANS = [FREE_PLAN, ...PLANS]

const PLAN_OUTCOME: Record<string, string> = {
  free: "Try Kalit Flow with 3 generations. No card required.",
  starter: "Ship one polished landing site or small MVP per month.",
  pro: "Build and iterate a full product, or run agency client work.",
  enterprise: "Run Flow + Pentest + Search with unlimited seats."
}

const PLAN_CTA: Record<string, { label: string; href: string }> = {
  free: { label: "Start free", href: "/register" },
  starter: { label: "Start Starter", href: "/register?plan=starter" },
  pro: { label: "Start Pro", href: "/register?plan=pro" },
  enterprise: { label: "Talk to us", href: "/contact-us" }
}

const FAQS = [
  {
    q: "What is one credit?",
    a: "Credits are the underlying usage unit. As a rough guide: ~1 credit per page generation in Flow, ~10–15 credits for an MVP build run, ~5 credits per Pentest scan. Exact costs depend on project size and the specialist agents involved. You'll always see the credit cost before a run kicks off."
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from the dashboard, no questions asked. Your plan stays active until the end of the current billing period, then drops to Free."
  },
  {
    q: "Do unused credits roll over?",
    a: "Monthly subscription credits don't roll over — they reset on each renewal. One-time credit packs you purchase on top of a subscription stay on your account until used."
  },
  {
    q: "Is Pentest available on Pro?",
    a: "Pentest is included on Enterprise. We're rolling it out to Pro on a beta basis — join the Pentest waitlist from your dashboard or contact us for early access."
  },
  {
    q: "Do you offer agency or volume pricing?",
    a: "Yes. If you ship client work, run more than 10 seats, or need a tailored credit allocation, contact us — we have an agency partner plan."
  },
  {
    q: "What about education or non-profit discounts?",
    a: "We offer discounted Pro plans for students, educators and registered non-profits. Email contact@kalit.ai from your institutional address."
  },
  {
    q: "Where is my data stored?",
    a: "Kalit AI is operated by Merkle Tech Labs LTD. (Malta). Data is processed in EU regions. See our Privacy Policy and Security pages for the full picture, including subprocessors and encryption."
  },
  {
    q: "Can I run Pentest on any site?",
    a: "No. Pentest is only for targets you own or are explicitly authorized to test. See our Responsible Use page before running a scan."
  }
]

export default async function PricingPage() {
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
    url: `https://kalit.ai${PLAN_CTA[plan.key]?.href ?? "/register"}`
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
      <Container>
        <PageHeader
          title="Simple pricing. One AI software factory."
          description="Free to try. Paid plans scale by credits and seats. Pentest and Search included on Enterprise."
        />

        <div className={s.plansGrid}>
          {ALL_PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`${s.planCard} ${plan.popular ? s.popular : ""}`}
            >
              {plan.popular && <span className={s.popularBadge}>Most chosen</span>}
              <h2 className={s.planName}>{plan.name}</h2>
              <div className={s.priceRow}>
                <span className={s.price}>{dollars(plan.monthlyPrice)}</span>
                <span className={s.interval}>/ month</span>
              </div>
              <p className={s.outcome}>{PLAN_OUTCOME[plan.key]}</p>
              <ul className={s.features}>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <PricingCta
                planKey={plan.key}
                label={PLAN_CTA[plan.key]?.label ?? "Get started"}
                signedOutHref={PLAN_CTA[plan.key]?.href ?? "/register"}
                className={`${s.cta} ${plan.key === "free" || plan.key === "enterprise" ? s.secondary : ""}`}
              />
            </div>
          ))}
        </div>

        <h2 className={s.sectionTitle}>Top up with credit packs</h2>
        <p className={s.creditsNote}>
          One-time packs sit on top of your subscription. Useful for a busy launch week or a single Pentest scan.
        </p>
        <div className={s.packsRow}>
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.key} className={`${s.packCard} ${pack.popular ? s.popular : ""}`}>
              <span className={s.packCredits}>{pack.credits} credits</span>
              <span className={s.packPrice}>{dollars(pack.priceCents)} one-time</span>
              <PricingPackCta
                packKey={pack.key}
                credits={pack.credits}
                className={s.packCta}
              />
            </div>
          ))}
        </div>

        <h2 className={s.sectionTitle}>Pricing FAQ</h2>
        <div className={s.faqList}>
          {FAQS.map((faq, i) => (
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
