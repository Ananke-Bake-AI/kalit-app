"use client"

import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { useTranslation } from "@/stores/i18n"
import Image from "next/image"
import s from "./features.module.scss"

const FEATURE_KEYS = [
  { img: "/img/img1.png", titleKey: "features.agents", descKey: "features.agentsDesc" },
  { img: "/img/img2.png", titleKey: "features.references", descKey: "features.referencesDesc" },
  { img: "/img/img3.png", titleKey: "features.parallel", descKey: "features.parallelDesc" },
  { img: "/img/img4.png", titleKey: "features.deploy", descKey: "features.deployDesc" }
]

export const Features = () => {
  const t = useTranslation()

  return (
    <section className={s.features}>
      <Container>
        <Heading
          className={s.heading}
          subtitle={t("features.subtitle")}
          paragraph={t("features.description")}
        >
          {t("features.title")}
        </Heading>
        <div className={s.list}>
          {FEATURE_KEYS.map((feature) => {
            const title = t(feature.titleKey)
            return (
              <div className={s.item} key={feature.titleKey} data-reveal>
                <Image src={feature.img} alt={title} width={1314} height={1046} quality={100} draggable={false} />
                <div className={s.content}>
                  <h3>{title}</h3>
                  <p>{t(feature.descKey)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
