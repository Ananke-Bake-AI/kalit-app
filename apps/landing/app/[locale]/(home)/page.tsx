"use client"

import { Portfolio } from "@/components/portfolio"
import { Underline } from "@/components/underline"
import { useI18n } from "@/stores/i18n"
import { Architecture } from "./(components)/architecture"
import { Features } from "./(components)/features"
import { Hero } from "./(components)/hero"
import { Join } from "./(components)/join"
import { Stack } from "./(components)/stack"

export default function HomePage() {
  const { locale, t } = useI18n()

  return (
    <>
      <Hero />
      <Stack />
      <Architecture />
      <Features />
      <Join />
      <Portfolio
        key={`portfolio-${locale}`}
        subtitle={t("portfolio.subtitle")}
        heading={
          <>
            {t("portfolio.realProjects")} <Underline>{t("portfolio.builtAndShipped")}</Underline>{" "}
            {t("portfolio.byFounders")}
          </>
        }
        paragraph={t("portfolio.exploreMore")}
        buttonText={t("portfolio.exploreMore")}
        link="/flow"
      />
    </>
  )
}
