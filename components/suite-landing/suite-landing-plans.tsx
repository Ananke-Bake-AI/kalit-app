"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { FlowSuiteCtaButton } from "@/components/flow-suite-cta-button"
import { Heading } from "@/components/heading"
import { Plan, type PlanProps } from "@/components/plan"
import sPlan from "@/components/plan/plan.module.scss"
import type { SuiteId } from "@/lib/suites"
import type { Tag } from "@/types/Tag"
import { type ReactNode } from "react"
import s from "./suite-landing-plans.module.scss"

export interface SuiteLandingPlansProps {
  suiteId: SuiteId
  suiteAppUrl: string
  marketingPath: string
  headingSubtitle: string
  headingParagraph: string
  headingTitle: ReactNode
  plans: Omit<PlanProps, "action">[]
  headingTag?: Tag
  /** Noms d’offres dont le CTA est un lien mailto (ex. Enterprise). */
  mailtoPlanNames?: string[]
  /** URL mailto pour les offres listées dans `mailtoPlanNames`. */
  mailtoHref?: string
  /** Ancre pour liens type « Voir les tarifs » (ex. `#pricing`). */
  sectionId?: string
}

export function SuiteLandingPlans({
  suiteId,
  suiteAppUrl,
  marketingPath,
  headingSubtitle,
  headingParagraph,
  headingTitle,
  plans,
  headingTag,
  mailtoPlanNames,
  mailtoHref,
  sectionId
}: SuiteLandingPlansProps) {
  return (
    <section className={s.plans} id={sectionId}>
      <Container>
        <Heading className={s.heading} tag={headingTag} subtitle={headingSubtitle} paragraph={headingParagraph}>
          {headingTitle}
        </Heading>
        <div className={s.list}>
          {plans.map((plan) => {
            const useMailto = Boolean(mailtoHref && mailtoPlanNames?.includes(plan.name))
            return (
              <Plan
                key={plan.name}
                {...plan}
                action={
                  useMailto ? (
                    <Button href={mailtoHref} className={sPlan.button}>
                      {plan.buttonText}
                    </Button>
                  ) : (
                    <FlowSuiteCtaButton
                      suiteId={suiteId}
                      suiteAppUrl={suiteAppUrl}
                      marketingPath={marketingPath}
                      variant="primary"
                      className={sPlan.button}
                    >
                      {plan.buttonText}
                    </FlowSuiteCtaButton>
                  )
                }
              />
            )
          })}
        </div>
      </Container>
    </section>
  )
}

SuiteLandingPlans.displayName = "SuiteLandingPlans"
