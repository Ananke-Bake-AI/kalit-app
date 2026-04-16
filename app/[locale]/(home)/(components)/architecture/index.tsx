"use client"

import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Logo } from "@/components/logo"
import { Models } from "@/components/models"
import { useTranslation } from "@/stores/i18n"
import { Icon } from "@iconify/react"
import clsx from "clsx"
import s from "./architecture.module.scss"
import { AnimatedLine } from "@/components/svg/animated-line"

export const Architecture = () => {
  const t = useTranslation()
  return (
    <section className={s.architecture}>
      <Container>
        <Heading className={s.heading} subtitle={t("architecture.subtitle")} paragraph={t("architecture.description")}>
          {t("architecture.title")} <br />
          <strong className={s.strong}>{t("architecture.titleBold")}</strong>
        </Heading>
        <div className={s.layers}>
          <div className={clsx(s.layer, s.layer1)}>
            <h3>{t("architecture.aiModels")}</h3>
            <Models className={s.list} />
          </div>
          <svg viewBox="0 0 261 62" className={s.layer1Line}>
            <path d="M106.75 0.500244C114.494 2.76534 129.892 17.7487 130.244 59.528M130.244 59.528C130.248 59.9691 130.25 60.4133 130.25 60.8604M130.244 59.528C130.346 60.1867 130.431 60.8281 130.5 61.4504M130.244 59.528C130.24 59.5047 130.237 59.4814 130.233 59.4582M130.25 60.8604C130.25 60.9043 130.25 60.9482 130.25 60.9922M130.25 60.8604C130.248 60.3898 130.242 59.9224 130.233 59.4582M130.25 60.8604C130.25 60.9805 130.251 61.1009 130.251 61.2214M130.25 61.4504C128.083 41.1337 99.1 0.500244 0.5 0.500244M130.233 59.4582C126.969 38.5973 106.791 0.500244 48.5 0.500244M130.233 59.4582C129.456 20.9315 103.273 4.11179 88.25 0.500244M122.5 0.532227C125.167 5.95511 130.5 25.5081 130.5 60.3367M153.995 0.500244C146.251 2.76534 130.853 17.7487 130.501 59.528M130.501 59.528C130.497 59.9691 130.495 60.4133 130.495 60.8604M130.501 59.528C130.399 60.1867 130.314 60.8281 130.245 61.4504M130.501 59.528C130.504 59.5047 130.508 59.4814 130.512 59.4582M130.495 60.8604C130.495 60.9043 130.495 60.9482 130.495 60.9922M130.495 60.8604C130.497 60.3898 130.502 59.9224 130.512 59.4582M130.495 60.8604C130.494 60.9805 130.494 61.1009 130.494 61.2214M130.495 61.4504C132.661 41.1337 161.645 0.500244 260.245 0.500244M130.512 59.4582C133.776 38.5973 153.954 0.500244 212.245 0.500244M130.512 59.4582C131.289 20.9315 157.472 4.11179 172.495 0.500244M138.245 0.532227C135.578 5.95511 130.245 25.5081 130.245 60.3367" />
          </svg>
          <div className={clsx(s.layer, s.layer2)}>
            <div className={s.logo}>
              <Logo id="kalit" />
            </div>
            <h3>{t("architecture.executionLayer")}</h3>
          </div>
          <svg viewBox="0 0 13 67" className={s.layer2Line}>
            <line x1="0.5" y1="0" x2="0.500003" y2="66" stroke="var(--color-1)" />
            <line x1="4.5" y1="0" x2="4.5" y2="66" stroke="var(--color-2)" />
            <line x1="8.5" y1="0" x2="8.5" y2="66" stroke="var(--color-3)" />
            <line x1="12.5" y1="0" x2="12.5" y2="66" stroke="var(--color-4)" />
          </svg>
          <div className={clsx(s.layer, s.layer3)}>
            <div className={s.icon}>
              <Icon icon="svg-spinners:pulse-rings-3" />
            </div>
            <h3>{t("architecture.runningSystems")}</h3>
          </div>
          <AnimatedLine
            className={s.line}
            viewBox="0 0 621 429"
            stroke="url(#architecture_line_1)"
            d="M6.75 708.822V313.75C6.75 283.374 31.3743 258.75 61.75 258.75H240.751H488.75C519.126 258.75 543.75 234.126 543.75 203.75V157.75C543.75 127.374 568.375 102.75 598.75 102.75H632.75C646.005 102.75 656.75 113.495 656.75 126.75V127.25C656.75 140.229 646.229 150.75 633.25 150.75C620.272 150.75 609.75 140.229 609.75 127.25V61.75C609.75 31.3743 634.375 6.75 664.75 6.75H1290.87"
          />
        </div>
      </Container>
    </section>
  )
}
