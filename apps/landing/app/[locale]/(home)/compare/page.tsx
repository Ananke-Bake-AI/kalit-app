import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { COMPETITORS } from "./data"
import s from "../blog/blog.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Compare Kalit AI to other AI app builders",
    description:
      "Side-by-side comparisons of Kalit AI vs Lovable, Base44, Emergent and Bolt — capability matrices, when to pick which, and the differences that matter for launch.",
    locale,
    pathname: "/compare"
  })
}

export default function CompareIndex() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Compare Kalit AI"
          description="Honest side-by-sides against the AI app builders you're probably also evaluating."
        />
        <div className={s.index}>
          {COMPETITORS.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`} className={s.card}>
              <h2 className={s.cardTitle}>Kalit AI vs {c.name}</h2>
              <p className={s.cardDesc}>{c.oneLiner}</p>
            </Link>
          ))}
        </div>
      </Container>
    </PageSection>
  )
}
