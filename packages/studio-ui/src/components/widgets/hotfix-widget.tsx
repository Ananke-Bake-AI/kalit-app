"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { brokerFetch } from "../../host"
import { useI18n } from "@kalit/i18n/react"
import { Icon } from "../../primitives/icon"
import s from "./widgets.module.scss"

type TaskStatus = "running" | "done" | "error" | "idle"
type TaskPhase = "init" | "planning" | "working" | "testing" | "done" | null

interface TaskData {
  status: TaskStatus
  phase: TaskPhase
  stats: { total: number; done: number; inProgress: number } | null
}

type TaskKind = "hotfix" | "sprint" | "patch"

// i18n keys vary per kind so the running/done/failed labels make sense.
// Missing keys fall back to the legacy hotfix keys so older translations
// keep working while new locales get populated.
const kindLabels: Record<TaskKind, { running: string; done: string; failed: string; phasePrefix: string }> = {
  hotfix: {
    running: "studio.applyingHotfix",
    done: "studio.hotfixApplied",
    failed: "studio.hotfixFailed",
    phasePrefix: "hotfix",
  },
  sprint: {
    running: "studio.applyingSprint",
    done: "studio.sprintApplied",
    failed: "studio.sprintFailed",
    phasePrefix: "sprint",
  },
  patch: {
    running: "studio.applyingPatch",
    done: "studio.patchApplied",
    failed: "studio.patchFailed",
    phasePrefix: "patch",
  },
}

interface ProjectTaskWidgetProps {
  projectId: string
  kind?: TaskKind
  onCompleted?: () => void
}

export function ProjectTaskWidget({ projectId, kind = "hotfix", onCompleted }: ProjectTaskWidgetProps) {
  const { t } = useI18n()
  const [data, setData] = useState<TaskData | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedRef = useRef(false)

  const labels = kindLabels[kind]

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
      // Taskforce's project/status returns `status` in {running, done,
      // idle, error, cancelled} — NEVER "completed", that's our internal
      // widget-table label. Before this fix the widget UI checked
      // status==="completed", missed the actual "done" string, and
      // relied entirely on phase==="done" — which is the LAST phase
      // (after init/planning/working/testing) and isn't always set
      // when the run shortcuts (e.g. hotfix solo path), so the widget
      // stayed at "Applying hotfix..." forever even after the run was
      // fully done on the broker side.
      const status: TaskStatus =
        tf.status === "done" || tf.status === "completed" || tf.phase === "done" ? "done" :
        tf.status === "error" || tf.status === "failed" || tf.phase === "error" ? "error" :
        tf.status === "cancelled" || tf.status === "aborted" ? "idle" : "running"

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
        {t(labels.done)}
      </div>
    )
  }

  if (data?.status === "error") {
    return (
      <div className={s.inlineDanger}>
        <Icon icon="hugeicons:cancel-01" />
        {t(labels.failed)}
      </div>
    )
  }

  const phaseKey = data?.phase ? `studio.${labels.phasePrefix}${capitalize(data.phase)}` : null
  const phaseLabel = phaseKey ? t(phaseKey) : t(labels.running)
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Thin wrappers so the widget-renderer can keep a clean switch and each kind
// gets its own display name in React DevTools.
export function HotfixWidget(props: Omit<ProjectTaskWidgetProps, "kind">) {
  return <ProjectTaskWidget {...props} kind="hotfix" />
}

export function SprintWidget(props: Omit<ProjectTaskWidgetProps, "kind">) {
  return <ProjectTaskWidget {...props} kind="sprint" />
}

export function PatchWidget(props: Omit<ProjectTaskWidgetProps, "kind">) {
  return <ProjectTaskWidget {...props} kind="patch" />
}
