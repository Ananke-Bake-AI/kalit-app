"use client"

import { Color4Bg } from "@/components/color4bg"
import { Container } from "@/components/container"
import { Heading } from "@/components/heading"
import { Icon } from "@/components/icon"
import { AnimatedLine } from "@/components/svg/animated-line"
import type { SuiteId } from "@/lib/suites"
import type { Tag } from "@/types/Tag"
import clsx from "clsx"
import { type ReactNode } from "react"
import s from "./suite-landing-hero.module.scss"

export interface SuiteLandingHeroListItem {
  icon: string
  label: string
}

export interface SuiteLandingHeroLine {
  d: string
  viewBox: string
  strokeUrl: string
}

export interface SuiteLandingHeroLink {
  label: string
  href: string
}

export interface SuiteLandingHeroProps {
  suiteId: SuiteId
  suiteAppUrl: string
  marketingPath: string
  gradientColors: [string, string]
  headingParagraph: string
  headingTitle: ReactNode
  ctaLabel: string
  rightSlot: ReactNode
  headingSubtitle?: string
  listItems?: SuiteLandingHeroListItem[]
  headingTag?: Tag
  className?: string
}

export function SuiteLandingHero({
  suiteId,
  suiteAppUrl,
  marketingPath,
  gradientColors,
  headingSubtitle,
  headingParagraph,
  headingTitle,
  listItems = [],
  ctaLabel,
  rightSlot,
  headingTag,
  className
}: SuiteLandingHeroProps) {
  return (
    <section className={clsx(s.hero, className)}>
      <Container>
        <div className={s.layout}>
          <div className={s.left}>
            <Heading className={s.heading} tag={headingTag} subtitle={headingSubtitle} paragraph={headingParagraph}>
              {headingTitle}
            </Heading>
            {listItems.length > 0 ? (
              <ul className={s.list} data-reveal>
                {listItems.map((item) => (
                  <li key={item.label}>
                    <Icon icon={item.icon} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {/* <div className={s.ctaBlock}>
              <FlowSuiteCtaButton suiteId={suiteId} suiteAppUrl={suiteAppUrl} marketingPath={marketingPath} circle className={s.button}>
                {ctaLabel}
              </FlowSuiteCtaButton>
            </div> */}
          </div>
          <div className={s.right}>
            {rightSlot}
            <div className={s.bg} data-reveal>
              <Color4Bg className={s.gradient} style="blur-gradient" colors={gradientColors} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export function SuiteLandingHeroStrongLine({ children, line }: { children: ReactNode; line: SuiteLandingHeroLine }) {
  return (
    <span className={s.strong}>
      {children} <AnimatedLine className={s.line} viewBox={line.viewBox} stroke={line.strokeUrl} d={line.d} />
    </span>
  )
}

SuiteLandingHero.displayName = "SuiteLandingHero"
