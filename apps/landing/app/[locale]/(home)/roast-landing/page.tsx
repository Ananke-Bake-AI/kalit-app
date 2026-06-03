import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { RoastClient } from "./roast-client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Roast My Landing Page — free AI teardown | Kalit",
    description:
      "Paste your landing page URL and get an instant AI conversion score, a screenshot, and your 3 biggest problems — free. Then watch Kalit rebuild it, live.",
    locale,
    pathname: "/roast-landing",
  })
}

export default function RoastLandingPage() {
  return <RoastClient />
}
