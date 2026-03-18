export function JsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kalit AI",
    url: "https://kalit.ai",
    logo: "https://kalit.ai/favicon.svg",
    description:
      "Kalit is the AI suite for startups and digital teams. Build apps, launch landing pages, run marketing campaigns, and secure your product.",
    sameAs: [
      "https://x.com/kalit_ai",
      "https://www.linkedin.com/company/kalit-ai",
      "https://discord.gg/kalit-ai",
      "https://t.me/kalit_ai",
    ],
  }

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kalit AI",
    url: "https://kalit.ai",
    description:
      "Build, launch, grow, and secure your startup with AI. Four specialized AI suites for apps, websites, acquisition, and security.",
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
    description:
      "AI-powered platform to build apps, launch websites, run marketing campaigns, and scan for security vulnerabilities.",
    offers: [
      {
        "@type": "Offer",
        price: "29",
        priceCurrency: "USD",
        name: "Starter",
        description: "Kalit Flow access with 100 credits per month",
      },
      {
        "@type": "Offer",
        price: "99",
        priceCurrency: "USD",
        name: "Pro",
        description: "Flow, Project, and Marketing suites with 500 credits per month",
      },
      {
        "@type": "Offer",
        price: "299",
        priceCurrency: "USD",
        name: "Enterprise",
        description: "All 4 suites with 2000 credits per month and unlimited team members",
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
