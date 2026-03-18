"use client"

import { cn } from "@/lib/cn"
import { SUITES, type SuiteId } from "@/lib/app-suites"
import {
  Code,
  Globe,
  Megaphone,
  Shield,
  LayoutDashboard,
  Activity,
  Settings,
  Lock,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const SUITE_ICONS: Record<SuiteId, React.ReactNode> = {
  project: <Code className="h-4 w-4" />,
  flow: <Globe className="h-4 w-4" />,
  marketing: <Megaphone className="h-4 w-4" />,
  pentest: <Shield className="h-4 w-4" />,
}

interface SidebarProps {
  orgName: string
  enabledSuites: SuiteId[]
}

export function Sidebar({ orgName, enabledSuites }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    ...SUITES.map((suite) => ({
      href: suite.href,
      label: suite.name,
      icon: SUITE_ICONS[suite.id],
      locked: !enabledSuites.includes(suite.id),
      color: suite.color,
    })),
    { href: "/jobs", label: "Jobs", icon: <Activity className="h-4 w-4" /> },
    { href: "/settings/profile", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
            K
          </div>
          <span className="text-sm font-semibold text-foreground truncate">{orgName}</span>
        </Link>
      </div>

      <nav className="flex-1 p-3">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const isLocked = "locked" in item && item.locked

            return (
              <li key={item.href}>
                {isLocked ? (
                  <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-fg/50 cursor-not-allowed">
                    <span style={{ color: "color" in item ? item.color : undefined, opacity: 0.4 }}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <Lock className="h-3 w-3" />
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent/10 text-foreground"
                        : "text-muted-fg hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span style={{ color: isActive && "color" in item ? item.color : undefined }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-fg hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
