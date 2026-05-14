import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { notFound } from "next/navigation"
import { COMPETITORS, getCompetitor, type CapValue } from "../data"
import s from "../compare.module.scss"

export async function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const comp = getCompetitor(slug)
  if (!comp) {
    return MetadataSeo({
      fullTitle: "Comparison not found - Kalit AI",
      description: "This comparison page doesn't exist.",
      locale,
      pathname: "/compare",
      noIndex: true
    })
  }
  const c = (await getPageStrings(locale)).compare
  const compStrings = c.competitors[comp.stringsKey]
  return MetadataSeo({
    fullTitle: `Kalit AI vs ${comp.name} - Kalit AI`,
    description: compStrings.oneLiner,
    locale,
    pathname: `/compare/${comp.slug}`
  })
}

const CELL_CLS: Record<CapValue, string> = {
  yes: "cellYes",
  partial: "cellPartial",
  no: "cellNo"
}

const CELL_ICON: Record<CapValue, string> = {
  yes: "hugeicons:checkmark-circle-02",
  partial: "hugeicons:minus-sign-circle",
  no: "hugeicons:cancel-circle"
}

export default async function ComparePage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const comp = getCompetitor(slug)
  if (!comp) notFound()

  const c = (await getPageStrings(locale)).compare
  const compStrings = c.competitors[comp.stringsKey]

  const cellLabel = (v: CapValue) =>
    v === "yes" ? c.cellYes : v === "partial" ? c.cellPartial : c.cellNo

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={`Kalit AI vs ${comp.name}`}
          description={compStrings.competitorOneLiner}
        />

        <p className={s.intro}>{compStrings.intro}</p>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{c.capabilityHeader}</th>
                <th>{c.kalitColumn}</th>
                <th>{comp.name}</th>
              </tr>
            </thead>
            <tbody>
              {comp.capabilities.map((row, i) => {
                const label = c.capabilities[i]?.replace(/\{name\}/g, comp.name) ?? ""
                return (
                  <tr key={i}>
                    <td>{label}</td>
                    <td className={s[CELL_CLS[row.kalit]]}>
                      <span className={s.cellIcon} title={cellLabel(row.kalit)}>
                        <Icon icon={CELL_ICON[row.kalit]} />
                      </span>
                    </td>
                    <td className={s[CELL_CLS[row.competitor]]}>
                      <span className={s.cellIcon} title={cellLabel(row.competitor)}>
                        <Icon icon={CELL_ICON[row.competitor]} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={s.whenGrid}>
          <div className={s.whenCard}>
            <h3>{c.pickCompetitorTitle.replace(/\{name\}/g, comp.name)}</h3>
            <ul>
              {compStrings.whenToPick.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className={s.whenCard}>
            <h3>{c.pickKalitTitle}</h3>
            <ul>
              {compStrings.whenToPickKalit.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={s.cta}>
          <Link href="/register">{c.cta}</Link>
        </div>
      </Container>
    </PageSection>
  )
}
