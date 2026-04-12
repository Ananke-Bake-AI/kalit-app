"use client"

import { useCallback } from "react"
import { useStudioStore } from "@/stores/studio"
import { useI18n } from "@/stores/i18n"
import { brokerFetch } from "@/lib/broker-direct"
import { Icon } from "@/components/icon"
import type { ChatSession } from "@/types/studio"
import clsx from "clsx"
import s from "./session-sidebar.module.scss"

interface SessionSidebarProps {
  onSessionSelect: (id: string) => void
}

export function SessionSidebar({ onSessionSelect }: SessionSidebarProps) {
  const { t } = useI18n()
  const {
    sessions,
    activeSessionId,
    deleteConfirm,
    setDeleteConfirm,
    addSession,
    removeSession,
    setActiveSessionId,
    setMessages,
    quota,
  } = useStudioStore()

  const handleNewChat = useCallback(async () => {
    try {
      const res = await brokerFetch("/api/broker/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "minimax-m2.7:cloud" }),
      })
      if (res.ok) {
        const data = await res.json()
        const session: ChatSession = data.session
        addSession(session)
        setActiveSessionId(session.id)
        setMessages([])
        onSessionSelect(session.id)
      }
    } catch {
      // silent
    }
  }, [addSession, setActiveSessionId, setMessages, onSessionSelect])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await brokerFetch(`/api/broker/sessions/${id}`, { method: "DELETE" })
      if (res.ok) {
        removeSession(id)
        if (activeSessionId === id) {
          setActiveSessionId(null)
          setMessages([])
        }
      }
    } catch {
      // silent
    }
    setDeleteConfirm(null)
  }, [activeSessionId, removeSession, setActiveSessionId, setMessages, setDeleteConfirm])

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id)
    onSessionSelect(id)
    // Close sidebar on mobile
    if (window.innerWidth < 900) {
      useStudioStore.getState().setSidebarOpen(false)
    }
  }, [setActiveSessionId, onSessionSelect])

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <span className={s.logo}>{t("studio.title")}</span>
        <button className={s.newChat} onClick={handleNewChat} title={t("studio.newChat")}>
          <Icon icon="hugeicons:edit-02" />
        </button>
      </div>

      {/* Session list */}
      <div className={s.list}>
        {sessions.length === 0 && (
          <p className={s.empty}>{t("studio.noConversations")}</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={clsx(s.session, activeSessionId === session.id && s.sessionActive)}
          >
            {deleteConfirm === session.id ? (
              <div className={s.confirmRow}>
                <span className={s.confirmText}>{t("studio.deleteConfirm")}</span>
                <button className={s.confirmYes} onClick={() => handleDelete(session.id)}>
                  {t("studio.yes")}
                </button>
                <button className={s.confirmNo} onClick={() => setDeleteConfirm(null)}>
                  {t("studio.no")}
                </button>
              </div>
            ) : (
              <button
                className={s.sessionBtn}
                onClick={() => handleSelectSession(session.id)}
              >
                <span className={s.sessionTitle}>
                  {session.title || t("studio.newConversation")}
                </span>
                {session.isProcessing && (
                  <span className={s.processingDot} />
                )}
              </button>
            )}
            {deleteConfirm !== session.id && (
              <button
                className={s.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteConfirm(session.id)
                }}
                title={t("studio.delete")}
              >
                <Icon icon="hugeicons:delete-02" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Quota footer */}
      {quota && (
        <div className={s.footer}>
          <div className={s.quotaBar}>
            <div
              className={s.quotaFill}
              style={{ width: `${Math.min(quota.percentage, 100)}%` }}
            />
          </div>
          <span className={s.quotaText}>
            {quota.remainingCredits} / {quota.creditsPerMonth} {t("studio.credits")}
          </span>
          <span className={s.quotaPlan}>{quota.plan}</span>
        </div>
      )}
    </div>
  )
}
