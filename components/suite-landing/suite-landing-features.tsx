"use client"

import { Container } from "@/components/container"
import { FlowSuiteCtaButton } from "@/components/flow-suite-cta-button"
import { Heading } from "@/components/heading"
import type { SuiteId } from "@/lib/suites"
import type { Tag } from "@/types/Tag"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { type ReactNode, useRef } from "react"
import s from "./suite-landing-features.module.scss"

export interface SuiteLandingFeatureCard {
  img: string
  title: string
  text: string
  ctaLabel: string
}

export interface SuiteLandingFeaturesProps {
  suiteId: SuiteId
  suiteAppUrl: string
  marketingPath: string
  headingSubtitle: string
  headingParagraph: string
  headingTitle: ReactNode
  cards: SuiteLandingFeatureCard[]
  headingTag?: Tag
}

export function SuiteLandingFeatures({
  suiteId,
  suiteAppUrl,
  marketingPath,
  headingSubtitle,
  headingParagraph,
  headingTitle,
  cards,
  headingTag
}: SuiteLandingFeaturesProps) {
  const cardsRef = useRef<HTMLDivElement>(null)
  const cardCount = cards.length

  useGSAP(
    () => {
      const root = cardsRef.current
      if (!root) return

      const ctx = gsap.context(() => {
        const items = gsap.utils.toArray<HTMLElement>(root.children)
        for (let i = 0; i < items.length; i++) {
          if (i !== items.length - 1) {
            gsap.to(items[i], {
              scale: 0.95,
              scrollTrigger: {
                trigger: items[i],
                start: "50% 50%",
                endTrigger: items[i + 1],
                end: "50% 50%",
                scrub: true
              }
            })
          }
          gsap.to(`[data-img="${i}"]`, {
            scale: 1,
            scrollTrigger: {
              trigger: items[i],
              start: "top bottom",
              end: "50% 50%",
              scrub: true
            }
          })
        }
      }, root)

      return () => ctx.revert()
    },
    { scope: cardsRef, dependencies: [cardCount] }
  )

  return (
    <section className={s.features}>
      <Container className={s.container}>
        <Heading className={s.heading} tag={headingTag} subtitle={headingSubtitle} paragraph={headingParagraph}>
          {headingTitle}
        </Heading>
        <div ref={cardsRef} className={s.cards}>
          {cards.map((card, i) => (
            <div className={s.card} key={card.title}>
              <div className={s.left}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <FlowSuiteCtaButton suiteId={suiteId} suiteAppUrl={suiteAppUrl} marketingPath={marketingPath} circle>
                  {card.ctaLabel}
                </FlowSuiteCtaButton>
              </div>
              <div className={s.right}>
                <img
                  src={card.img}
                  alt={card.title}
                  width={1314}
                  height={1046}
                  draggable={false}
                  data-img={i}
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

SuiteLandingFeatures.displayName = "SuiteLandingFeatures"
