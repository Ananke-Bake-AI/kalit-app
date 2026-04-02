"use client"

import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { PageSection } from "@/components/page-section"
import clsx from "clsx"
import { usePathname } from "next/navigation"
import s from "./layout.module.scss"

const TABS = [
  { icon: "hugeicons:dashboard-square-01", href: "/admin", label: "Dashboard" },
  { icon: "hugeicons:user-group", href: "/admin/users", label: "Users" },
  { icon: "hugeicons:building-01", href: "/admin/organizations", label: "Organizations" },
  { icon: "hugeicons:dollar-02", href: "/admin/revenue", label: "Revenue" },
  { icon: "hugeicons:activity-01", href: "/admin/monitoring", label: "Monitoring" },
  { icon: "hugeicons:mail-send-02", href: "/admin/campaigns", label: "Campaigns" }
]

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <PageSection>
      <Container>
        <div className={s.header}>
          <h1 className={s.headerTitle}>Admin Panel</h1>
          <Link href="/dashboard" className={s.backLink}>
            <Icon icon="hugeicons:arrow-left-02" />
            <span>Back to app</span>
          </Link>
        </div>

        <div className={s.shell}>
          <nav className={s.tabs}>
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(s.tab, pathname === tab.href && s.tabActive)}
              >
                <span className={s.tabIcon}>
                  <Icon icon={tab.icon} />
                </span>
                <span className={s.tabLabel}>{tab.label}</span>
              </Link>
            ))}
          </nav>
          <div className={s.content}>{children}</div>
        </div>
      </Container>
    </PageSection>
  )
}
