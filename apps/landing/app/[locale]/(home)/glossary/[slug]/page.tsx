import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageSection } from "@/components/page-section"
import { APP_BASE_URL } from "@/lib/config"
import { GLOSSARY, getTerm } from "@/lib/glossary"
import { isValidLocale, localePath, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import s from "../glossary.module.scss"

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ slug: t.slug }))
}

export const dynamicParams = false

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const term = getTerm(slug)
  const g = (await getPageStrings(locale)).glossary
  if (!term) {
    return MetadataSeo({
      fullTitle: "Term not found - Kalit AI",
      description: "This glossary term doesn't exist.",
      locale,
      pathname: "/glossary",
      noIndex: true
    })
  }
  return MetadataSeo({
    fullTitle: `${term.term} — ${g.metaTermSuffix} — Kalit AI`,
    description: term.short,
    locale,
    pathname: `/glossary/${term.slug}`,
    keywords: [term.term]
  })
}

export default async function GlossaryTermPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const term = getTerm(slug)
  if (!term) notFound()

  const g = (await getPageStrings(locale)).glossary
  const related = GLOSSARY.filter((t) => t.category === term.category && t.slug !== term.slug).slice(0, 4)
  const base = APP_BASE_URL.toString().replace(/\/$/, "")
  const url = `${base}${localePath(`/glossary/${term.slug}`, locale)}`

  const definedTermJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.short,
    inDefinedTermSet: `${base}${localePath("/glossary", locale)}`,
    url
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Glossary", item: `${base}${localePath("/glossary", locale)}` },
      { "@type": "ListItem", position: 2, name: term.term, item: url }
    ]
  }

  return (
    <>
      <PageSection>
        <Container>
          <article className={s.term}>
            <Link href="/glossary" className={s.back}>
              {g.backLink}
            </Link>
            <h1 className={s.termTitle}>{term.term}</h1>
            <p className={s.lede}>{term.short}</p>
            <div className={s.body}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{term.body}</ReactMarkdown>
            </div>

            {related.length > 0 && (
              <section className={s.related}>
                <h2>{g.relatedTitle}</h2>
                <div className={s.grid}>
                  {related.map((r) => (
                    <Link key={r.slug} href={`/glossary/${r.slug}`} className={s.card}>
                      <strong>{r.term}</strong>
                      <span>{r.short}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        </Container>
      </PageSection>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  )
}
