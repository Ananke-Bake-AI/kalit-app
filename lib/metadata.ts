import { APP_BASE_URL, APP_NAME } from "@/lib/config"
import type { Metadata } from "next"

interface MetadataSeoProps {
  fullTitle?: string
  title: string
  description: string
  locale?: string
  image?: string
  url?: string
  type?: "website" | "article"
}

export const MetadataSeo = ({
  fullTitle,
  title,
  description,
  locale = "en_US",
  image = "/img/thumbnail.jpg",
  url,
  type = "website"
}: MetadataSeoProps): Metadata => {
  const headTitle = fullTitle ? fullTitle : `${APP_NAME} — ${title}`
  const fullUrl = url ? new URL(url, APP_BASE_URL) : APP_BASE_URL
  const icon = "/favicon.svg"

  return {
    metadataBase: APP_BASE_URL,
    title: headTitle,
    description,
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
      images: [image]
    }
  }
}
