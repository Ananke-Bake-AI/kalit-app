import type { MetadataRoute } from "next"
import { DEFAULT_LOCALE, LOCALES, localePath } from "@/lib/i18n"
import { ALTERNATIVES } from "@/app/[locale]/(home)/alternatives/data"
import { COMPETITORS } from "@/app/[locale]/(home)/compare/data"
import { listPublishedPosts } from "@/app/[locale]/(home)/blog/posts-server"

const BASE_URL = "https://kalit.ai"

// Regenerate hourly so newly published blog posts (and other DB-backed content)
// enter the sitemap without requiring a full redeploy.
export const revalidate = 3600

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>

type PageDef = {
  path: string
  changeFrequency: ChangeFrequency
  priority: number
  lastModified?: Date
}

// Every public, indexable page. Anything auth-gated (dashboard, settings, setup,
// jobs, studio, admin, auth) or noindex (search/open, share pages) is excluded.
const STATIC_PAGES: PageDef[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },

  // Product suites
  { path: "/flow", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pentest", changeFrequency: "weekly", priority: 0.9 },
  { path: "/search", changeFrequency: "weekly", priority: 0.9 },
  { path: "/marketing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },

  // SEO / content hubs
  { path: "/blog", changeFrequency: "daily", priority: 0.7 },
  { path: "/alternatives", changeFrequency: "weekly", priority: 0.7 },
  { path: "/compare", changeFrequency: "weekly", priority: 0.7 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.6 },
  { path: "/discover", changeFrequency: "daily", priority: 0.6 },

  // Lead magnets (AEO surface)
  { path: "/idea-finder", changeFrequency: "monthly", priority: 0.6 },
  { path: "/roast-landing", changeFrequency: "monthly", priority: 0.6 },

  // Trust / company / legal
  { path: "/security", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact-us", changeFrequency: "monthly", priority: 0.4 },
  { path: "/support", changeFrequency: "monthly", priority: 0.4 },
  { path: "/responsible-use", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.3 },
]

// Expand one page into one sitemap entry per locale, each carrying the full set
// of hreflang alternates (+ x-default) so Google clusters the translations.
function localizedEntries(page: PageDef): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {}
  for (const alt of LOCALES) {
    languages[alt] = `${BASE_URL}${localePath(page.path, alt)}`
  }
  languages["x-default"] = `${BASE_URL}${localePath(page.path, DEFAULT_LOCALE)}`

  return LOCALES.map((locale) => ({
    url: `${BASE_URL}${localePath(page.path, locale)}`,
    lastModified: page.lastModified ?? new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
    alternates: { languages },
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: PageDef[] = [...STATIC_PAGES]

  // Programmatic SEO — competitor "alternatives" and "vs" comparison pages.
  for (const alt of ALTERNATIVES) {
    pages.push({ path: `/alternatives/${alt.slug}`, changeFrequency: "weekly", priority: 0.7 })
  }
  for (const comp of COMPETITORS) {
    pages.push({ path: `/compare/${comp.slug}`, changeFrequency: "weekly", priority: 0.7 })
  }

  // Blog posts are locale-agnostic by slug. listPublishedPosts is resilient and
  // returns [] if the DB is unreachable, so a transient outage never breaks the
  // sitemap — it just omits posts until the next revalidation.
  const posts = await listPublishedPosts(DEFAULT_LOCALE)
  for (const post of posts) {
    pages.push({
      path: `/blog/${post.slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: post.updatedAt ?? post.publishedAt ?? new Date(),
    })
  }

  return pages.flatMap(localizedEntries)
}
