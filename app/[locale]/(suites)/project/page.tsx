import { isValidLocale, type Locale } from "@/lib/i18n"
import { Portfolio } from "@/components/portfolio"
import {
  ProjectHeroPrompt,
  SuiteLandingFeatures,
  SuiteLandingHero,
  SuiteLandingHeroStrongLine,
  SuiteLandingHow,
  SuiteLandingPlans
} from "@/components/suite-landing"
import { Underline } from "@/components/underline"
import { getServerTranslation, getTranslationForLocale } from "@/lib/i18n-server"
import { MetadataSeo } from "@/lib/metadata"
import { getSuiteById } from "@/lib/suites"
import {
  projectGradientColors,
  projectHeroLine,
  projectHowLine,
  projectMarketingPath,
  projectPlans
} from "./landing-data"
import s from "./project.module.scss"

export const viewport = {
  themeColor: "#8200DF"
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = isValidLocale(raw) ? raw as Locale : "en"
  const t = await getTranslationForLocale(locale)
  return MetadataSeo({
    fullTitle: t("seo.projectTitle"),
    description: t("seo.projectDescription"),
    favicon: "/favicon-project.svg",
    image: "/img/thumbnail-project.jpg",
    locale,
    pathname: "/project"
  })
}

export default async function ProjectPage() {
  const projectSuite = getSuiteById("project")
  const suiteAppUrl = projectSuite?.appUrl ?? ""
  const { t } = await getServerTranslation()

  const heroTitle = t("suiteLanding.project.heroTitle").split("\n")
  const featTitle = t("suiteLanding.project.featuresTitle").split("\n")
  const howTitle = t("suiteLanding.project.howTitle").split("\n")
  const pricingTitle = t("suiteLanding.pricingTitle").split("\n")

  const heroList = [
    { icon: "hugeicons:database-setting", label: t("suiteLanding.projectHeroLabel1") },
    { icon: "hugeicons:server-stack-02", label: t("suiteLanding.projectHeroLabel2") },
    { icon: "hugeicons:workflow-square-02", label: t("suiteLanding.projectHeroLabel3") }
  ]

  const featureCards = [
    { img: "/img/features/project1.png", title: t("suiteLanding.projectFeat1Title"), text: t("suiteLanding.projectFeat1Desc"), ctaLabel: t("suiteLanding.startProject") },
    { img: "/img/features/project2.png", title: t("suiteLanding.projectFeat2Title"), text: t("suiteLanding.projectFeat2Desc"), ctaLabel: t("suiteLanding.startProject") },
    { img: "/img/features/project3.png", title: t("suiteLanding.projectFeat3Title"), text: t("suiteLanding.projectFeat3Desc"), ctaLabel: t("suiteLanding.startProject") },
    { img: "/img/features/project4.png", title: t("suiteLanding.projectFeat4Title"), text: t("suiteLanding.projectFeat4Desc"), ctaLabel: t("suiteLanding.startProject") }
  ]

  return (
    <>
      <SuiteLandingHero
        className={s.hero}
        suiteId="project"
        suiteAppUrl={suiteAppUrl}
        marketingPath={projectMarketingPath}
        gradientColors={projectGradientColors}
        headingTag="h1"
        headingSubtitle={t("suiteLanding.project.heroSubtitle")}
        headingParagraph={t("suiteLanding.project.heroParagraph")}
        headingTitle={
          <>
            {heroTitle[0]}
            <br /> <SuiteLandingHeroStrongLine line={projectHeroLine}>{heroTitle[1] || "apps"}</SuiteLandingHeroStrongLine>
          </>
        }
        listItems={heroList}
        ctaLabel={t("suiteLanding.startBuilding")}
        rightSlot={<ProjectHeroPrompt />}
      />
      <SuiteLandingFeatures
        suiteId="project"
        suiteAppUrl={suiteAppUrl}
        marketingPath={projectMarketingPath}
        headingSubtitle={t("suiteLanding.project.featuresSubtitle")}
        headingParagraph={t("suiteLanding.project.featuresParagraph")}
        headingTitle={<>{featTitle[0]}<br />{featTitle[1]}</>}
        cards={featureCards}
      />
      <SuiteLandingHow
        accent={4}
        lineStroke={projectHowLine.strokeUrl}
        lineD={projectHowLine.d}
        lineViewBox={projectHowLine.viewBox}
        headingSubtitle={t("suiteLanding.howItWorks")}
        headingParagraph={t("suiteLanding.project.howParagraph")}
        headingTitle={<>{howTitle[0]}<br />{howTitle[1]}</>}
        steps={[
          { icon: "hugeicons:pencil-edit-02", number: 1, title: t("suiteLanding.project.step1Title"), description: t("suiteLanding.project.step1Desc") },
          { icon: "hugeicons:ai-generative", number: 2, title: t("suiteLanding.project.step2Title"), description: t("suiteLanding.project.step2Desc") },
          { icon: "hugeicons:laptop-cloud", number: 3, title: t("suiteLanding.project.step3Title"), description: t("suiteLanding.project.step3Desc") }
        ]}
        poweredTitle={t("suiteLanding.poweredByAI")}
      />
      <SuiteLandingPlans
        suiteId="project"
        suiteAppUrl={suiteAppUrl}
        marketingPath={projectMarketingPath}
        headingSubtitle={t("suiteLanding.ourPricing")}
        headingParagraph={t("suiteLanding.pricingDesc")}
        headingTitle={<>{pricingTitle.map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</>}
        plans={projectPlans}
        sectionId="pricing"
      />
      <Portfolio
        subtitle={t("suiteLanding.projectPortfolioSubtitle")}
        heading={<>{t("suiteLanding.projectPortfolioHeadingPre")} <Underline stroke="url(#color-4-accent)">{t("suiteLanding.projectPortfolioHeadingBold")}</Underline></>}
        paragraph={<>{t("suiteLanding.projectPortfolioParagraphPre")} <Underline stroke="url(#color-4)">{t("suiteLanding.projectPortfolioParagraphBold")}</Underline> {t("suiteLanding.projectPortfolioParagraphPost")}</>}
        buttonText={t("suiteLanding.tryFree")}
        suiteId="project"
        suiteAppUrl={suiteAppUrl}
        marketingPath={projectMarketingPath}
      />
    </>
  )
}
