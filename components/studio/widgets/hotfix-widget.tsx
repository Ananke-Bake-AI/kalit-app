"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { brokerFetch } from "@/lib/broker-direct"
import { useI18n } from "@/stores/i18n"
import { Icon } from "@/components/icon"
import s from "./widgets.module.scss"

type HotfixStatus = "running" | "done" | "error" | "idle"
type HotfixPhase = "init" | "planning" | "working" | "testing" | "done" | null

interface HotfixData {
  status: HotfixStatus
  phase: HotfixPhase
  stats: { total: number; done: number; inProgress: number } | null
}

interface HotfixWidgetProps {
  projectId: string
  onCompleted?: () => void
}

const phaseI18nKeys: Record<string, string> = {
  init: "studio.hotfixInit",
  planning: "studio.hotfixPlanning",
  working: "studio.hotfixWorking",
  testing: "studio.hotfixTesting",
  done: "studio.hotfixDone",
}

export function HotfixWidget({ projectId, onCompleted }: HotfixWidgetProps) {
  const { t } = useI18n()
  const [data, setData] = useState<HotfixData | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }, [])

  const fetchStatus = useCallback(async () => {
    if (finishedRef.current) return
    try {
      const res = await brokerFetch(`/api/broker/project/${projectId}/status`)
      if (!res.ok) return
      const json = await res.json()
      if (!json.success) return

      const tf = json.data
      const status: HotfixStatus =
        tf.status === "completed" || tf.phase === "done" ? "done" :
        tf.status === "failed" || tf.phase === "error" ? "error" :
        tf.status === "cancelled" ? "idle" : "running"

      setData({ status, phase: tf.phase || null, stats: tf.tasks || null })

      if (status === "done" || status === "error" || status === "idle") {
        finishedRef.current = true
        stopPolling()
        if (status === "done" && onCompleted) setTimeout(onCompleted, 2000)
      }
    } catch { /* silent */ }
  }, [projectId, stopPolling, onCompleted])

  const fetchStatusRef = useRef(fetchStatus)
  fetchStatusRef.current = fetchStatus
  useEffect(() => {
    const doFetch = () => fetchStatusRef.current()
    void doFetch()
    pollingRef.current = setInterval(doFetch, 5000)
    const fallback = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true
        stopPolling()
        setData({ status: "done", phase: "done", stats: null })
      }
    }, 300000)
    return () => { stopPolling(); clearTimeout(fallback) }
  }, [projectId, stopPolling])

  if (data?.status === "done") {
    return (
      <div className={s.inlineSuccess}>
        <Icon icon="hugeicons:tick-02" />
        {t("studio.hotfixApplied")}
      </div>
    )
  }

  if (data?.status === "error") {
    return (
      <div className={s.inlineDanger}>
        <Icon icon="hugeicons:cancel-01" />
        {t("studio.hotfixFailed")}
      </div>
    )
  }

  // Running
  const phaseKey = data?.phase ? phaseI18nKeys[data.phase] : null
  const phaseLabel = phaseKey ? t(phaseKey) : t("studio.applyingHotfix")
  const hasStats = data?.stats && data.stats.total > 0

  return (
    <div className={s.inlineWarning} style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--size-1-5)" }}>
        <Icon icon="hugeicons:loading-03" className={s.spin} />
        {phaseLabel}...
      </div>
      {hasStats && data?.stats && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--size-1-5)" }}>
          <div className={s.progressTrack} style={{ flex: 1 }}>
            <div className={s.progressFill} style={{ width: `${Math.min(100, Math.round((data.stats.done / data.stats.total) * 100))}%` }} />
          </div>
          <span style={{ fontSize: "0.62rem" }}>{data.stats.done}/{data.stats.total}</span>
        </div>
      )}
    </div>
  )
}
