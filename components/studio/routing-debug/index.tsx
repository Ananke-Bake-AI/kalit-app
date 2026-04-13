"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useStudioStore } from "@/stores/studio"
import s from "./routing-debug.module.scss"

export function RoutingDebugPanel() {
  const { data: session } = useSession()
  const lastRouting = useStudioStore((st) => st.lastRouting)
  const [collapsed, setCollapsed] = useState(false)

  if (!session?.user?.isAdmin) return null
  if (!lastRouting) return null

  return (
    <div className={s.panel} data-collapsed={collapsed}>
      <button
        type="button"
        className={s.header}
        onClick={() => setCollapsed((v) => !v)}
        title="Routing debug (admin)"
      >
        <span className={s.badge} data-source={lastRouting.source}>
          {lastRouting.source}
        </span>
        <span className={s.suite}>{lastRouting.suite || "?"}</span>
        <span className={s.conf}>{lastRouting.confidence}</span>
        {typeof lastRouting.latencyMs === "number" && (
          <span className={s.latency}>{lastRouting.latencyMs}ms</span>
        )}
        <span className={s.caret}>{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed && lastRouting.reasoning && (
        <div className={s.reason}>{lastRouting.reasoning}</div>
      )}
    </div>
  )
}
