import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { ALTERNATIVES } from "./data"
import s from "../blog/blog.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Kalit AI alternatives — the AI software factory",
    description:
      "Considering a Lovable, Base44 or Bolt alternative? Kalit AI is the multi-suite software factory built for shipping, not just generating.",
    locale,
    pathname: "/alternatives"
  })
}

export default function AlternativesIndex() {
  return (
    <PageSection>
      <Container>
        <PageHeader
          title="Alternatives to AI app builders"
          description="If you're evaluating another tool, here's where Kalit AI fits."
        />
        <div className={s.index}>
          {ALTERNATIVES.map((a) => (
            <Link key={a.slug} href={`/alternatives/${a.slug}`} className={s.card}>
              <h2 className={s.cardTitle}>The best {a.competitorName} alternative</h2>
              <p className={s.cardDesc}>{a.searchHook}</p>
            </Link>
          ))}
        </div>
      </Container>
    </PageSection>
  )
}
