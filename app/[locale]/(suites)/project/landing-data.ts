import type { PlanProps } from "@/components/plan"
import type { SuiteLandingFeatureCard } from "@/components/suite-landing"
import { PROJECT_MARKETING_PATH } from "@/lib/suite-marketing-paths"

export const projectMarketingPath = PROJECT_MARKETING_PATH

export const projectGradientColors: [string, string] = ["#9333EA", "#C026D3"]

export const projectHeroLine = {
  d: "M 0 234.288 H 175.204 C 187.943 234.288 199.92 228.22 207.456 217.948 L 243.482 168.84 C 251.018 158.568 262.995 152.5 275.734 152.5 H 1092.63 C 1114.73 152.5 1132.63 134.591 1132.63 112.5 V 49.5 C 1132.63 27.4086 1150.54 9.5 1172.63 9.5 H 1664.63",
  viewBox: "0 0 1219 244",
  strokeUrl: "url(#suite-hero-line-4)"
}

export const projectHowLine = {
  d: "M-485.326 9.5H422C444.091 9.5 462 27.4086 462 49.5V303.5C462 325.591 479.909 343.5 502 343.5H1222.5C1238.24 343.5 1251 356.512 1251 372.252C1251 387.716 1238.46 400.5 1223 400.5C1207.54 400.5 1195 387.964 1195 372.5V54.5C1195 32.4086 1212.91 14.5 1235 14.5H2057.67",
  viewBox: "0 0 1700 410",
  strokeUrl: "url(#color-4-accent)"
}

export const projectHeroList = [
  { icon: "hugeicons:database-setting", label: "Backend included" },
  { icon: "hugeicons:server-stack-02", label: "Cloud hosting ready" },
  { icon: "hugeicons:workflow-square-02", label: "Production architecture" }
]

export const projectFeatureCards: SuiteLandingFeatureCard[] = [
  {
    img: "/img/features/project1.png",
    title: "Full backend generation",
    text: "Automatically generate APIs, authentication, database structure, and business logic for your application.",
    ctaLabel: "Start Project"
  },
  {
    img: "/img/features/project2.png",
    title: "Complex app generation",
    text: "Create advanced applications like SaaS platforms, dashboards, mobile apps, or even multiplayer games automatically.",
    ctaLabel: "Start Project"
  },
  {
    img: "/img/features/project3.png",
    title: "Integrated cloud hosting",
    text: "Deploy your application instantly and effortlessly thanks to the managed cloud infrastructure included.",
    ctaLabel: "Start Project"
  },
  {
    img: "/img/features/project4.png",
    title: "Production-ready architecture",
    text: "Kalit Project builds scalable infrastructure designed for real-world usage and growing applications.",
    ctaLabel: "Start Project"
  }
]

export const projectPlans: Omit<PlanProps, "action">[] = [
  {
    name: "Free",
    tagline: "Perfect for side projects and experiments.",
    price: "Free",
    features: ["1 project", "100MB storage", "1GB bandwidth", "Community support"],
    buttonText: "Start Project"
  },
  {
    name: "Pro",
    recommended: true,
    tagline: "For production apps and growing teams.",
    price: "$29",
    priceSuffix: "per month",
    features: ["Unlimited projects", "10GB storage", "100GB bandwidth", "Priority support", "Custom domains"],
    buttonText: "Start free trial"
  },
  {
    name: "Enterprise",
    tagline: "For orgs with advanced needs.",
    price: "$99",
    priceSuffix: "per month",
    features: ["Everything in Pro", "Custom storage", "Custom bandwidth", "24/7 support", "Dedicated account manager"],
    buttonText: "Start Project"
  }
]
