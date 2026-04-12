"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { brokerFetch } from "@/lib/broker-direct"
import { useI18n } from "@/stores/i18n"
import { Icon } from "@/components/icon"
import s from "./widgets.module.scss"

type ProjectPhase = "planning" | "working" | "testing" | null
type ProjectStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"
type ProjectType = "landing" | "webapp"

interface StatusData {
  status: ProjectStatus
  prompt: string
  title: string | null
  phase: ProjectPhase
  tasks: { total: number; done: number; inProgress: number } | null
  startedAt: string | null
  tokensSpent: number
  projectType?: ProjectType
}

interface ProjectWidgetProps {
  projectId: string
  onCompleted?: () => void
}

// ── Helpers ──

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return "0s"
  const ms = Date.now() - new Date(startedAt).getTime()
  const sec = Math.floor(ms / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  if (hr > 0) return `${hr}h ${min % 60}m`
  if (min > 0) return `${min}m ${sec % 60}s`
  return `${sec}s`
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "\u2026"
}

const PHASES: { key: NonNullable<ProjectPhase>; i18nKey: string }[] = [
  { key: "planning", i18nKey: "studio.phasePlanning" },
  { key: "working", i18nKey: "studio.phaseWorking" },
  { key: "testing", i18nKey: "studio.phaseTesting" },
]

// ── Phase indicator ──

function PhaseIndicator({ phase }: { phase: ProjectPhase }) {
  const { t } = useI18n()
  const activeIdx = phase ? PHASES.findIndex((p) => p.key === phase) : -1

  return (
    <div className={s.phases}>
      {PHASES.map((p, i) => {
        const isActive = i === activeIdx
        const isDone = i < activeIdx
        return (
          <div key={p.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span className={isActive ? s.phaseActive : isDone ? s.phaseDone : s.phase}>
              {isActive && <span className={s.dotPulse} style={{ background: "var(--color-5)" }} />}
              {isDone && <Icon icon="hugeicons:tick-02" />}
              {t(p.i18nKey)}
            </span>
            {i < PHASES.length - 1 && <span className={s.phaseSep} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ──

export function ProjectWidget({ projectId, onCompleted }: ProjectWidgetProps) {
  const { t } = useI18n()
  const [data, setData] = useState<StatusData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const finishedRef = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    if (finishedRef.current) return
    try {
      const res = await brokerFetch(`/api/broker/project/${projectId}/status`)
      if (!res.ok) {
        if (res.status === 404) { setError(t("studio.projectNotFound")); stopPolling() }
        return
      }
      const json = await res.json()
      if (!json.success) { setError(json.error || t("studio.couldNotLoad")); return }

      const incoming: StatusData = json.data
      setData(incoming)
      setError(null)

      if (incoming.status === "completed" || incoming.status === "failed" || incoming.status === "cancelled") {
        finishedRef.current = true
        stopPolling()
        if (incoming.status === "completed" && onCompleted) {
          setTimeout(onCompleted, 3000)
        }
      }
    } catch {
      setError(t("studio.networkRetrying"))
    }
  }, [projectId, stopPolling, onCompleted])

  const fetchStatusRef = useRef(fetchStatus)
  fetchStatusRef.current = fetchStatus
  useEffect(() => {
    const doFetch = () => fetchStatusRef.current()
    void doFetch()
    pollingRef.current = setInterval(doFetch, 5000)
    return stopPolling
  }, [projectId, stopPolling])

  // Tick elapsed time
  useEffect(() => {
    if (data?.status !== "pending" && data?.status !== "processing") return
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [data?.status])

  // Skeleton
  if (!data && !error) {
    return (
      <div className={s.skeleton}>
        <div className={s.skeletonLine} style={{ width: "66%" }} />
        <div className={s.skeletonLine} style={{ width: "40%" }} />
      </div>
    )
  }

  // Error only
  if (error && !data) {
    return (
      <div className={s.cardDanger}>
        <p className={s.desc} style={{ color: "var(--danger)" }}>{error}</p>
        <button className={s.retryBtn} onClick={() => { setError(null); void fetchStatus() }}>{t("studio.retry")}</button>
      </div>
    )
  }

  if (!data) return null
  const displayName = data.title ?? truncate(data.prompt, 50)

  // ── Completed ──
  if (data.status === "completed") {
    const isWebapp = data.projectType === "webapp"
    return (
      <div className={isWebapp ? s.cardInfo : s.cardSuccess}>
        <div className={s.header}>
          <span className={isWebapp ? s.dotInfo : s.dotSuccess}>
            <Icon icon={isWebapp ? "hugeicons:clock-01" : "hugeicons:tick-02"} />
          </span>
          <span className={`${s.statusLabel} ${isWebapp ? s.textInfo : s.textSuccess}`}>
            {isWebapp ? t("studio.projectReadyWebapp") : t("studio.projectReady")}
          </span>
        </div>
        <p className={s.desc}>{displayName}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--size-2)" }}>
          <a href={`/studio/project/${projectId}`} className={s.actionBtn}>
            {t("studio.viewProject")}
            <Icon icon="hugeicons:link-square-02" />
          </a>
        </div>
      </div>
    )
  }

  // ── Failed ──
  if (data.status === "failed") {
    return (
      <div className={s.cardDanger}>
        <div className={s.header}>
          <span className={s.dotDanger}><Icon icon="hugeicons:cancel-01" /></span>
          <span className={`${s.statusLabel} ${s.textDanger}`}>{t("studio.generationFailed")}</span>
        </div>
        <p className={s.desc}>{displayName}</p>
        <button className={s.retryBtn} onClick={() => {
          setError(null); setData(null); finishedRef.current = false
          pollingRef.current = setInterval(fetchStatus, 5000)
          void fetchStatus()
        }}>{t("studio.retry")}</button>
      </div>
    )
  }

  // ── Cancelled ──
  if (data.status === "cancelled") {
    return (
      <div className={s.card}>
        <div className={s.header}>
          <span className={s.statusDot}><Icon icon="hugeicons:cancel-circle" /></span>
          <span className={s.statusLabel} style={{ color: "var(--text-secondary)" }}>{t("studio.projectCancelled")}</span>
        </div>
        <p className={s.desc}>{displayName}</p>
      </div>
    )
  }

  // ── Pending / Processing ──
  void now
  const hasTasks = data.tasks !== null && data.tasks.total > 0
  const pct = hasTasks && data.tasks ? Math.min(100, Math.round((data.tasks.done / data.tasks.total) * 100)) : 0

  return (
    <div className={s.card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--size-2)" }}>
        <p className={s.desc} style={{ fontWeight: 500, color: "var(--text)", WebkitLineClamp: 2 }}>
          {displayName}
        </p>
        <span className={s.genDots}>
          {t("studio.generating")}
          <span className={s.genDot} />
          <span className={s.genDot} />
          <span className={s.genDot} />
        </span>
      </div>

      {data.phase !== null && <PhaseIndicator phase={data.phase} />}

      {hasTasks && data.tasks && (
        <div className={s.progressWrap}>
          <div className={s.progressMeta}>
            <span>{data.tasks.done}/{data.tasks.total} {t("studio.tasks")}</span>
            <span style={{ color: "var(--color-5)", fontWeight: 500 }}>{pct}%</span>
          </div>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className={s.footer}>
        {data.startedAt && (
          <span>{t("studio.elapsed")} {formatElapsed(data.startedAt)}</span>
        )}
        {data.projectType && (
          <span className={data.projectType === "webapp" ? s.badgeBlue : s.badge}>
            {data.projectType === "webapp" ? t("studio.webApp") : t("studio.landing")}
          </span>
        )}
        <button
          className={s.cancelBtn}
          onClick={async () => {
            try {
              await brokerFetch(`/api/broker/project/${projectId}/pause`, { method: "POST" })
              stopPolling()
              finishedRef.current = true
              setData((prev) => prev ? { ...prev, status: "cancelled" } : null)
            } catch { /* silent */ }
          }}
        >
          {t("studio.cancel")}
        </button>
      </div>
    </div>
  )
}
