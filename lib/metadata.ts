import { APP_BASE_URL, APP_NAME } from "@/lib/config"
import type { Metadata } from "next"

interface MetadataSeoProps {
  fullTitle?: string
  title?: string
  description: string
  locale?: string
  image?: string
  url?: string
  type?: "website" | "article"
  keywords?: string[]
  noIndex?: boolean
  favicon?: string
}

export const MetadataSeo = ({
  fullTitle,
  title,
  description,
  locale = "en_US",
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
    alternates: {
      canonical: fullUrl.toString()
    },
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
      locale,
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
