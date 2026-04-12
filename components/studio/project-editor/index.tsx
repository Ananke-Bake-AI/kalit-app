"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Icon } from "@/components/icon"
import { brokerFetch } from "@/lib/broker-direct"
import {
  FUN_MESSAGE_KEYS,
  getPollInterval,
  formatElapsed,
  formatDuration,
  PHASE_LABEL_KEYS,
  type TaskStats,
  type PollData,
} from "@/lib/build-utils"
import { useI18n } from "@/stores/i18n"
import s from "./project-editor.module.scss"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProjectState = "loading" | "polling" | "preview" | "error"

interface DownloadInfo {
  downloadCost: number
  monthlyDownloadsUsed: number
  monthlyDownloadsLimit: number
  creditsBalance: number
  plan: string
  withinQuota: boolean
}

interface HotfixInfo {
  hotfixCost: number
  monthlyHotfixesUsed: number
  monthlyHotfixesLimit: number
  creditsBalance: number
  plan: string
  withinQuota: boolean
}

// ---------------------------------------------------------------------------
// Download modal
// ---------------------------------------------------------------------------

function DownloadModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [info, setInfo] = useState<DownloadInfo | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await brokerFetch(`/api/broker/project/${projectId}/download`)
        if (res.ok) {
          const json = await res.json()
          if (json.success) setInfo(json.data)
        }
      } catch {
        /* silent */
      } finally {
        setFetching(false)
      }
    })()
  }, [projectId])

  const canConfirm = info && (info.withinQuota || info.creditsBalance >= info.downloadCost)
  const needsUpgrade = info && !info.withinQuota && info.creditsBalance < info.downloadCost

  async function handleDownload() {
    setLoading(true)
    setError("")
    try {
      const res = await brokerFetch(`/api/broker/project/${projectId}/download`, { method: "POST" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(
          res.status === 402
            ? t("studio.notEnoughCreditsDownload")
            : (json as { error?: string }).error || t("studio.downloadFailed"),
        )
        setLoading(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `project-${projectId}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch {
      setError(t("studio.networkError"))
      setLoading(false)
    }
  }

  return (
    <div
      className={s.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div className={s.modal}>
        {done ? (
          <div className={s.center} style={{ padding: "var(--size-3) 0" }}>
            <Icon icon="hugeicons:tick-02" style={{ fontSize: "2rem", color: "var(--success)" }} />
            <span className={s.modalTitle}>{t("studio.downloaded")}</span>
            <button className={s.modalBtnSecondary} onClick={onClose}>
              {t("studio.close")}
            </button>
          </div>
        ) : fetching ? (
          <div className={s.center}>
            <div className={s.loader} />
          </div>
        ) : (
          <>
            <span className={s.modalTitle}>{t("studio.downloadTitle")}</span>
            {info &&
              (info.withinQuota ? (
                <div className={s.modalQuotaOk}>
                  <span className={s.modalRowLabel}>{t("studio.freeDownload")}</span>
                  <span className={s.modalRowValue} style={{ color: "var(--success)" }}>
                    {info.monthlyDownloadsUsed}/{info.monthlyDownloadsLimit} {t("studio.thisMonth")}
                  </span>
                </div>
              ) : (
                <>
                  <div className={s.modalRow}>
                    <span className={s.modalRowLabel}>{t("studio.monthlyQuota")}</span>
                    <span className={s.modalRowValue} style={{ color: "var(--color-3)" }}>
                      {info.monthlyDownloadsUsed}/{info.monthlyDownloadsLimit} {t("studio.used")}
                    </span>
                  </div>
                  <div className={s.modalRow}>
                    <span className={s.modalRowLabel}>{t("studio.cost")}</span>
                    <span className={s.modalRowValue}>{info.downloadCost} credits</span>
                  </div>
                  <div className={s.modalRow}>
                    <span className={s.modalRowLabel}>{t("studio.balance")}</span>
                    <span
                      className={s.modalRowValue}
                      style={{ color: needsUpgrade ? "var(--danger)" : undefined }}
                    >
                      {info.creditsBalance}
                    </span>
                  </div>
                </>
              ))}
            {error && <span className={s.modalError}>{error}</span>}
            {needsUpgrade ? (
              <>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center" }}>
                  {t("studio.notEnoughCreditsDownload")}
                </span>
                <div className={s.modalBtnRow}>
                  {info && info.plan !== "max" && (
                    <button
                      className={s.modalBtnPrimary}
                      onClick={() => router.push("/settings/billing")}
                    >
                      {t("studio.upgradePlan")}
                    </button>
                  )}
                  <button className={s.modalBtnSecondary} onClick={onClose}>
                    {t("studio.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <div className={s.modalBtnRow}>
                <button className={s.modalBtnSecondary} onClick={onClose} disabled={loading}>
                  {t("studio.cancel")}
                </button>
                <button
                  className={s.modalBtnPrimary}
                  onClick={handleDownload}
                  disabled={loading || !canConfirm}
                >
                  {loading ? t("studio.downloading") : t("studio.confirm")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hotfix modal
// ---------------------------------------------------------------------------

function HotfixModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useI18n()
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState("")
  const [info, setInfo] = useState<HotfixInfo | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await brokerFetch(`/api/broker/project/${projectId}/hotfix`)
        if (res.ok) {
          const json = await res.json()
          if (json.success) setInfo(json.data)
        }
      } catch {
        /* silent */
      } finally {
        setFetching(false)
      }
    })()
  }, [projectId])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose, loading])

  const canConfirm = info && (info.withinQuota || info.creditsBalance >= info.hotfixCost)
  const needsUpgrade = info && !info.withinQuota && info.creditsBalance < info.hotfixCost

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return
    setLoading(true)
    setError("")

    try {
      const res = await brokerFetch(`/api/broker/project/${projectId}/hotfix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(
          res.status === 402
            ? t("studio.notEnoughCreditsHotfix")
            : json.error || t("studio.requestFailed"),
        )
        setLoading(false)
        return
      }
      onSuccess()
    } catch {
      setError(t("studio.networkError"))
      setLoading(false)
    }
  }

  return (
    <div
      className={s.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div className={s.modal}>
        {fetching ? (
          <div className={s.center}>
            <div className={s.loader} />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--size-2)" }}>
              <div className={s.hotfixIcon}>
                <Icon icon="hugeicons:wrench-01" />
              </div>
              <span className={s.modalTitle}>{t("studio.hotfix")}</span>
            </div>

            {info &&
              (info.withinQuota ? (
                <div className={s.modalQuotaOk}>
                  <span className={s.modalRowLabel}>{t("studio.freeHotfix")}</span>
                  <span className={s.modalRowValue} style={{ color: "var(--success)" }}>
                    {info.monthlyHotfixesUsed}/{info.monthlyHotfixesLimit} {t("studio.thisMonth")}
                  </span>
                </div>
              ) : (
                <>
                  <div className={s.modalRow}>
                    <span className={s.modalRowLabel}>{t("studio.monthlyQuota")}</span>
                    <span className={s.modalRowValue} style={{ color: "var(--color-3)" }}>
                      {info.monthlyHotfixesUsed}/{info.monthlyHotfixesLimit} {t("studio.used")}
                    </span>
                  </div>
                  <div className={s.modalRow}>
                    <span className={s.modalRowLabel}>{t("studio.cost")}</span>
                    <span className={s.modalRowValue}>{info.hotfixCost} credits</span>
                  </div>
                  <div className={s.modalRow}>
                    <span className={s.modalRowLabel}>{t("studio.balance")}</span>
                    <span
                      className={s.modalRowValue}
                      style={{ color: needsUpgrade ? "var(--danger)" : undefined }}
                    >
                      {info.creditsBalance}
                    </span>
                  </div>
                </>
              ))}

            {needsUpgrade ? (
              <>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center" }}>
                  {t("studio.notEnoughCreditsHotfix")}
                </span>
                <div className={s.modalBtnRow}>
                  {info && info.plan !== "max" && (
                    <button
                      className={s.modalBtnPrimary}
                      onClick={() => router.push("/settings/billing")}
                    >
                      {t("studio.upgradePlan")}
                    </button>
                  )}
                  <button className={s.modalBtnSecondary} onClick={onClose}>
                    {t("studio.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--size-3)" }}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("studio.describeBug")}
                  rows={4}
                  disabled={loading}
                  className={s.hotfixTextarea}
                />
                {error && <span className={s.modalError}>{error}</span>}
                <div className={s.modalBtnRow}>
                  <button
                    type="button"
                    className={s.modalBtnSecondary}
                    onClick={onClose}
                    disabled={loading}
                  >
                    {t("studio.cancel")}
                  </button>
                  <button
                    type="submit"
                    className={s.modalBtnPrimary}
                    disabled={loading || !prompt.trim() || !canConfirm}
                  >
                    {loading ? t("studio.sending") : t("studio.confirm")}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ProjectEditor() {
  const { t } = useI18n()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [pageState, setPageState] = useState<ProjectState>("loading")
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [projectTags, setProjectTags] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  const [pausing, setPausing] = useState(false)
  const [projectTypeLabel, setProjectTypeLabel] = useState<"landing" | "webapp">("landing")

  // Polling state
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pollData, setPollData] = useState<PollData>({
    phase: null,
    tasks: null,
    startedAt: null,
    estimatedEndAt: null,
    tokensSpent: 0,
    totalWorkDurationMs: 0,
  })

  // Iframe state
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeKey, setIframeKey] = useState(() => Date.now())
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("tablet")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(30)
  const autoRefreshRef = useRef(true)
  useEffect(() => {
    autoRefreshRef.current = autoRefresh
  }, [autoRefresh])

  // Modals
  const [showDownload, setShowDownload] = useState(false)
  const [showHotfix, setShowHotfix] = useState(false)

  // Progress bar helpers
  function startProgressBar() {
    progressRef.current = 0
    setProgress(0)
    progressTimerRef.current = setInterval(() => {
      progressRef.current = Math.min(progressRef.current + 0.5, 15)
      setProgress(progressRef.current)
    }, 2000)
  }
  function stopProgressBar(complete: boolean) {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
    if (complete) setProgress(100)
  }
  function startMessages() {
    setMsgIndex(0)
    msgTimerRef.current = setInterval(() => {
      setMsgIndex((i) => (i + 1) % FUN_MESSAGE_KEYS.length)
    }, 3000)
  }
  function stopMessages() {
    if (msgTimerRef.current) {
      clearInterval(msgTimerRef.current)
      msgTimerRef.current = null
    }
  }
  function updateProgressFromTasks(tasks: TaskStats | null) {
    if (tasks && tasks.total > 0) {
      const realProgress = Math.round((tasks.done / tasks.total) * 100)
      progressRef.current = Math.max(progressRef.current, realProgress)
      setProgress(progressRef.current)
    }
  }

  // Polling
  const pollRef = useRef<(attempt: number) => void>(() => {})
  const poll = useCallback(
    (attempt: number) => {
      const delay = getPollInterval(attempt)
      pollTimerRef.current = setTimeout(async () => {
        try {
          const res = await brokerFetch(`/api/broker/project/${id}/status`)
          if (!res.ok) {
            stopProgressBar(false)
            stopMessages()
            setErrorMessage(t("studio.statusCheckFailed"))
            setPageState("error")
            return
          }
          const json = await res.json()
          const data = json.data || json
          const status: string = data?.status

          if (data?.title) setProjectTitle(data.title)
          if (data?.tags?.length) setProjectTags(data.tags)

          if (data?.phase || data?.tasks || data?.tokensSpent != null) {
            setPollData({
              phase: data.phase ?? null,
              tasks: data.tasks ?? null,
              startedAt: data.startedAt ?? null,
              estimatedEndAt: data.estimatedEndAt ?? null,
              tokensSpent: data.tokensSpent ?? 0,
              totalWorkDurationMs: data.totalWorkDurationMs ?? 0,
            })
            updateProgressFromTasks(data.tasks ?? null)
          }

          if (status === "completed") {
            stopProgressBar(true)
            stopMessages()
            setPageState("preview")
          } else if (status === "failed") {
            stopProgressBar(false)
            stopMessages()
            setErrorMessage(data?.error || t("studio.generationFailed"))
            setPageState("error")
          } else {
            pollRef.current(attempt + 1)
          }
        } catch {
          stopProgressBar(false)
          stopMessages()
          setErrorMessage(t("studio.networkError"))
          setPageState("error")
        }
      }, delay)
    },
    [id],
  )
  useEffect(() => {
    pollRef.current = poll
  }, [poll])

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || pageState !== "polling" || !id) return
    setAutoRefreshCountdown(30)
    const interval = setInterval(() => {
      setAutoRefreshCountdown((prev) => {
        if (prev <= 1) {
          if (autoRefreshRef.current) setIframeKey(Date.now())
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, pageState, id])

  // Initial fetch on mount
  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await brokerFetch(`/api/broker/project/${id}/status`)
        if (!res.ok) {
          if (!cancelled) {
            setErrorMessage(t("studio.projectNotFound"))
            setPageState("error")
          }
          return
        }
        const json = await res.json()
        const data = json.data || json
        if (!json.success && json.error) {
          if (!cancelled) {
            setErrorMessage(json.error || t("studio.failedToLoad"))
            setPageState("error")
          }
          return
        }
        const status = data?.status
        if (data?.title) setProjectTitle(data.title)
        if (data?.tags?.length) setProjectTags(data.tags)
        if (data?.projectType) setProjectTypeLabel(data.projectType)

        if (data?.phase || data?.tasks || data?.tokensSpent != null) {
          setPollData({
            phase: data.phase ?? null,
            tasks: data.tasks ?? null,
            startedAt: data.startedAt ?? null,
            estimatedEndAt: data.estimatedEndAt ?? null,
            tokensSpent: data.tokensSpent ?? 0,
            totalWorkDurationMs: data.totalWorkDurationMs ?? 0,
          })
        }

        if (cancelled) return

        if (status === "completed") {
          setPageState("preview")
        } else if (status === "failed") {
          setErrorMessage(data?.error || t("studio.generationFailed"))
          setPageState("error")
        } else {
          setPageState("polling")
          startProgressBar()
          startMessages()
          updateProgressFromTasks(data?.tasks ?? null)
          pollRef.current(1)
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(t("studio.networkError"))
          setPageState("error")
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      if (msgTimerRef.current) clearInterval(msgTimerRef.current)
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  // Pause handler
  async function handlePause() {
    if (!id || pausing) return
    setPausing(true)
    try {
      const res = await brokerFetch(`/api/broker/project/${id}/hotfix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      })
      if (res.ok) {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
        stopProgressBar(false)
        stopMessages()
        setErrorMessage(t("studio.pausedByUser"))
        setPageState("error")
      }
    } catch {
      // ignore
    } finally {
      setPausing(false)
    }
  }

  const hasTaskforceData = pollData.phase !== null || pollData.tasks !== null
  const phaseLabelKey = pollData.phase ? PHASE_LABEL_KEYS[pollData.phase] : null
  const phaseLabel = phaseLabelKey ? t(phaseLabelKey) : pollData.phase
  const elapsed = formatElapsed(pollData.startedAt, t)

  const iframeClass =
    previewDevice === "mobile"
      ? s.iframeMobile
      : previewDevice === "desktop"
        ? s.iframeDesktop
        : s.iframeTablet

  // ── Loading ──
  if (pageState === "loading") {
    return (
      <div className={s.shell}>
        <div className={s.center}>
          <div className={s.loader} />
        </div>
      </div>
    )
  }

  // ── Error ──
  if (pageState === "error") {
    return (
      <div className={s.shell}>
        <div className={s.header}>
          <Link href="/studio" className={s.backBtn}>
            <Icon icon="hugeicons:arrow-left-01" />
            {t("studio.studio")}
          </Link>
        </div>
        <div className={s.errorWrap}>
          <div className={s.errorIcon}>
            <Icon icon="hugeicons:alert-02" />
          </div>
          <span className={s.errorText}>{errorMessage}</span>
          <button className={s.errorBtn} onClick={() => router.push("/studio")}>
            {t("studio.backToStudio")}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={s.shell}>
      {/* Header */}
      <div className={s.header}>
        <Link href="/studio" className={s.backBtn}>
          <Icon icon="hugeicons:arrow-left-01" />
          {t("studio.studio")}
        </Link>

        <span className={s.headerTitle}>
          {projectTitle || t("studio.preview")}
        </span>

        {projectTypeLabel === "webapp" && (
          <span className={s.typeBadge}>{t("studio.webApp")}</span>
        )}

        <div className={s.headerActions}>
          {pageState === "preview" && (
            <>
              <button
                className={s.headerBtn}
                onClick={() => setShowDownload(true)}
                title={t("studio.download")}
              >
                <Icon icon="hugeicons:download-04" />
              </button>
              <Link
                href={`/studio/project/${id}/publish`}
                className={s.headerBtn}
                title={t("studio.publish")}
              >
                <Icon icon="hugeicons:rocket-01" />
              </Link>
              <span className={s.headerSep} />
              <button
                className={s.headerBtnHotfix}
                onClick={() => setShowHotfix(true)}
                title={t("studio.hotfix")}
              >
                <Icon icon="hugeicons:wrench-01" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      {projectTags.length > 0 && (
        <div className={s.tags}>
          {projectTags.map((tag) => (
            <span key={tag} className={s.tag}>{tag}</span>
          ))}
          {pollData.totalWorkDurationMs > 0 && (
            <span className={s.tag}>{formatDuration(pollData.totalWorkDurationMs)}</span>
          )}
        </div>
      )}

      {/* Polling bar */}
      {pageState === "polling" && (
        <div className={s.pollingBar}>
          <div className={s.pollingTop}>
            <span className={s.pollingLabel}>
              {hasTaskforceData && phaseLabel ? phaseLabel : t(FUN_MESSAGE_KEYS[msgIndex])}
            </span>
            <div className={s.pollingMeta}>
              {elapsed && <span>{elapsed}</span>}
              <button className={s.pauseBtn} onClick={handlePause} disabled={pausing}>
                {pausing ? t("studio.pausing") : t("studio.pause")}
              </button>
            </div>
          </div>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${progress}%` }} />
          </div>
          {pollData.tasks && pollData.tasks.total > 0 && (
            <div className={s.pollingMeta}>
              <span>
                {pollData.tasks.done}/{pollData.tasks.total} {t("studio.tasks")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Iframe preview */}
      {(pageState === "polling" || pageState === "preview") && id && (
        <div className={s.previewArea}>
          <div className={s.iframeWrap}>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={`/api/broker/project/${id}/iframe?_t=${iframeKey}`}
              className={iframeClass}
              title={t("studio.preview")}
            />

            {/* Device toggle */}
            <div className={s.deviceToggle}>
              <button
                className={previewDevice === "desktop" ? s.deviceBtnActive : s.deviceBtn}
                onClick={() => setPreviewDevice("desktop")}
                title={t("studio.desktop")}
              >
                <Icon icon="hugeicons:computer" />
              </button>
              <button
                className={previewDevice === "tablet" ? s.deviceBtnActive : s.deviceBtn}
                onClick={() => setPreviewDevice("tablet")}
                title={t("studio.tablet")}
              >
                <Icon icon="hugeicons:tablet-01" />
              </button>
              <button
                className={previewDevice === "mobile" ? s.deviceBtnActive : s.deviceBtn}
                onClick={() => setPreviewDevice("mobile")}
                title={t("studio.mobile")}
              >
                <Icon icon="hugeicons:smart-phone-01" />
              </button>
            </div>

            {/* Refresh controls */}
            <div className={s.refreshControls}>
              {pageState === "polling" && (
                <>
                  <button
                    className={autoRefresh ? s.refreshActive : s.refreshBtn}
                    onClick={() => {
                      setAutoRefresh((v) => !v)
                      setAutoRefreshCountdown(30)
                    }}
                    title={autoRefresh ? t("studio.pauseAutoRefresh") : t("studio.enableAutoRefresh")}
                  >
                    <Icon icon={autoRefresh ? "hugeicons:pause" : "hugeicons:play"} />
                  </button>
                  {autoRefresh && (
                    <span className={s.refreshCountdown}>{autoRefreshCountdown}</span>
                  )}
                </>
              )}
              <button
                className={s.refreshBtn}
                onClick={() => {
                  setIframeKey(Date.now())
                  setAutoRefreshCountdown(30)
                }}
                title={t("studio.reloadPreview")}
              >
                <Icon icon="hugeicons:refresh" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download modal */}
      {showDownload && id && (
        <DownloadModal projectId={id} onClose={() => setShowDownload(false)} />
      )}

      {/* Hotfix modal */}
      {showHotfix && id && (
        <HotfixModal
          projectId={id}
          onClose={() => setShowHotfix(false)}
          onSuccess={() => {
            setShowHotfix(false)
            // Restart polling after hotfix
            setPageState("polling")
            startProgressBar()
            startMessages()
            pollRef.current(0)
          }}
        />
      )}
    </div>
  )
}
