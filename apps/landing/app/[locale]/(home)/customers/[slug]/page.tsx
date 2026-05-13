import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { notFound } from "next/navigation"
import { CASE_STUDIES, getCaseStudy } from "../data"
import s from "../customers.module.scss"

export async function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const cs = getCaseStudy(slug)
  if (!cs) {
    return MetadataSeo({
      fullTitle: "Case study not found - Kalit AI",
      description: "This case study doesn't exist.",
      locale,
      pathname: "/customers",
      noIndex: true
    })
  }
  return MetadataSeo({
    fullTitle: `${cs.customer} - Kalit AI customer story`,
    description: cs.oneLiner,
    locale,
    pathname: `/customers/${cs.slug}`,
    type: "article",
    noIndex: cs.comingSoon
  })
}

export default async function CaseStudyPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cs = getCaseStudy(slug)
  if (!cs) notFound()

  return (
    <PageSection>
      <Container>
        <div className={s.detail}>
          <Link href="/customers" className={s.backLink}>← All customers</Link>
          <PageHeader title={cs.customer} description={cs.oneLiner} />
          <div className={s.metaRow}>
            <span>{cs.industry}</span>
            <span>{cs.useCase}</span>
            <span>{cs.result}</span>
          </div>

          {cs.comingSoon ? (
            <div className={s.placeholder}>
              <p>
                <strong>Detailed story coming soon.</strong> We're working with this team
                through their launch sprint and will publish the full case study once they
                ship.
              </p>
              <p>
                Want to be featured here? <Link href="/contact-us">Tell us what you're building.</Link>
              </p>
            </div>
          ) : cs.body ? (
            <div className={s.body}>
              <h3>Background</h3>
              <p>{cs.body.background}</p>
              <h3>Approach</h3>
              <p>{cs.body.approach}</p>
              <h3>Outcome</h3>
              <p>{cs.body.outcome}</p>
              {cs.body.quote && (
                <blockquote className={s.quote}>
                  {cs.body.quote.text}
                  <cite>— {cs.body.quote.author}, {cs.body.quote.role}</cite>
                </blockquote>
              )}
            </div>
          ) : null}
        </div>
      </Container>
    </PageSection>
  )
}
