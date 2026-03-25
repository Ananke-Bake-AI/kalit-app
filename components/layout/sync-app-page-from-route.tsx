"use client"

import { SUITES, type SuiteId } from "@/lib/suites"
import { useAppStore } from "@/stores/app"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

const SUITE_IDS = new Set<string>(SUITES.map((s) => s.id))

export function SyncAppPageFromRoute() {
  const pathname = usePathname()
  const setPage = useAppStore((s) => s.setPage)

  useEffect(() => {
    const firstSegment = pathname.split("/").filter(Boolean)[0]
    const next: "default" | SuiteId =
      firstSegment && SUITE_IDS.has(firstSegment) ? (firstSegment as SuiteId) : "default"
    if (useAppStore.getState().page !== next) setPage(next)
  }, [pathname, setPage])

  return null
}
