import { isValidLocale, type Locale } from "@/lib/i18n"
import { Marquee } from "@/components/marquee"
import {
  MarketingHeroPrompt,
  SuiteLandingFeatures,
  SuiteLandingHero,
  SuiteLandingHow,
  SuiteLandingPlans
} from "@/components/suite-landing"
import { getServerTranslation, getTranslationForLocale } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import { getSuiteById } from "@/lib/suites"
import {
  marketingEnterpriseMailHref,
  marketingGradientColors,
  marketingHowLine,
  marketingMarketingPath
} from "./landing-data"
import s from "./marketing.module.scss"

export const viewport = {
  themeColor: "#6366F1"
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? raw as Locale : "en"
  const t = await getTranslationForLocale(locale)
  return MetadataSeo({
    fullTitle: t("seo.marketingTitle"),
    description: t("seo.marketingDescription"),
    favicon: "/favicon-marketing.svg",
    image: "/img/thumbnail-marketing.jpg",
    locale,
    pathname: "/marketing"
  })
}

const ADS = [
  { title: "Meta", image: "/img/ads/meta.png" },
  { title: "Facebook Ads", image: "/img/ads/facebook-ads.png" },
  { title: "Instagram Ads", image: "/img/ads/instagram-ads.png" },
  { title: "Google Ads", image: "/img/ads/google-ads.png" },
  { title: "Youtube", image: "/img/ads/youtube.png" },
  { title: "LinkedIn", image: "/img/ads/linkedin-ads.png" },
  { title: "X Ads", image: "/img/ads/x-ads.png" },
  { title: "TikTok Ads", image: "/img/ads/tiktok-ads.png" }
]

export default async function MarketingPage() {
  const marketingSuite = getSuiteById("marketing")
  const suiteAppUrl = marketingSuite?.appUrl ?? ""
  const { t } = await getServerTranslation()

  const featureCards = [
    {
      img: "/img/features/marketing1.png",
      title: t("suiteLanding.marketing.feat1Title"),
      text: t("suiteLanding.marketing.feat1Desc"),
      ctaLabel: t("suiteLanding.startCampaign")
    },
    {
      img: "/img/features/marketing2.png",
      title: t("suiteLanding.marketing.feat2Title"),
      text: t("suiteLanding.marketing.feat2Desc"),
      ctaLabel: t("suiteLanding.tryFree")
    },
    {
      img: "/img/features/marketing3.png",
      title: t("suiteLanding.marketing.feat3Title"),
      text: t("suiteLanding.marketing.feat3Desc"),
      ctaLabel: t("suiteLanding.learnMore")
    },
    {
      img: "/img/features/marketing4.png",
      title: t("suiteLanding.marketing.feat4Title"),
      text: t("suiteLanding.marketing.feat4Desc"),
      ctaLabel: t("suiteLanding.startCampaign")
    }
  ]

  const plans = [
    {
      name: "Free",
      tagline: t("suiteLanding.pricingDesc"),
      price: "Free",
      features: [
        "Up to 2 active campaigns",
        "Connect 2 ad accounts",
        "Basic reporting & exports",
        "Email support",
        "14-day access to Pro features"
      ],
      buttonText: t("suiteLanding.getStarted")
    },
    {
      name: "Pro",
      recommended: true,
      tagline: t("suiteLanding.pricingDesc"),
      price: "$29",
      priceSuffix: t("suiteLanding.perMonth"),
      features: [
        "Unlimited active campaigns",
        "Meta, Google, LinkedIn & TikTok",
        "AI copy, image & video drafts",
        "Advanced analytics & attribution",
        "Real-time performance alerts",
        "Priority email support",
        "API access"
      ],
      buttonText: t("suiteLanding.startFreeTrial")
    },
    {
      name: "Enterprise",
      tagline: t("suiteLanding.pricingDesc"),
      price: "$89",
      priceSuffix: t("suiteLanding.perMonth"),
      features: [
        "Unlimited ad accounts & spend tiers",
        "Custom integrations & webhooks",
        "Dedicated customer success manager",
        "SLA-backed uptime & support",
        "SSO / SAML and audit logs",
        "Real-time data sync",
        "Custom reporting & BigQuery export",
        "Volume-based pricing"
      ],
      buttonText: t("suiteLanding.contactSales")
    }
  ]

  const heroList = [
    { icon: "hugeicons:keyframes-multiple", label: t("suiteLanding.marketingHeroLabel1") },
    { icon: "hugeicons:ai-browser", label: t("suiteLanding.marketingHeroLabel2") },
    { icon: "hugeicons:timeline-event", label: t("suiteLanding.marketingHeroLabel3") }
  ]

  const titleParts = t("suiteLanding.marketing.heroTitle").split("\n")
  const featTitleParts = t("suiteLanding.marketing.featuresTitle").split("\n")
  const howTitleParts = t("suiteLanding.marketing.howTitle").split("\n")

  return (
    <>
      <SuiteLandingHero
        suiteAppUrl={suiteAppUrl}
        marketingPath={marketingMarketingPath}
        gradientColors={marketingGradientColors}
        headingTag="h1"
        headingSubtitle={t("suiteLanding.marketing.heroSubtitle")}
        headingParagraph={t("suiteLanding.marketing.heroParagraph")}
        headingTitle={
          <>
            {titleParts[0]}
            {titleParts[1] && <><br />{titleParts[1]}</>}
          </>
        }
        listItems={heroList}
        ctaLabel={t("suiteLanding.startCampaign")}
        rightSlot={<MarketingHeroPrompt />}
      />
      <div className={s.marquee}>
        <Marquee className={s.marqueeScroll}>
          {ADS.map((ad) => (
            <img key={ad.title} src={ad.image} alt={ad.title} width={335} height={105} draggable={false} loading="lazy" />
          ))}
        </Marquee>
      </div>
      <SuiteLandingFeatures
        suiteAppUrl={suiteAppUrl}
        marketingPath={marketingMarketingPath}
        headingSubtitle={t("suiteLanding.marketing.featuresSubtitle")}
        headingParagraph={t("suiteLanding.marketing.featuresParagraph")}
        headingTitle={
          <>
            {featTitleParts[0]}
            {featTitleParts[1] && <><br />{featTitleParts[1]}</>}
          </>
        }
        cards={featureCards}
      />
      <SuiteLandingHow
        accent={3}
        lineStroke={marketingHowLine.strokeUrl}
        lineD={marketingHowLine.d}
        lineViewBox={marketingHowLine.viewBox}
        headingSubtitle={t("suiteLanding.howItWorks")}
        headingParagraph={t("suiteLanding.marketing.howParagraph")}
        headingTitle={
          <>
            {howTitleParts[0]}
            {howTitleParts[1] && <><br />{howTitleParts[1]}</>}
          </>
        }
        steps={[
          {
            icon: "hugeicons:link-01",
            number: 1,
            title: t("suiteLanding.marketing.step1Title"),
            description: t("suiteLanding.marketing.step1Desc")
          },
          {
            icon: "hugeicons:ai-generative",
            number: 2,
            title: t("suiteLanding.marketing.step2Title"),
            description: t("suiteLanding.marketing.step2Desc")
          },
          {
            icon: "hugeicons:chart-breakout-circle",
            number: 3,
            title: t("suiteLanding.marketing.step3Title"),
            description: t("suiteLanding.marketing.step3Desc")
          }
        ]}
        poweredTitle={t("suiteLanding.poweredByAI")}
      />
      <SuiteLandingPlans
        suiteAppUrl={suiteAppUrl}
        marketingPath={marketingMarketingPath}
        headingSubtitle={t("suiteLanding.ourPricing")}
        headingParagraph={t("suiteLanding.pricingDesc")}
        headingTitle={
          <>
            {t("suiteLanding.pricingTitle").split("\n").map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
          </>
        }
        plans={plans}
        mailtoPlanNames={["Enterprise"]}
        mailtoHref={marketingEnterpriseMailHref}
      />
    </>
  )
}
