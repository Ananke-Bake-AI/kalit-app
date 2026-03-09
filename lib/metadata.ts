import type { Metadata } from "next"
import { APP_BASE_URL, APP_NAME } from "./config"

interface MetadataSeoProps {
  title: string
  description: string
}

export const MetadataSeo = ({
  title,
  description
}: MetadataSeoProps): Metadata => {
  const headTitle = `${APP_NAME} — ${title}`

  return {
    metadataBase: APP_BASE_URL,
    title: headTitle,
    description,
    openGraph: {
      title: headTitle,
      description,
      type: "website",
      siteName: APP_NAME,
      locale: "en",
      url: APP_BASE_URL,
      images: [
        {
          url: "/img/thumbnail.png",
          alt: description
        }
      ]
    }
  }
}
