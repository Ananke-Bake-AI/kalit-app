"use client"

import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import clsx from "clsx"
import { usePathname } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import { PageSection } from "@/components/page-section"
import s from "./layout.module.scss"

const TABS = [
  {
    icon: "hugeicons:user-circle",
    href: "/settings/profile",
    label: "Profile",
    description: "Manage your account details and sign-in settings."
  },
  {
    icon: "hugeicons:building-01",
    href: "/settings/workspace",
    label: "Workspace",
    description: "View your workspace name, website, and basic details."
  },
  {
    icon: "hugeicons:user-group",
    href: "/settings/team",
    label: "Team",
    description: "View members, roles, and seat usage."
  },
  {
    icon: "hugeicons:credit-card",
    href: "/settings/billing",
    label: "Billing",
    description: "Manage your plan, subscription, and upgrades."
  },
  {
    icon: "hugeicons:activity-01",
    href: "/settings/usage",
    label: "Usage",
    description: "View credits and recent activity."
  }
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentTab = TABS.find((tab) => tab.href === pathname) ?? TABS[0]

  return (
    <PageSection>
      <Container>
        <PageHeader title={currentTab.label} description={currentTab.description} />

        <div className={s.shell}>
          <nav className={s.tabs}>
            {TABS.map((tab) => (
              <Link key={tab.href} href={tab.href} className={clsx(s.tab, pathname === tab.href && s.tabActive)}>
                <span className={s.tabIcon}>
                  <Icon icon={tab.icon} />
                </span>
                <span className={s.tabContent}>
                  <span className={s.tabLabel}>{tab.label}</span>
                  <span className={s.tabDescription}>{tab.description}</span>
                </span>
              </Link>
            ))}
          </nav>

          <div className={s.content}>{children}</div>
        </div>
      </Container>
    </PageSection>
  )
}
