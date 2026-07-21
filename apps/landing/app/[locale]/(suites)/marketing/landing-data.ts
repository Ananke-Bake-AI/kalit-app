import type { PlanProps } from "@/components/plan"
import type { SuiteLandingFeatureCard } from "@/components/suite-landing"
import { createPublicPaidPlans } from "@/lib/public-paid-plans"
import { MARKETING_MARKETING_PATH } from "@/lib/suite-marketing-paths"

export const marketingMarketingPath = MARKETING_MARKETING_PATH

export const marketingGradientColors: [string, string] = ["#6366F1", "#C4B5FD"]

export const marketingHeroLine = {
  d: "M8.71289 198.5L18.256 176.551C24.6057 161.947 39.0137 152.5 54.9388 152.5H886.713C908.804 152.5 926.713 134.591 926.713 112.5V49.5C926.713 27.4086 944.621 9.5 966.713 9.5H1458.71",
  viewBox: "0 0 1031 203",
  strokeUrl: "url(#suite-hero-line-3)"
}

export const marketingHowLine = {
  d: "M-485.326 9.5H422C444.091 9.5 462 27.4086 462 49.5V303.5C462 325.591 479.909 343.5 502 343.5H1222.5C1238.24 343.5 1251 356.512 1251 372.252C1251 387.716 1238.46 400.5 1223 400.5C1207.54 400.5 1195 387.964 1195 372.5V54.5C1195 32.4086 1212.91 14.5 1235 14.5H2057.67",
  viewBox: "0 0 1700 410",
  strokeUrl: "url(#color-3-accent)"
}

export const marketingEnterpriseMailHref =
  "mailto:contact@kalit.ai?subject=Contact%20sales%20%E2%80%93%20Kalit%20Marketing"

export const marketingHeroList = [
  { icon: "hugeicons:keyframes-multiple", label: "Multi-platform" },
  { icon: "hugeicons:ai-browser", label: "AI-generated creatives" },
  { icon: "hugeicons:timeline-event", label: "Real-time optimization" }
]

export const marketingFeatureCards: SuiteLandingFeatureCard[] = [
  {
    img: "/img/features/marketing1.png",
    title: "Cross-platform management",
    text: "Manage your Meta, Google, LinkedIn, and TikTok campaigns from a single dashboard. Save time and stay organized.",
    ctaLabel: "Start campaign"
  },
  {
    img: "/img/features/marketing2.png",
    title: "AI campaign creation",
    text: "Our AI helps you create high-converting ad copy, images, and videos in seconds. Just tell it what you need.",
    ctaLabel: "Try it for free"
  },
  {
    img: "/img/features/marketing3.png",
    title: "Performance optimization",
    text: "Automatically optimize your campaign performance based on real-time data and AI-driven insights.",
    ctaLabel: "Learn more"
  },
  {
    img: "/img/features/marketing4.png",
    title: "Advanced analytics",
    text: "Track your campaign performance with industry-leading analytics and reporting. Get a clear view of your ROI.",
    ctaLabel: "Start campaign"
  }
]

export const marketingPlans: Omit<PlanProps, "action">[] = createPublicPaidPlans({
  starterButtonText: "Get started",
  proButtonText: "Get started",
  enterpriseButtonText: "Get started",
})
