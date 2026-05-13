import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageSection } from "@/components/page-section"
import { APP_BASE_URL } from "@/lib/config"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { getPostBySlug, listAllPublishedSlugs, listRelatedPosts } from "../posts-server"
import { ReadingProgress } from "../reading-progress"
import { Toc } from "../toc"
import s from "../blog.module.scss"

export async function generateStaticParams() {
  const slugs = await listAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export const revalidate = 60

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
    image: post.ogImageUrl || post.coverImageUrl || undefined,
    keywords: post.tags.length ? post.tags : undefined
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

export default async function BlogPostPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale: raw, slug } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const post = await getPostBySlug(slug, locale)
  if (!post) notFound()

  const related = await listRelatedPosts(post.slug, post.tags, locale, 3)
  const headings = extractHeadings(post.body)

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
                ← All posts
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
                    {fmtDate(post.publishedAt)} · {post.readingMinutes} min read
                  </span>
                </div>
                <div className={s.shareRow}>
                  <a
                    className={s.shareBtn}
                    href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Share on X"
                    title="Share on X"
                  >
                    𝕏
                  </a>
                  <a
                    className={s.shareBtn}
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Share on LinkedIn"
                    title="Share on LinkedIn"
                  >
                    in
                  </a>
                  <a
                    className={s.shareBtn}
                    href={`https://news.ycombinator.com/submitlink?u=${shareUrl}&t=${shareText}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Share on Hacker News"
                    title="Share on Hacker News"
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

              {related.length > 0 && (
                <section className={s.related}>
                  <h3>Keep reading</h3>
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

            <Toc items={headings} />
          </article>
        </Container>
      </PageSection>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  )
}
