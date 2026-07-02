import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { PageSection } from "@/components/page-section"
import { SUITES, type SuiteId } from "@/lib/suites"
import { APP_BASE_URL } from "@/lib/config"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getPageStrings } from "@/lib/page-strings"
import { getPostBySlug, listAllPublishedSlugs, listRelatedPosts } from "../posts-server"
import { ReadingProgress } from "../reading-progress"
import { Toc } from "../toc"
import s from "../blog.module.scss"

export async function generateStaticParams() {
  const slugs = await listAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export const revalidate = 60

// Map a post's tags to the most relevant suite for the end-of-post CTA.
const TAG_SUITE: Record<string, SuiteId> = {
  security: "pentest",
  pentest: "pentest",
  vulnerability: "pentest",
  flow: "flow",
  engineering: "flow",
  agents: "flow",
  product: "flow",
  launch: "flow",
  "founder-notes": "flow",
  search: "search",
  research: "search",
  market: "search",
  marketing: "marketing"
}

function suiteForTags(tags: string[]): SuiteId {
  for (const tag of tags) {
    const hit = TAG_SUITE[tag.toLowerCase()]
    if (hit) return hit
  }
  return "flow"
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const post = await getPostBySlug(slug, locale)
  if (!post) {
    return MetadataSeo({
      fullTitle: "Post not found - Kalit AI",
      description: "This post doesn't exist or hasn't been published yet.",
      locale,
      pathname: "/blog",
      noIndex: true
    })
  }

  return MetadataSeo({
    fullTitle: `${post.seoTitle || post.title} - Kalit AI`,
    description: post.seoDescription || post.description,
    locale,
    pathname: `/blog/${post.slug}`,
    type: "article",
    // Per-post image: explicit cover/OG if set, else an auto-generated card so
    // the post never shares with the generic site thumbnail.
    image:
      post.ogImageUrl ||
      post.coverImageUrl ||
      `/api/blog/og/${post.slug}${locale === "en" ? "" : `?locale=${locale}`}`,
    keywords: post.tags.length ? post.tags : undefined,
    article: {
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.authorName],
      tags: post.tags,
      section: post.tags[0]
    },
    availableLocales: post.availableLocales
  })
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

interface Heading {
  id: string
  text: string
  level: 2 | 3
}

function extractHeadings(body: string): Heading[] {
  const lines = body.split("\n")
  const out: Heading[] = []
  let inCode = false
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    const h2 = /^##\s+(.+?)\s*$/.exec(line)
    const h3 = /^###\s+(.+?)\s*$/.exec(line)
    if (h2) out.push({ level: 2, text: h2[1], id: slugifyHeading(h2[1]) })
    else if (h3) out.push({ level: 3, text: h3[1], id: slugifyHeading(h3[1]) })
  }
  return out
}

// Extract Q&A pairs from a post's "## FAQ" / "## Frequently Asked Questions" section
// (each "### question" followed by its answer text) so we can emit FAQPage structured
// data. Google shows FAQ rich results and AI answer engines cite these directly — a big
// GEO win. Returns [] for posts without an FAQ section.
function extractFaq(body: string): { q: string; a: string }[] {
  const lines = body.split("\n")
  const start = lines.findIndex((l) =>
    /^(#{2,4})\s+(faq|frequently asked questions)\b/i.test(l.trim())
  )
  if (start === -1) return []
  const level = lines[start].trim().match(/^(#+)/)?.[1].length ?? 2
  const out: { q: string; a: string }[] = []
  let q: string | null = null
  let buf: string[] = []
  const flush = () => {
    const a = buf.join("\n").trim()
    if (q && a) out.push({ q, a })
    q = null
    buf = []
  }
  for (let i = start + 1; i < lines.length; i++) {
    const heading = lines[i].trim().match(/^(#+)\s+(.*)$/)
    if (heading && heading[1].length <= level) break // section ended
    if (heading && heading[1].length === level + 1) {
      flush()
      q = heading[2].trim()
      continue
    }
    if (q) buf.push(lines[i])
  }
  flush()
  return out
}

// JSON-LD must not let a "</script>" inside content close the tag early.
function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c")
}

export default async function BlogPostPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const post = await getPostBySlug(slug, locale)
  if (!post) notFound()

  const b = (await getPageStrings(locale)).blog
  const related = await listRelatedPosts(post.slug, post.tags, locale, 3)
  const headings = extractHeadings(post.body)
  const ctaSuite = SUITES.find((suite) => suite.id === suiteForTags(post.tags)) ?? SUITES[0]

  const fmtDate = (d: Date | null) =>
    d
      ? new Date(d).toLocaleDateString(locale === "en" ? "en-US" : locale, {
          month: "long",
          day: "numeric",
          year: "numeric"
        })
      : ""

  const publicUrl = new URL(`/${locale}/blog/${post.slug}`, APP_BASE_URL).toString()
  const shareText = encodeURIComponent(post.title)
  const shareUrl = encodeURIComponent(publicUrl)

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.ogImageUrl || post.coverImageUrl || `${APP_BASE_URL.toString().replace(/\/$/, "")}/img/thumbnail.jpg`,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Person",
      name: post.authorName
    },
    publisher: {
      "@type": "Organization",
      name: "Kalit AI",
      logo: {
        "@type": "ImageObject",
        url: `${APP_BASE_URL.toString().replace(/\/$/, "")}/img/thumbnail.jpg`
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": publicUrl
    },
    keywords: post.tags.join(", "),
    inLanguage: locale,
    wordCount: post.body.split(/\s+/).filter(Boolean).length
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: new URL(`/${locale}/blog`, APP_BASE_URL).toString() },
      { "@type": "ListItem", position: 2, name: post.title, item: publicUrl }
    ]
  }

  const faqItems = extractFaq(post.body)
  const faqJsonLd =
    faqItems.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: locale,
          mainEntity: faqItems.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a }
          }))
        }
      : null

  const authorInitial = post.authorName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  // react-markdown gets a small heading transformer so anchors line up with
  // the IDs the TOC builds.
  const headingComponents = {
    h2: (props: { children?: React.ReactNode }) => {
      const text = String(props.children)
      return <h2 id={slugifyHeading(text)}>{props.children}</h2>
    },
    h3: (props: { children?: React.ReactNode }) => {
      const text = String(props.children)
      return <h3 id={slugifyHeading(text)}>{props.children}</h3>
    }
  }

  return (
    <>
      <ReadingProgress />
      <PageSection>
        <Container>
          <article className={s.post}>
            <div className={s.postMain}>
              <Link href="/blog" className={s.backLink}>
                {b.allPosts}
              </Link>

              {post.coverImageUrl && (
                <div className={s.postCover}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.coverImageUrl} alt={post.title} />
                </div>
              )}

              {post.tags.length > 0 && (
                <div className={s.eyebrow}>
                  {post.tags.map((tag) => (
                    <span key={tag} className={s.eyebrowTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className={s.postTitle}>{post.title}</h1>
              <p className={s.postLede}>{post.description}</p>

              <div className={s.authorRow}>
                <div className={s.avatar}>
                  {post.authorAvatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={post.authorAvatarUrl} alt={post.authorName} />
                  ) : (
                    authorInitial
                  )}
                </div>
                <div className={s.authorInfo}>
                  <strong>{post.authorName}</strong>
                  <span>
                    {fmtDate(post.publishedAt)} · {post.readingMinutes} {b.minRead}
                  </span>
                </div>
                <div className={s.shareRow}>
                  <a
                    className={s.shareBtn}
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={b.shareX}
                    title={b.shareX}
                  >
                    𝕏
                  </a>
                  <a
                    className={s.shareBtn}
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={b.shareLinkedIn}
                    title={b.shareLinkedIn}
                  >
                    in
                  </a>
                  <a
                    className={s.shareBtn}
                    href={`https://news.ycombinator.com/submitlink?u=${shareUrl}&t=${shareText}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={b.shareHN}
                    title={b.shareHN}
                  >
                    Y
                  </a>
                </div>
              </div>

              <div className={s.body}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={headingComponents}>
                  {post.body}
                </ReactMarkdown>
              </div>

              <aside
                className={s.cta}
                style={{ "--color": ctaSuite.color } as React.CSSProperties}
              >
                <div className={s.ctaIcon} aria-hidden="true">
                  <Logo id={ctaSuite.id} />
                </div>
                <div className={s.ctaText}>
                  <strong>{b.ctaHeading}</strong>
                  <span>{b.ctaText}</span>
                </div>
                <Link href={`/${ctaSuite.id}`} className={s.ctaBtn}>
                  {ctaSuite.button}
                </Link>
              </aside>

              {related.length > 0 && (
                <section className={s.related}>
                  <h3>{b.keepReading}</h3>
                  <div className={s.relatedGrid}>
                    {related.map((r) => (
                      <Link key={r.slug} href={`/blog/${r.slug}`} className={s.relatedCard}>
                        <strong>{r.title}</strong>
                        <span>{r.description}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <Toc items={headings} label={b.onThisPage} />
          </article>
        </Container>
      </PageSection>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSafe(faqJsonLd) }}
        />
      )}
    </>
  )
}
