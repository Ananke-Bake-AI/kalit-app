import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { SuiteFaq } from "@/components/suite-faq"
import {
  SearchHeroPrompt,
  SuiteLandingHero,
  SuiteLandingHow
} from "@/components/suite-landing"
import { isValidLocale, type Locale } from "@/lib/i18n"
import { SUITE_FAQ } from "@/lib/suite-faq"
import { getServerTranslation, getTranslationForLocale } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import { getSuiteById } from "@/lib/suites"
import { searchGradientColors, searchHowLine, searchMarketingPath } from "./landing-data"
import s from "./search.module.scss"

export const viewport = {
  themeColor: "#E45BA1"
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? (raw as Locale) : "en"
  const t = await getTranslationForLocale(locale)
  return MetadataSeo({
    fullTitle: t("seo.searchTitle"),
    description: t("seo.searchDescription"),
    image: "/img/thumbnail.jpg",
    locale,
    pathname: "/search"
  })
}

export default async function SearchPage() {
  const searchSuite = getSuiteById("search")
  const suiteAppUrl = searchSuite?.appUrl ?? ""
  const { t } = await getServerTranslation()

  const heroList = [
    { icon: "hugeicons:user-multiple-02", label: t("searchLanding.heroLabel1") },
    { icon: "hugeicons:chart-evaluation", label: t("searchLanding.heroLabel2") },
    { icon: "hugeicons:rocket-01", label: t("searchLanding.heroLabel3") }
  ]

  const cards = [
    {
      icon: "hugeicons:search-01",
      title: t("searchLanding.card1Title"),
      text: t("searchLanding.card1Text")
    },
    {
      icon: "hugeicons:chart-evaluation",
      title: t("searchLanding.card2Title"),
      text: t("searchLanding.card2Text")
    },
    {
      icon: "hugeicons:rocket-01",
      title: t("searchLanding.card3Title"),
      text: t("searchLanding.card3Text")
    }
  ]

  return (
    <>
      <SuiteLandingHero
        suiteId="search"
        suiteAppUrl={suiteAppUrl}
        marketingPath={searchMarketingPath}
        gradientColors={searchGradientColors}
        headingTag="h1"
        headingSubtitle={t("searchLanding.kicker")}
        headingParagraph={t("searchLanding.description")}
        headingTitle={t("searchLanding.title")}
        listItems={heroList}
        ctaLabel={t("searchLanding.cta")}
        rightSlot={<SearchHeroPrompt />}
      />

      <section className={s.highlights}>
        <Container className={s.container}>
          <Heading
            className={s.heading}
            subtitle={t("searchLanding.highlightsEyebrow")}
            paragraph={t("searchLanding.highlightsParagraph")}
          >
            {t("searchLanding.highlightsTitle")}
          </Heading>
          <div className={s.cards}>
            {cards.map((card) => (
              <article className={s.card} key={card.title} data-reveal>
                <span className={s.cardIcon}>
                  <Icon icon={card.icon} />
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <SuiteLandingHow
        accent={5}
        lineStroke={searchHowLine.strokeUrl}
        lineD={searchHowLine.d}
        lineViewBox={searchHowLine.viewBox}
        headingSubtitle={t("searchLanding.workflowEyebrow")}
        headingParagraph={t("searchLanding.workflowParagraph")}
        headingTitle={t("searchLanding.workflowTitle")}
        steps={[
          {
            icon: "hugeicons:ai-search-02",
            number: 1,
            title: t("searchLanding.step1Title"),
            description: t("searchLanding.step1Text")
          },
          {
            icon: "hugeicons:pencil-edit-02",
            number: 2,
            title: t("searchLanding.step2Title"),
            description: t("searchLanding.step2Text")
          },
          {
            icon: "hugeicons:setting-done-02",
            number: 3,
            title: t("searchLanding.step3Title"),
            description: t("searchLanding.step3Text")
          }
        ]}
        poweredTitle={t("suiteLanding.poweredByAI")}
      />
      <SuiteFaq items={SUITE_FAQ.search} />
    </>
  )
}
