import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { ALTERNATIVES } from "./data"
import s from "../blog/blog.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const a = (await getPageStrings(locale)).alternatives
  return MetadataSeo({
    fullTitle: a.metaTitleIndex,
    description: a.metaDescriptionIndex,
    locale,
    pathname: "/alternatives"
  })
}

export default async function AlternativesIndex({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const a = (await getPageStrings(locale)).alternatives

  return (
    <PageSection>
      <Container>
        <PageHeader title={a.indexTitle} description={a.indexDescription} />
        <div className={s.index}>
          {ALTERNATIVES.map((alt) => {
            const cs = a.competitors[alt.stringsKey]
            return (
              <Link key={alt.slug} href={`/alternatives/${alt.slug}`} className={s.card}>
                <div className={s.cardBody}>
                  <h2 className={s.cardTitle}>
                    {a.pageTitle.replace(/\{name\}/g, alt.competitorName)}
                  </h2>
                  <p className={s.cardDesc}>{cs.searchHook}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </Container>
    </PageSection>
  )
}
