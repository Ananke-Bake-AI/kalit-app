import { APP_BASE_URL, APP_NAME } from "@/lib/config"
import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "@/lib/i18n"
import type { Metadata } from "next"

interface ArticleMeta {
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
  tags?: string[]
  section?: string
}

interface MetadataSeoProps {
  fullTitle?: string
  title?: string
  description: string
  locale?: Locale
  pathname?: string
  image?: string
  url?: string
  type?: "website" | "article"
  keywords?: string[]
  noIndex?: boolean
  favicon?: string
  /** Open Graph `article:*` fields — only emitted when type === "article". */
  article?: ArticleMeta
  /**
   * Restrict hreflang to locales that actually have distinct content. Defaults
   * to all 16. Pass e.g. ["en", "fr"] for a blog post translated only to FR so
   * we don't advertise 14 "translations" that are really English fallbacks.
   */
  availableLocales?: Locale[]
}

/** Build hreflang alternates for the given locales (default: all 16) + x-default. */
function buildAlternates(pathname: string, locales: readonly Locale[] = LOCALES) {
  const base = APP_BASE_URL.toString().replace(/\/$/, "")
  const languages: Record<string, string> = {}
  for (const loc of locales) {
    languages[loc] = `${base}${localePath(pathname, loc)}`
  }
  languages["x-default"] = `${base}${localePath(pathname, DEFAULT_LOCALE)}`
  return languages
}

export const MetadataSeo = ({
  fullTitle,
  title,
  description,
  locale = "en",
  pathname,
  image = "/img/thumbnail.jpg",
  url,
  type = "website",
  keywords,
  noIndex = false,
  favicon = "/favicon.svg",
  article,
  availableLocales
}: MetadataSeoProps): Metadata => {
  const headTitle = fullTitle ? fullTitle : `${APP_NAME} - ${title}`
  const fullUrl = url ? new URL(url, APP_BASE_URL) : pathname ? new URL(localePath(pathname, locale), APP_BASE_URL) : APP_BASE_URL
  const icon = favicon || "/favicon.svg"

  const defaultKeywords = [
    "AI app builder",
    "AI landing page builder",
    "AI startup builder",
    "AI marketing automation",
    "AI pentesting",
    "AI security scanning",
    "build app with AI",
    "deploy apps with AI",
    "generate landing pages with AI",
    "Kalit AI",
    "AI suite",
    "AI agents",
    "no-code AI platform"
  ]

  const alternates: Metadata["alternates"] = {
    canonical: fullUrl.toString(),
    ...(pathname ? { languages: buildAlternates(pathname, availableLocales) } : {})
  }

  return {
    metadataBase: APP_BASE_URL,
    title: headTitle,
    description,
    keywords: keywords || defaultKeywords,
    authors: [{ name: APP_NAME, url: APP_BASE_URL.toString() }],
    creator: APP_NAME,
    publisher: APP_NAME,
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large" as const, "max-snippet": -1 },
    alternates,
    icons: {
      icon,
      shortcut: icon,
      apple: icon
    },
    openGraph: {
      title: headTitle,
      description,
      type,
      siteName: APP_NAME,
      locale: locale === "en" ? "en_US" : locale,
      url: fullUrl,
      images: [
        {
          url: image,
          alt: description,
          width: 1200,
          height: 630
        }
      ],
      ...(type === "article" && article
        ? {
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime,
            authors: article.authors,
            tags: article.tags,
            section: article.section
          }
        : {})
    },
    twitter: {
      card: "summary_large_image",
      title: headTitle,
      description,
      images: [image],
      creator: "@kalit_ai",
      site: "@kalit_ai"
    }
  }
}
