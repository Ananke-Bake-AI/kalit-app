import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
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
  return MetadataSeo({
    fullTitle: `The best ${alt.competitorName} alternative — Kalit AI`,
    description: alt.searchHook,
    locale,
    pathname: `/alternatives/${alt.slug}`
  })
}

const CELL: Record<CapValue, { label: string; cls: string }> = {
  yes: { label: "Yes", cls: "cellYes" },
  partial: { label: "Partial", cls: "cellPartial" },
  no: { label: "No", cls: "cellNo" }
}

export default async function AlternativePage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const alt = getAlternative(slug)
  if (!alt) notFound()

  return (
    <PageSection>
      <Container>
        <PageHeader
          title={`The best ${alt.competitorName} alternative`}
          description={alt.searchHook}
        />

        <div className={s.whenGrid}>
          <div className={s.whenCard}>
            <h3>Why people leave {alt.competitorName}</h3>
            <ul>
              {alt.whyLeave.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <div className={s.whenCard}>
            <h3>What Kalit AI adds</h3>
            <ul>
              {alt.whyKalit.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        </div>

        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Capability</th>
                <th>Kalit AI</th>
                <th>{alt.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {alt.competitor.capabilities.map((row, i) => (
                <tr key={i}>
                  <td>{row.label}</td>
                  <td className={s[CELL[row.kalit].cls]}>{CELL[row.kalit].label}</td>
                  <td className={s[CELL[row.competitor].cls]}>{CELL[row.competitor].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={s.cta}>
          <Link href="/register">Try Kalit AI — free</Link>
        </div>
      </Container>
    </PageSection>
  )
}
