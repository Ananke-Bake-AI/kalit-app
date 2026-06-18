/**
 * GET /[locale]/blog/rss.xml — RSS 2.0 feed of published posts for the locale.
 * Helps discovery, syndication and AEO (answer engines crawl feeds).
 */
import { APP_BASE_URL } from "@/lib/config"
import { isValidLocale, localePath, type Locale } from "@/lib/i18n"
import { getPageStrings } from "@/lib/page-strings"
import { listPublishedPosts } from "../posts-server"

export const revalidate = 3600

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = (isValidLocale(raw) ? raw : "en") as Locale
  const base = APP_BASE_URL.toString().replace(/\/$/, "")
  const b = (await getPageStrings(locale)).blog
  const posts = await listPublishedPosts(locale)

  const feedUrl = `${base}${localePath("/blog/rss.xml", locale)}`
  const blogUrl = `${base}${localePath("/blog", locale)}`

  const items = posts
    .map((p) => {
      const url = `${base}${localePath(`/blog/${p.slug}`, locale)}`
      const date = (p.publishedAt ?? p.updatedAt).toUTCString()
      const cats = p.tags.map((t) => `<category>${esc(t)}</category>`).join("")
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${date}</pubDate><description>${esc(p.description)}</description>${cats}</item>`
    })
    .join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(b.metaTitle)}</title>
<link>${blogUrl}</link>
<description>${esc(b.metaDescription)}</description>
<language>${locale}</language>
<atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600"
    }
  })
}
