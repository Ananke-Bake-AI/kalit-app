import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { APP_BASE_URL } from "@/lib/config"
import { isValidLocale, localePath, type Locale } from "@/lib/i18n"
import { getServerTranslation } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { listPublishedPosts } from "./posts-server"
import s from "./blog.module.scss"

const fmt = (d: Date | null, locale: string) =>
  d
    ? new Date(d).toLocaleDateString(locale === "en" ? "en-US" : locale, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : ""

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const b = (await getPageStrings(locale)).blog
  const meta = MetadataSeo({
    fullTitle: b.metaTitle,
    description: b.metaDescription,
    locale,
    pathname: "/blog"
  })
  // Advertise the RSS feed for discovery / syndication.
  meta.alternates = {
    ...meta.alternates,
    types: { "application/rss+xml": `${localePath("/blog/rss.xml", locale)}` }
  }
  return meta
}

export default async function BlogIndex({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const b = (await getPageStrings(locale)).blog
  const posts = await listPublishedPosts(locale)

  const [featured, ...rest] = posts

  const base = APP_BASE_URL.toString().replace(/\/$/, "")
  const blogUrl = `${base}${localePath("/blog", locale)}`
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: b.metaTitle,
    description: b.metaDescription,
    url: blogUrl,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: "Kalit AI",
      logo: { "@type": "ImageObject", url: `${base}/img/thumbnail.jpg` }
    },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      url: `${base}${localePath(`/blog/${p.slug}`, locale)}`,
      datePublished: p.publishedAt?.toISOString(),
      dateModified: p.updatedAt.toISOString(),
      author: { "@type": "Person", name: p.authorName },
      keywords: p.tags.join(", ")
    }))
  }

  return (
    <>
    <PageSection>
      <Container>
        <div className={s.indexHeader}>
          <PageHeader title={b.title} description={b.description} />
        </div>

        {!posts.length && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>{b.empty}</p>
        )}

        {featured && (
          <Link href={`/blog/${featured.slug}`} className={s.featured}>
            <div className={s.featuredCover}>
              {featured.coverImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={featured.coverImageUrl} alt="" />
              ) : (
                <span className={s.placeholder}>{featured.title.slice(0, 1)}</span>
              )}
            </div>
            <div className={s.featuredBody}>
              <span className={s.badge}>{b.featured}</span>
              <h2>{featured.title}</h2>
              <p>{featured.description}</p>
              <div className={s.cardMeta}>
                <span>{fmt(featured.publishedAt, locale)}</span>
                <span className={s.dot}>·</span>
                <span>
                  {featured.readingMinutes} {b.minRead}
                </span>
                <span className={s.dot}>·</span>
                <span>{featured.authorName}</span>
              </div>
            </div>
          </Link>
        )}

        <div className={s.index}>
          {rest.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className={s.card}>
              <div className={s.cardCover}>
                {post.coverImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={post.coverImageUrl} alt="" />
                ) : (
                  <span className={s.glyph}>{post.title.slice(0, 1)}</span>
                )}
              </div>
              <div className={s.cardBody}>
                <h3 className={s.cardTitle}>{post.title}</h3>
                <p className={s.cardDesc}>{post.description}</p>
                {post.tags.length > 0 && (
                  <div className={s.cardTags}>
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className={s.tagPill}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className={s.cardMeta}>
                  <span>{fmt(post.publishedAt, locale)}</span>
                  <span className={s.dot}>·</span>
                  <span>
                    {post.readingMinutes} {b.minRead}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </PageSection>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
    />
    </>
  )
}
