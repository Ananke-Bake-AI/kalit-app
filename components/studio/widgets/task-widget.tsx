"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { brokerFetch } from "@/lib/broker-direct"
import { useI18n } from "@/stores/i18n"
import { Icon } from "@/components/icon"
import s from "./widgets.module.scss"

interface TaskState {
  taskId: string
  task: string
  status: "pending" | "running" | "delivering" | "completed" | "error"
  startedAt?: string
  result?: string
  tools?: string[]
}

interface TaskWidgetProps {
  taskId: string
  onCompleted?: () => void
}

function formatElapsed(startedAt: string | undefined): string {
  if (!startedAt) return "0s"
  const ms = Date.now() - new Date(startedAt).getTime()
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  if (min > 0) return `${min}m ${sec % 60}s`
  return `${sec}s`
}

export function TaskWidget({ taskId, onCompleted }: TaskWidgetProps) {
  const { t } = useI18n()
  const [data, setData] = useState<TaskState | null>(null)
  const [now, setNow] = useState(Date.now())
  const finishedRef = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
  }, [])

  const fetchStatus = useCallback(async () => {
    if (finishedRef.current) return
    try {
      const res = await brokerFetch(`/api/broker/task/${taskId}/status`)
      if (!res.ok) return
      const json = await res.json()
      setData(json)
      if (json.status === "completed" || json.status === "error") {
        finishedRef.current = true
        stopPolling()
        if (json.status === "completed" && onCompleted) setTimeout(onCompleted, 5000)
      }
    } catch { /* silent */ }
  }, [taskId, stopPolling, onCompleted])

  const fetchStatusRef = useRef(fetchStatus)
  fetchStatusRef.current = fetchStatus
  useEffect(() => {
    const doFetch = () => fetchStatusRef.current()
    void doFetch()
    pollingRef.current = setInterval(doFetch, 3000)
    return stopPolling
  }, [taskId, stopPolling])

  useEffect(() => {
    if (data?.status !== "running" && data?.status !== "pending") return
    const timer = setInterval(() => setNow(Date.now()), 3000)
    return () => clearInterval(timer)
  }, [data?.status])

  // Skeleton
  if (!data) {
    return (
      <div className={s.skeleton}>
        <div className={s.skeletonLine} style={{ width: "66%" }} />
        <div className={s.skeletonLine} style={{ width: "40%" }} />
      </div>
    )
  }

  // Completed
  if (data.status === "completed") {
    const preview = data.result && data.result.length > 200
      ? data.result.slice(0, 200) + "..."
      : data.result

    return (
      <div className={s.cardInfo}>
        <div className={s.header}>
          <span className={s.dotInfo}><Icon icon="hugeicons:tick-02" /></span>
          <span className={`${s.statusLabel} ${s.textInfo}`}>{t("studio.subAgentCompleted")}</span>
        </div>
        {data.tools && data.tools.length > 0 && (
          <div className={s.toolChips}>
            {data.tools.map((tool, i) => <span key={i} className={s.toolChip}>{tool}</span>)}
          </div>
        )}
        {preview && <p className={s.desc} style={{ paddingLeft: 26 }}>{preview}</p>}
      </div>
    )
  }

  // Error
  if (data.status === "error") {
    return (
      <div className={s.cardDanger}>
        <div className={s.header}>
          <span className={s.dotDanger}><Icon icon="hugeicons:cancel-01" /></span>
          <span className={`${s.statusLabel} ${s.textDanger}`}>{t("studio.subAgentFailed")}</span>
        </div>
        {data.result && <p className={s.desc} style={{ paddingLeft: 26 }}>{data.result}</p>}
      </div>
    )
  }

  // Running / Pending / Delivering
  void now
  const label = data.status === "delivering" ? t("studio.deliveringResults") : t("studio.subAgentWorking")

  return (
    <div className={s.card}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--size-2)" }}>
        <div className={s.header}>
          <span className={s.dotInfo}>
            <span className={s.dotPulse} style={{ background: "var(--color-2)" }} />
          </span>
          <span style={{ fontSize: "0.78rem", color: "var(--text)" }}>{label}</span>
        </div>
        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{formatElapsed(data.startedAt)}</span>
      </div>
      {data.tools && data.tools.length > 0 && (
        <div className={s.toolChips}>
          {data.tools.map((tool, i) => <span key={i} className={s.toolChip}>{tool}</span>)}
        </div>
      )}
      {data.task && <p className={s.desc} style={{ paddingLeft: 26 }}>{data.task}</p>}
    </div>
  )
}
