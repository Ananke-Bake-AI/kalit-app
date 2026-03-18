"use client"

import { cn } from "@/lib/cn"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-fg">Manage your account and workspace</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
              pathname === tab.href
                ? "border-accent text-foreground"
                : "border-transparent text-muted-fg hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
