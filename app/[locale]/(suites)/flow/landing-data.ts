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
