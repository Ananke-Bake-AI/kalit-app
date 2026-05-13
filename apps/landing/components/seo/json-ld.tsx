import type { Locale } from "@/lib/i18n"

export function JsonLd({ locale = "en" }: { locale?: Locale }) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kalit AI",
    url: "https://kalit.ai",
    logo: "https://kalit.ai/favicon.svg",
    description:
      "Kalit helps founders create AI launch pages with Flow, deploy them live, and run authorized pre-launch security scans with Pentest.",
    sameAs: [
      "https://x.com/kalit_ai",
      "https://www.linkedin.com/company/kalit-ai",
      "https://discord.gg/FssPgq5hQK",
      "https://t.me/kalit_ai",
    ],
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kalit AI",
    url: "https://kalit.ai",
    inLanguage: locale,
    description:
      "Launch your site with AI, deploy it live, and scan authorized targets before go-live.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kalit.ai/?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  }

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kalit AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://kalit.ai",
    inLanguage: locale,
    description:
      "AI-powered platform to create launch pages with Flow and run authorized pre-launch security scans with Pentest.",
    offers: [
      {
        "@type": "Offer",
        price: "29",
        priceCurrency: "USD",
        name: "Starter",
        description: "Kalit Flow access for AI-generated launch pages and live previews",
      },
      {
        "@type": "Offer",
        price: "99",
        priceCurrency: "USD",
        name: "Launch",
        description: "Flow launch pages with deploy/redeploy workflow and priority support",
      },
      {
        "@type": "Offer",
        price: "299",
        priceCurrency: "USD",
        name: "Launch Pro",
        description: "Flow plus Pentest access for pre-launch scans and report export",
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
    </>
  )
}
