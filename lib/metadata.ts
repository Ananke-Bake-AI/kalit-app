import { APP_BASE_URL, APP_NAME } from "@/lib/config"
import { DEFAULT_LOCALE, LOCALES, localePath, type Locale } from "@/lib/i18n"
import type { Metadata } from "next"

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
}

/** Build hreflang alternates for all 16 locales + x-default. */
function buildAlternates(pathname: string) {
  const base = APP_BASE_URL.toString().replace(/\/$/, "")
  const languages: Record<string, string> = {}
  for (const loc of LOCALES) {
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
  favicon = "/favicon.svg"
}: MetadataSeoProps): Metadata => {
  const headTitle = fullTitle ? fullTitle : `${APP_NAME} — ${title}`
  const fullUrl = url ? new URL(url, APP_BASE_URL) : APP_BASE_URL
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
    ...(pathname ? { languages: buildAlternates(pathname) } : {})
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
      ]
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
