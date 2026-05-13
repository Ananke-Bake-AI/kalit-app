import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { CASE_STUDIES } from "./data"
import s from "./customers.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Customers - Kalit AI",
    description:
      "Real teams shipping with Kalit AI. Founders, agencies and product teams using Flow and Pentest to launch faster.",
    locale,
    pathname: "/customers"
  })
}

export default function CustomersIndex() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Teams shipping with Kalit AI"
          description="A growing roster of founders, agencies and product teams. Detailed stories drop as our design-partner cohort wraps."
        />
        <div className={s.grid}>
          {CASE_STUDIES.map((c) => (
            <Link key={c.slug} href={`/customers/${c.slug}`} className={s.card}>
              {c.comingSoon && <span className={s.badge}>Coming soon</span>}
              <h2 className={s.customer}>{c.customer}</h2>
              <p className={s.oneLiner}>{c.oneLiner}</p>
              <div className={s.tags}>
                <span>{c.industry}</span>
                <span>{c.useCase}</span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </PageSection>
  )
}
