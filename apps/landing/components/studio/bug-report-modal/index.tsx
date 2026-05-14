"use client"

import { useEffect, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { useActiveMessages, useStudioStore } from "@kalit/studio-ui"
import { submitBugReport } from "@/server/actions/bug-report"
import { useI18n } from "@/stores/i18n"
import { Icon } from "@/components/icon"
import s from "./bug-report-modal.module.scss"

interface BugReportModalProps {
  open: boolean
  onClose: () => void
}

export function BugReportModal({ open, onClose }: BugReportModalProps) {
  const { t } = useI18n()
  const activeSessionId = useStudioStore((s) => s.activeSessionId)
  // Use the bound selector for a stable empty-array sentinel.
  // Inline `?? []` here would allocate a new array per render and
  // Zustand would treat each as a state change → re-render loop.
  const messages = useActiveMessages()
  const [description, setDescription] = useState("")
  const [pending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)

  // Reset on open — without this, reopening after a previous submit
  // shows the success state on a blank form.
  useEffect(() => {
    if (open) {
      setDescription("")
      setSubmitted(false)
    }
  }, [open])

  // Esc to close + click-outside.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  const handleSubmit = () => {
    const trimmed = description.trim()
    if (trimmed.length < 10) {
      toast.error(t("studio.bugReportTooShort"))
      return
    }
    // Snapshot the last 10 messages so the admin sees the conversation
    // tail without us shipping the whole thread. Strip large file
    // payloads and keep just role + truncated content.
    const recent = messages.slice(-10).map((m) => ({
      id: m.id,
      role: m.role,
      content: typeof m.content === "string"
        ? m.content.slice(0, 4000)
        : JSON.stringify(m.content).slice(0, 4000),
      createdAt: m.createdAt,
    }))
    const context = {
      sessionId: activeSessionId,
      capturedAt: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      url: typeof window !== "undefined" ? window.location.href : "",
      recentMessages: recent,
    }

    startTransition(async () => {
      const result = await submitBugReport({
        description: trimmed,
        sessionId: activeSessionId || undefined,
        context,
      })
      if ("error" in result) {
        toast.error(result.error || t("studio.bugReportFailed"))
        return
      }
      setSubmitted(true)
      toast.success(t("studio.bugReportSuccess"))
    })
  }

  return createPortal(
    <div className={s.overlay} onClick={onClose}>
      <div
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.header}>
          <Icon icon="hugeicons:bug-01" />
          <h3 id="bug-report-title">{t("studio.bugReportTitle")}</h3>
          <button className={s.closeBtn} onClick={onClose} aria-label={t("studio.close")}>
            <Icon icon="hugeicons:cancel-01" />
          </button>
        </div>

        {submitted ? (
          <div className={s.successBody}>
            <Icon icon="hugeicons:checkmark-circle-02" className={s.successIcon} />
            <h4>{t("studio.bugReportThanks")}</h4>
            <p>{t("studio.bugReportThanksDesc")}</p>
            <button className={s.primaryBtn} onClick={onClose}>
              {t("studio.close")}
            </button>
          </div>
        ) : (
          <>
            <div className={s.incentive}>
              <Icon icon="hugeicons:star" />
              <span>{t("studio.bugReportIncentive")}</span>
            </div>

            <p className={s.intro}>{t("studio.bugReportIntro")}</p>

            <label className={s.label} htmlFor="bug-report-desc">
              {t("studio.bugReportLabel")}
            </label>
            <textarea
              id="bug-report-desc"
              className={s.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("studio.bugReportPlaceholder")}
              rows={6}
              maxLength={4000}
              disabled={pending}
              autoFocus
            />

            <div className={s.contextNote}>
              <Icon icon="hugeicons:information-circle" />
              <span>{t("studio.bugReportContextNote")}</span>
            </div>

            <div className={s.actions}>
              <button className={s.cancelBtn} onClick={onClose} disabled={pending}>
                {t("studio.cancel")}
              </button>
              <button
                className={s.primaryBtn}
                onClick={handleSubmit}
                disabled={pending || description.trim().length < 10}
              >
                <Icon icon={pending ? "hugeicons:loading-03" : "hugeicons:sent"} />
                {pending ? t("studio.bugReportSubmitting") : t("studio.bugReportSubmit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
