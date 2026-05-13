import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { notFound } from "next/navigation"
import { ALTERNATIVES, getAlternative } from "../data"
import type { CapValue } from "../../compare/data"
import s from "../../compare/compare.module.scss"

export async function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const alt = getAlternative(slug)
  if (!alt) {
    return MetadataSeo({
      fullTitle: "Alternative not found - Kalit AI",
      description: "This alternatives page doesn't exist.",
      locale,
      pathname: "/alternatives",
      noIndex: true
    })
  }
  const a = (await getPageStrings(locale)).alternatives
  return MetadataSeo({
    fullTitle: a.pageTitle.replace(/\{name\}/g, alt.competitorName) + " - Kalit AI",
    description: a.competitors[alt.stringsKey].searchHook,
    locale,
    pathname: `/alternatives/${alt.slug}`
  })
}

const CELL_CLS: Record<CapValue, string> = {
  yes: "cellYes",
  partial: "cellPartial",
  no: "cellNo"
}

export default async function AlternativePage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const alt = getAlternative(slug)
  if (!alt) notFound()

  const strings = await getPageStrings(locale)
  const a = strings.alternatives
  const c = strings.compare
  const altStrings = a.competitors[alt.stringsKey]

  const cellLabel = (v: CapValue) =>
    v === "yes" ? c.cellYes : v === "partial" ? c.cellPartial : c.cellNo

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={a.pageTitle.replace(/\{name\}/g, alt.competitorName)}
          description={altStrings.searchHook}
        />

        <div className={s.whenGrid}>
          <div className={s.whenCard}>
            <h3>{a.whyLeaveTitle.replace(/\{name\}/g, alt.competitorName)}</h3>
            <ul>
              {altStrings.whyLeave.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className={s.whenCard}>
            <h3>{a.whyKalitTitle}</h3>
            <ul>
              {altStrings.whyKalit.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{c.capabilityHeader}</th>
                <th>{c.kalitColumn}</th>
                <th>{alt.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {alt.competitor.capabilities.map((row, i) => {
                const label = c.capabilities[i]?.replace(/\{name\}/g, alt.competitorName) ?? ""
                return (
                  <tr key={i}>
                    <td>{label}</td>
                    <td className={s[CELL_CLS[row.kalit]]}>{cellLabel(row.kalit)}</td>
                    <td className={s[CELL_CLS[row.competitor]]}>{cellLabel(row.competitor)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={s.cta}>
          <Link href="/register">{a.cta}</Link>
        </div>
      </Container>
    </PageSection>
  )
}
