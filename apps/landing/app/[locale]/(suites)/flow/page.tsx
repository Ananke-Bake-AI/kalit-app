import { Portfolio } from "@/components/portfolio"
import { SuiteFaq } from "@/components/suite-faq"
import {
  FlowHeroPrompt,
  SuiteLandingFeatures,
  SuiteLandingHero,
  SuiteLandingHow,
  SuiteLandingPlans
} from "@/components/suite-landing"
import { Underline } from "@/components/underline"
import { SUITE_FAQ } from "@/lib/suite-faq"
import { formatLocalizedPrices } from "@/lib/currency"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { getServerLocale, getServerTranslation, getTranslationForLocale } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import { getPageStrings } from "@/lib/page-strings"
import { getSuiteById } from "@/lib/suites"
import { flowGradientColors, flowHowLine, flowMarketingPath } from "./landing-data"

export const viewport = {
  themeColor: "#12BCFF"
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const t = await getTranslationForLocale(locale)
  return MetadataSeo({
    fullTitle: t("seo.flowTitle"),
    description: t("seo.flowDescription"),
    favicon: "/favicon-flow.svg",
    image: "/img/thumbnail-flow.jpg",
    locale,
    pathname: "/flow"
  })
}

export default async function FlowPage() {
  const flowSuite = getSuiteById("flow")
  const suiteAppUrl = flowSuite?.appUrl ?? ""
  const { t } = await getServerTranslation()
  const locale = await getServerLocale()
  const sp = (await getPageStrings(locale)).suitePlans

  const [starterPrice, launchPrice, launchProPrice] = await formatLocalizedPrices([
    2900,
    9900,
    29900
  ])

  const flowPlans = [
    {
      name: sp.flow.starter.name,
      tagline: sp.flow.starter.tagline,
      price: starterPrice.display,
      priceSuffix: sp.perMonth,
      features: sp.flow.starter.features,
      buttonText: sp.flow.starter.buttonText
    },
    {
      name: sp.flow.launch.name,
      tagline: sp.flow.launch.tagline,
      recommended: true,
      titleBadge: sp.launchPick,
      price: launchPrice.display,
      priceSuffix: sp.perMonth,
      features: sp.flow.launch.features,
      buttonText: sp.flow.launch.buttonText
    },
    {
      name: sp.flow.launchPro.name,
      tagline: sp.flow.launchPro.tagline,
      price: launchProPrice.display,
      priceSuffix: sp.perMonth,
      features: sp.flow.launchPro.features,
      buttonText: sp.flow.launchPro.buttonText
    }
  ]

  const featTitle = t("suiteLanding.flow.featuresTitle").split("\n")
  const howTitle = t("suiteLanding.flow.howTitle").split("\n")
  const pricingTitle = t("suiteLanding.pricingTitle").split("\n")

  const heroList = [
    { icon: "hugeicons:stars", label: t("suiteLanding.flowHeroLabel1") },
    { icon: "hugeicons:credit-card-not-accept", label: t("suiteLanding.flowHeroLabel2") },
    { icon: "hugeicons:token-circle", label: t("suiteLanding.flowHeroLabel3") }
  ]

  const featureCards = [
    {
      img: "/img/features/flow1.png",
      title: t("suiteLanding.flowFeat1Title"),
      text: t("suiteLanding.flowFeat1Desc"),
      ctaLabel: t("suiteLanding.startBuilding")
    },
    {
      img: "/img/features/flow2.png",
      title: t("suiteLanding.flowFeat2Title"),
      text: t("suiteLanding.flowFeat2Desc"),
      ctaLabel: t("suiteLanding.startBuilding")
    },
    {
      img: "/img/features/flow3.png",
      title: t("suiteLanding.flowFeat3Title"),
      text: t("suiteLanding.flowFeat3Desc"),
      ctaLabel: t("suiteLanding.startBuilding")
    },
    {
      img: "/img/features/flow4.png",
      title: t("suiteLanding.flowFeat4Title"),
      text: t("suiteLanding.flowFeat4Desc"),
      ctaLabel: t("suiteLanding.startBuilding")
    }
  ]

  return (
    <>
      <SuiteLandingHero
        suiteId="flow"
        suiteAppUrl={suiteAppUrl}
        marketingPath={flowMarketingPath}
        gradientColors={flowGradientColors}
        headingTag="h1"
        headingSubtitle={t("suiteLanding.flow.heroSubtitle")}
        headingParagraph={t("suiteLanding.flow.heroParagraph")}
        headingTitle={t("suiteLanding.flow.heroTitle")}
        listItems={heroList}
        ctaLabel={t("suiteLanding.getStarted")}
        rightSlot={<FlowHeroPrompt />}
      />
      <SuiteLandingFeatures
        suiteId="flow"
        suiteAppUrl={suiteAppUrl}
        marketingPath={flowMarketingPath}
        headingSubtitle={t("suiteLanding.flow.featuresSubtitle")}
        headingParagraph={t("suiteLanding.flow.featuresParagraph")}
        headingTitle={
          <>
            {featTitle[0]}
            <br />
            {featTitle[1]}
          </>
        }
        cards={featureCards}
      />
      <SuiteLandingHow
        accent={2}
        lineStroke={flowHowLine.strokeUrl}
        lineD={flowHowLine.d}
        lineViewBox={flowHowLine.viewBox}
        headingSubtitle={t("suiteLanding.howItWorks")}
        headingParagraph={t("suiteLanding.flow.howParagraph")}
        headingTitle={
          <>
            {howTitle[0]}
            <br />
            {howTitle[1]}
          </>
        }
        steps={[
          {
            icon: "hugeicons:pencil-edit-02",
            number: 1,
            title: t("suiteLanding.flow.step1Title"),
            description: t("suiteLanding.flow.step1Desc")
          },
          {
            icon: "hugeicons:ai-generative",
            number: 2,
            title: t("suiteLanding.flow.step2Title"),
            description: t("suiteLanding.flow.step2Desc")
          },
          {
            icon: "hugeicons:cloud-download",
            number: 3,
            title: t("suiteLanding.flow.step3Title"),
            description: t("suiteLanding.flow.step3Desc")
          }
        ]}
        poweredTitle={t("suiteLanding.poweredByAI")}
      />
      <SuiteLandingPlans
        suiteId="flow"
        suiteAppUrl={suiteAppUrl}
        marketingPath={flowMarketingPath}
        headingSubtitle={t("suiteLanding.ourPricing")}
        headingParagraph={t("suiteLanding.pricingDesc")}
        headingTitle={
          <>
            {pricingTitle.map((l, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {l}
              </span>
            ))}
          </>
        }
        plans={flowPlans}
      />
      <Portfolio
        subtitle={t("suiteLanding.flowPortfolioSubtitle")}
        heading={
          <>
            {t("suiteLanding.flowPortfolioHeadingPre")} <br />
            <Underline stroke="url(#color-2)">{t("suiteLanding.flowPortfolioHeadingBold")}</Underline>
          </>
        }
        paragraph={
          <>
            {t("suiteLanding.flowPortfolioParagraphPre")}{" "}
            <Underline stroke="url(#color-2)">{t("suiteLanding.flowPortfolioParagraphBold")}</Underline>{" "}
            {t("suiteLanding.flowPortfolioParagraphPost")}
          </>
        }
        buttonText={t("suiteLanding.startBuilding")}
        suiteId="flow"
        suiteAppUrl={suiteAppUrl}
        marketingPath={flowMarketingPath}
      />
      <SuiteFaq items={SUITE_FAQ.flow} />
    </>
  )
}
