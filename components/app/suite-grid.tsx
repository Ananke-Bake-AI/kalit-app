"use client"

import { SUITES, type SuiteId } from "@/lib/app-suites"
import { Code, Globe, Megaphone, Shield, Lock, ArrowRight } from "lucide-react"
import Link from "next/link"

const SUITE_ICONS: Record<SuiteId, React.ReactNode> = {
  project: <Code className="h-8 w-8" />,
  flow: <Globe className="h-8 w-8" />,
  marketing: <Megaphone className="h-8 w-8" />,
  pentest: <Shield className="h-8 w-8" />,
}

interface SuiteGridProps {
  enabledSuites: SuiteId[]
}

export function SuiteGrid({ enabledSuites }: SuiteGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {SUITES.map((suite) => {
        const isEnabled = enabledSuites.includes(suite.id)

        if (isEnabled) {
          return (
            <Link
              key={suite.id}
              href={suite.href}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all hover:border-muted-fg"
            >
              <div className="mb-4" style={{ color: suite.color }}>
                {SUITE_ICONS[suite.id]}
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Kalit {suite.name}
              </h3>
              <p className="mt-1 text-sm text-muted-fg leading-relaxed">
                {suite.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium" style={{ color: suite.color }}>
                Open suite <ArrowRight className="h-3.5 w-3.5" />
              </div>
              <div
                className="absolute top-0 right-0 h-24 w-24 opacity-5 blur-2xl"
                style={{ backgroundColor: suite.color }}
              />
            </Link>
          )
        }

        return (
          <div
            key={suite.id}
            className="relative overflow-hidden rounded-xl border border-border bg-card/50 p-6 opacity-60"
          >
            <div className="mb-4 text-muted-fg">
              {SUITE_ICONS[suite.id]}
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Kalit {suite.name}
            </h3>
            <p className="mt-1 text-sm text-muted-fg leading-relaxed">
              {suite.description}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-fg">
              <Lock className="h-3.5 w-3.5" />
              Upgrade to unlock
            </div>
          </div>
        )
      })}
    </div>
  )
}
