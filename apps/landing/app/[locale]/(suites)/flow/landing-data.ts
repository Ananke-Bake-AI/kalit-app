import type { PlanProps } from "@/components/plan"
import type { SuiteLandingFeatureCard } from "@/components/suite-landing"
import { FLOW_MARKETING_PATH } from "@/lib/flow-suite-entry"

export const flowMarketingPath = FLOW_MARKETING_PATH

export const flowGradientColors: [string, string] = ["#12BCFF", "#6CF4FB"]

export const flowHeroLine = {
  d: "M8.71289 198.5L18.256 176.551C24.6057 161.947 39.0137 152.5 54.9388 152.5H886.713C908.804 152.5 926.713 134.591 926.713 112.5V49.5C926.713 27.4086 944.621 9.5 966.713 9.5H1458.71",
  viewBox: "0 0 1031 203",
  strokeUrl: "url(#flow-hero)"
}

export const flowHowLine = {
  d: "M-485.326 9.5H422C444.091 9.5 462 27.4086 462 49.5V303.5C462 325.591 479.909 343.5 502 343.5H1222.5C1238.24 343.5 1251 356.512 1251 372.252C1251 387.716 1238.46 400.5 1223 400.5C1207.54 400.5 1195 387.964 1195 372.5V54.5C1195 32.4086 1212.91 14.5 1235 14.5H2057.67",
  viewBox: "0 0 1700 410",
  strokeUrl: "url(#color-2)"
}

export const flowHeroList = [
  { icon: "hugeicons:stars", label: "Free to start" },
  { icon: "hugeicons:credit-card-not-accept", label: "No credit card" },
  { icon: "hugeicons:token-circle", label: "100 tokens included" }
]

export const flowFeatureCards: SuiteLandingFeatureCard[] = [
  {
    img: "/img/features/flow1.png",
    title: "Prompt-Based Creation",
    text: "Describe your project in plain language. Our AI generates a complete, working web project instantly.",
    ctaLabel: "Start Building"
  },
  {
    img: "/img/features/flow2.png",
    title: "Live Preview",
    text: "See your project come to life in real-time with an interactive preview right in your browser.",
    ctaLabel: "Start Building"
  },
  {
    img: "/img/features/flow3.png",
    title: "Download & Deploy",
    text: "Export as a ready-to-deploy package. Take full ownership of your code and host it anywhere.",
    ctaLabel: "Start Building"
  },
  {
    img: "/img/features/flow4.png",
    title: "API Access",
    text: "Integrate Flow into your workflow. Generate projects programmatically with your API keys.",
    ctaLabel: "Start Building"
  }
]

export const flowPlans: Omit<PlanProps, "action">[] = [
  {
    name: "Starter",
    tagline: "For testing Flow and shipping a first page.",
    price: "$29",
    priceSuffix: "per month",
    features: [
      "Kalit Flow access",
      "75 credits / month",
      "AI-generated landing pages",
      "Live previews",
      "Custom domain support",
    ],
    buttonText: "Start with Flow",
  },
  {
    name: "Launch",
    tagline: "For founders preparing a public launch.",
    recommended: true,
    titleBadge: "Launch pick",
    price: "$99",
    priceSuffix: "per month",
    features: [
      "Flow + Kalit Studio",
      "350 credits / month",
      "Deploy and redeploy pages",
      "Project files and exports",
      "Priority support",
    ],
    buttonText: "Build my launch site",
  },
  {
    name: "Launch Pro",
    tagline: "For teams that want launch pages plus security review.",
    price: "$299",
    priceSuffix: "per month",
    features: [
      "Flow + Pentest access",
      "1,200 credits / month",
      "Pre-launch security scan",
      "Report export",
      "Custom onboarding",
    ],
    buttonText: "Launch with scan",
  },
]
