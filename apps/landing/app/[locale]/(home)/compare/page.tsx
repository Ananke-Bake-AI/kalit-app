import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { Logotype } from "@/components/logotype"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { COMPETITORS } from "./data"
import s from "./compare-index.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).compare
  return MetadataSeo({
    fullTitle: c.metaTitleIndex,
    description: c.metaDescriptionIndex,
    locale,
    pathname: "/compare"
  })
}

export default async function CompareIndex({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const c = (await getPageStrings(locale)).compare

  return (
    <PageSection>
      <Container>
        <PageHeader title={c.indexTitle} description={c.indexDescription} />

        <div className={s.grid}>
          {COMPETITORS.map((comp) => {
            const cs = c.competitors[comp.stringsKey]
            // Surface the first three "When to pick Kalit" bullets as a
            // teaser preview — gives the user a real reason to click
            // through instead of just a generic "vs X" tile.
            const highlights = cs.whenToPickKalit.slice(0, 3)
            return (
              <Link key={comp.slug} href={`/compare/${comp.slug}`} className={s.card}>
                <div className={s.versus}>
                  <div className={s.brandKalit}>
                    <Logotype />
                  </div>
                  <span className={s.vs}>VS</span>
                  <div className={s.brandRival}>
                    <span className={s.rivalName}>{comp.name}</span>
                  </div>
                </div>

                <h2 className={s.title}>Kalit AI vs {comp.name}</h2>
                <p className={s.lede}>{cs.oneLiner}</p>

                {highlights.length > 0 && (
                  <ul className={s.highlights}>
                    {highlights.map((h, i) => (
                      <li key={i}>
                        <Icon icon="hugeicons:checkmark-circle-02" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <span className={s.cta}>
                  {c.cta}
                  <Icon icon="hugeicons:arrow-right-01" />
                </span>
              </Link>
            )
          })}
        </div>
      </Container>
    </PageSection>
  )
}
