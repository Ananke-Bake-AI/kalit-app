import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { APP_BASE_URL } from "@/lib/config"
import { GLOSSARY, GLOSSARY_CATEGORIES } from "@/lib/glossary"
import { isValidLocale, localePath, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import s from "./glossary.module.scss"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const g = (await getPageStrings(locale)).glossary
  return MetadataSeo({
    fullTitle: g.metaTitle,
    description: g.metaDescription,
    locale,
    pathname: "/glossary"
  })
}

export default async function GlossaryIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const g = (await getPageStrings(locale)).glossary
  const base = APP_BASE_URL.toString().replace(/\/$/, "")

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Kalit AI Glossary",
    description: g.metaDescription,
    url: `${base}${localePath("/glossary", locale)}`,
    hasDefinedTerm: GLOSSARY.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.short,
      url: `${base}${localePath(`/glossary/${t.slug}`, locale)}`
    }))
  }

  return (
    <>
      <PageSection>
        <Container>
          <PageHeader title={g.title} description={g.description} />
          {GLOSSARY_CATEGORIES.map((cat) => {
            const terms = GLOSSARY.filter((t) => t.category === cat)
            if (!terms.length) return null
            return (
              <div key={cat} className={s.group}>
                <h2 className={s.groupTitle}>{cat}</h2>
                <div className={s.grid}>
                  {terms.map((t) => (
                    <Link key={t.slug} href={`/glossary/${t.slug}`} className={s.card}>
                      <strong>{t.term}</strong>
                      <span>{t.short}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </Container>
      </PageSection>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  )
}
