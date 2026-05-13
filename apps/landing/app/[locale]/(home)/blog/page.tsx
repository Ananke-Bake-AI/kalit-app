import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { getServerTranslation } from "@/lib/i18n-server"
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
  return MetadataSeo({
    fullTitle: "Blog - Kalit AI",
    description:
      "Notes from the team behind Kalit AI — why we're building an AI software factory, how Taskforce and Pentest actually work, and what we ship next.",
    locale,
    pathname: "/blog"
  })
}

export default async function BlogIndex({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const { t } = await getServerTranslation()
  const posts = await listPublishedPosts(locale)

  const [featured, ...rest] = posts

  return (
    <PageSection>
      <Container>
        <div className={s.indexHeader}>
          <PageHeader
            title={t("blogPage.title") || "Kalit Blog"}
            description={
              t("blogPage.description") ||
              "Build notes, technical deep-dives and product thinking from the Kalit team."
            }
          />
        </div>

        {!posts.length && (
          <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
            No posts yet. Check back soon.
          </p>
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
              <span className={s.badge}>{t("blogPage.featured") || "Featured"}</span>
              <h2>{featured.title}</h2>
              <p>{featured.description}</p>
              <div className={s.cardMeta}>
                <span>{fmt(featured.publishedAt, locale)}</span>
                <span className={s.dot}>·</span>
                <span>
                  {featured.readingMinutes} {t("blogPage.minRead") || "min read"}
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
                    {post.readingMinutes} {t("blogPage.minRead") || "min read"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </PageSection>
  )
}
