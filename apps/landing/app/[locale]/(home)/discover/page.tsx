import { isValidLocale, type Locale } from "@/lib/i18n"
import { MetadataSeo } from "@/lib/metadata"
import { DiscoverClient } from "./discover-client"

export const dynamic = "force-dynamic"

// Without its own metadata this page inherited the homepage <title>, creating a
// duplicate-title collision (both ranked for "launch your site … go-live"). Give it a
// distinct title/description + self-canonical so it targets its own "public projects /
// showcase" intent instead of competing with the homepage.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  return MetadataSeo({
    fullTitle: "Discover: Public Projects Built with Kalit AI",
    description:
      "Browse public projects shipped from a single chat with Kalit AI's agents. Star the ones you like, and remix any of them into your own build.",
    locale,
    pathname: "/discover"
  })
}

export default function DiscoverPage() {
  return <DiscoverClient />
}
