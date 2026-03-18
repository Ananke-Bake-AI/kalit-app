"use client"

import { Container } from "@/components/container"
import Link from "next/link"
import { usePathname } from "next/navigation"
import s from "../app.module.scss"
import clsx from "clsx"

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/usage", label: "Usage" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <section className={s.page}>
      <Container>
        <div className={s.pageHeader}>
          <h1>Settings</h1>
          <p>Manage your account and workspace</p>
        </div>

        <div className={s.settingsTabs}>
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(pathname === tab.href && s.active)}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {children}
      </Container>
    </section>
  )
}
