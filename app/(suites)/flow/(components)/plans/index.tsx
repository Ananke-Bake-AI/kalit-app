"use client"

import { Container } from "@/components/container"
import { FlowSuiteCtaButton } from "@/components/flow-suite-cta-button"
import { Heading } from "@/components/heading"
import { Plan, type PlanProps } from "@/components/plan"
import s from "./plans.module.scss"

const FLOW_PLANS: Omit<PlanProps, "action">[] = [
  {
    name: "Free",
    tagline: "Perfect for getting started.",
    price: "Free",
    features: [
      "1 landing page per month",
      "Extra landings at $3 each",
      "Downloads at 10 tokens each",
      "Community support",
      "Hotfixes at 5 tokens each",
      "Subdomain deploys at 5 tokens each"
    ],
    buttonText: "Get started"
  },
  {
    name: "Pro",
    recommended: true,
    tagline: "For power users and creators.",
    price: "$29",
    priceSuffix: "per month",
    features: [
      "10 landing pages per month",
      "Extra landings at $2 each",
      "30 downloads per month",
      "Priority email support",
      "Custom domains",
      "5 hotfixes/month",
      "5 subdomain deploys/month"
    ],
    buttonText: "Get started"
  },
  {
    name: "Max",
    tagline: "Scale without limits.",
    price: "$99",
    priceSuffix: "per month",
    features: [
      "30 landing pages per month",
      "Extra landings at $1.50 each",
      "300 downloads per month",
      "Early access",
      "Dedicated support",
      "Custom branding",
      "Team collaboration",
      "30 hotfixes/month",
      "30 subdomain deploys/month"
    ],
    buttonText: "Get started"
  }
]

interface PlansProps {
  suiteAppUrl: string
}

export function Plans({ suiteAppUrl }: PlansProps) {
  return (
    <section className={s.plans}>
      <Container>
        <Heading
          className={s.heading}
          subtitle="Our pricing plans"
          paragraph="Start free, upgrade when you’re ready. No surprises. No hidden fees."
        >
          Simple. Transparent.
          <br /> Built to scale.
        </Heading>
        <div className={s.list}>
          {FLOW_PLANS.map((plan) => (
            <Plan
              key={plan.name}
              {...plan}
              action={
                <FlowSuiteCtaButton suiteAppUrl={suiteAppUrl} variant="primary">
                  {plan.buttonText}
                </FlowSuiteCtaButton>
              }
            />
          ))}
        </div>
      </Container>
    </section>
  )
}
