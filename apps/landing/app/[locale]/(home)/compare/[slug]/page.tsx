import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
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
  return MetadataSeo({
    fullTitle: `Kalit AI vs ${comp.name} - Which AI software factory should you pick?`,
    description: comp.oneLiner,
    locale,
    pathname: `/compare/${comp.slug}`
  })
}

const CELL: Record<CapValue, { label: string; cls: string }> = {
  yes: { label: "Yes", cls: "cellYes" },
  partial: { label: "Partial", cls: "cellPartial" },
  no: { label: "No", cls: "cellNo" }
}

export default async function ComparePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const comp = getCompetitor(slug)
  if (!comp) notFound()

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={`Kalit AI vs ${comp.name}`}
          description={comp.competitorOneLiner}
        />

        <p className={s.intro}>{comp.intro}</p>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Capability</th>
                <th>Kalit AI</th>
                <th>{comp.name}</th>
              </tr>
            </thead>
            <tbody>
              {comp.capabilities.map((row, i) => (
                <tr key={i}>
                  <td>{row.label}</td>
                  <td className={s[CELL[row.kalit].cls]}>{CELL[row.kalit].label}</td>
                  <td className={s[CELL[row.competitor].cls]}>{CELL[row.competitor].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={s.whenGrid}>
          <div className={s.whenCard}>
            <h3>Pick {comp.name} when</h3>
            <ul>
              {comp.whenToPick.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className={s.whenCard}>
            <h3>Pick Kalit AI when</h3>
            <ul>
              {comp.whenToPickKalit.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>

        <div className={s.cta}>
          <Link href="/register">Start with Kalit AI — free</Link>
        </div>
      </Container>
    </PageSection>
  )
}
