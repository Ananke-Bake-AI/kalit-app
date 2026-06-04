import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { IdeaClient } from "./idea-client"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Find your startup idea: AI-scored 2026 opportunities | Kalit",
    description:
      "Tell the scout what excites you and get matched to the strongest 2026 startup ideas, scored from real demand across 25+ sources, with the market, business model and launch playbook. Free.",
    locale,
    pathname: "/idea-finder",
  })
}

export default function IdeaFinderPage() {
  return <IdeaClient />
}
