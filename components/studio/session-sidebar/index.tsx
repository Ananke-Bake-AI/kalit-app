"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStudioStore } from "@/stores/studio"
import { useI18n } from "@/stores/i18n"
import { brokerFetch } from "@/lib/broker-direct"
import { Icon } from "@/components/icon"
import { dateBucket, formatRelative, type DateBucket } from "@/lib/format-date"
import type { ChatSession } from "@/types/studio"
import clsx from "clsx"
import s from "./session-sidebar.module.scss"

interface SessionSidebarProps {
  onSessionSelect: (id: string) => void
  onNewChat: () => void | Promise<void>
}

const PROGRESS_MODE_KEY = "kalit_studio_progress_mode"
const PINNED_SESSIONS_KEY = "kalit_studio_pinned_sessions"

function readPinnedIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(PINNED_SESSIONS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

function writePinnedIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PINNED_SESSIONS_KEY, JSON.stringify([...ids]))
  } catch {
    // silent
  }
}

const BUCKET_ORDER: DateBucket[] = ["today", "yesterday", "last7", "last30", "older"]
const BUCKET_I18N: Record<DateBucket, string> = {
  today: "studio.groupToday",
  yesterday: "studio.groupYesterday",
  last7: "studio.groupLast7",
  last30: "studio.groupLast30",
  older: "studio.groupOlder",
}

export function SessionSidebar({ onSessionSelect, onNewChat }: SessionSidebarProps) {
  const { t, locale } = useI18n()
  const {
    sessions,
    activeSessionId,
    deleteConfirm,
    setDeleteConfirm,
    removeSession,
    setActiveSessionId,
    setMessages,
    updateSessionTitle,
    quota,
    progressMode,
    setProgressMode,
  } = useStudioStore()

  const [query, setQuery] = useState("")
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => readPinnedIds())
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Global ⌘K shortcut → focus search ─────────────────
  useEffect(() => {
    const focus = () => {
      const el = searchInputRef.current
      if (!el) return
      el.focus()
      el.select()
    }
    window.addEventListener("kalit:focus-sidebar-search", focus)
    return () => window.removeEventListener("kalit:focus-sidebar-search", focus)
  }, [])

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform),
    [],
  )
  const searchHint = isMac ? "⌘K" : "Ctrl+K"
  const newChatHint = isMac ? "⌘⇧O" : "Ctrl+Shift+O"

  // ── Close kebab menu when clicking outside ─────────────
  useEffect(() => {
    if (!menuOpenId) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpenId(null)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [menuOpenId])

  // ── Focus rename input when starting rename ────────────
  useEffect(() => {
    if (renamingId) {
      const el = renameInputRef.current
      if (el) {
        el.focus()
        el.select()
      }
    }
  }, [renamingId])

  // ── Filter + group ─────────────────────────────────────
  const { pinned, grouped } = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const filtered = normalized
      ? sessions.filter((sess) =>
          (sess.title || t("studio.newConversation")).toLowerCase().includes(normalized),
        )
      : sessions

    const pinnedList: ChatSession[] = []
    const out: Record<DateBucket, ChatSession[]> = {
      today: [],
      yesterday: [],
      last7: [],
      last30: [],
      older: [],
    }
    for (const sess of filtered) {
      if (pinnedIds.has(sess.id)) pinnedList.push(sess)
      else out[dateBucket(sess.updatedAt)].push(sess)
    }
    return { pinned: pinnedList, grouped: out }
  }, [sessions, query, t, pinnedIds])

  const hasAnyMatch = pinned.length > 0 || BUCKET_ORDER.some((b) => grouped[b].length > 0)

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => {
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
    },
    [activeSessionId, removeSession, setActiveSessionId, setMessages, setDeleteConfirm],
  )

  // ── Select ─────────────────────────────────────────────
  const handleSelectSession = useCallback(
    (id: string) => {
      if (renamingId === id) return
      setActiveSessionId(id)
      onSessionSelect(id)
      if (window.innerWidth < 900) {
        useStudioStore.getState().setSidebarOpen(false)
      }
    },
    [setActiveSessionId, onSessionSelect, renamingId],
  )

  // ── Rename ─────────────────────────────────────────────
  const startRename = useCallback(
    (sess: ChatSession) => {
      setMenuOpenId(null)
      setRenamingId(sess.id)
      setRenameDraft(sess.title || "")
    },
    [],
  )

  const cancelRename = useCallback(() => {
    setRenamingId(null)
    setRenameDraft("")
  }, [])

  const commitRename = useCallback(async () => {
    if (!renamingId) return
    const id = renamingId
    const next = renameDraft.trim()
    const original = sessions.find((sess) => sess.id === id)?.title || ""
    setRenamingId(null)
    setRenameDraft("")
    if (!next || next === original) return
    updateSessionTitle(id, next)
    try {
      await brokerFetch(`/api/broker/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      })
    } catch {
      updateSessionTitle(id, original)
    }
  }, [renamingId, renameDraft, sessions, updateSessionTitle])

  // ── Pin / Unpin (localStorage-backed, per browser) ─────
  const handleTogglePin = useCallback((session: ChatSession) => {
    setMenuOpenId(null)
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(session.id)) next.delete(session.id)
      else next.add(session.id)
      writePinnedIds(next)
      return next
    })
  }, [])

  // ── Mode toggle ────────────────────────────────────────
  const handleToggleProgressMode = useCallback(() => {
    const next = progressMode === "expert" ? "default" : "expert"
    setProgressMode(next)
    try {
      window.localStorage.setItem(PROGRESS_MODE_KEY, next)
    } catch {
      // silent
    }
    if (activeSessionId) {
      brokerFetch(`/api/broker/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressMode: next }),
      }).catch(() => {
        // silent
      })
    }
  }, [progressMode, setProgressMode, activeSessionId])

  const renderSession = (session: ChatSession) => {
    const displayTitle = session.title || t("studio.newConversation")
    const isConfirmingDelete = deleteConfirm === session.id
    const isRenaming = renamingId === session.id
    const isMenuOpen = menuOpenId === session.id

    return (
      <div
        key={session.id}
        className={clsx(s.session, activeSessionId === session.id && s.sessionActive)}
      >
        {isConfirmingDelete ? (
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
          <>
            <button
              className={s.sessionBtn}
              onClick={() => handleSelectSession(session.id)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (!isRenaming) startRename(session)
              }}
            >
              <span className={s.sessionInfo}>
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    className={s.renameInput}
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        commitRename()
                      } else if (e.key === "Escape") {
                        e.preventDefault()
                        cancelRename()
                      }
                    }}
                    onBlur={commitRename}
                  />
                ) : (
                  <span className={s.sessionTitle}>
                    {pinnedIds.has(session.id) && (
                      <Icon icon="hugeicons:pin" className={s.pinIcon} />
                    )}
                    {displayTitle}
                  </span>
                )}
                <span
                  className={s.sessionTime}
                  title={new Date(session.updatedAt).toLocaleString(locale)}
                >
                  {formatRelative(session.updatedAt, locale)}
                </span>
              </span>
              {session.isProcessing && <span className={s.processingDot} />}
            </button>
            <div className={s.menuWrapper} ref={isMenuOpen ? menuRef : undefined}>
              <button
                className={clsx(s.kebabBtn, isMenuOpen && s.kebabBtnOpen)}
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpenId(isMenuOpen ? null : session.id)
                }}
                title={t("studio.moreActions")}
                aria-label={t("studio.moreActions")}
                aria-expanded={isMenuOpen}
              >
                <Icon icon="hugeicons:more-horizontal-circle-02" />
              </button>
              {isMenuOpen && (
                <div className={s.menu} role="menu">
                  <button
                    className={s.menuItem}
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTogglePin(session)
                    }}
                  >
                    <Icon
                      icon={pinnedIds.has(session.id) ? "hugeicons:pin-off" : "hugeicons:pin"}
                    />
                    <span>{pinnedIds.has(session.id) ? t("studio.unpin") : t("studio.pin")}</span>
                  </button>
                  <button
                    className={s.menuItem}
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(session)
                    }}
                  >
                    <Icon icon="hugeicons:edit-02" />
                    <span>{t("studio.rename")}</span>
                  </button>
                  <button
                    className={clsx(s.menuItem, s.menuItemDanger)}
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenId(null)
                      setDeleteConfirm(session.id)
                    }}
                  >
                    <Icon icon="hugeicons:delete-02" />
                    <span>{t("studio.delete")}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={s.container}>
      {/* Header — new chat + search */}
      <div className={s.header}>
        <button
          type="button"
          className={s.newChatBtn}
          onClick={() => onNewChat()}
          title={`${t("studio.newChat")} (${newChatHint})`}
        >
          <Icon icon="hugeicons:edit-02" />
          <span>{t("studio.newChat")}</span>
          <kbd className={s.kbd}>{newChatHint}</kbd>
        </button>
        <div className={s.searchRow}>
          <Icon icon="hugeicons:search-01" className={s.searchIcon} />
          <input
            ref={searchInputRef}
            className={s.searchInput}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("studio.searchPlaceholder")}
          />
          {!query && <kbd className={s.kbd}>{searchHint}</kbd>}
          {query && (
            <button
              className={s.searchClear}
              onClick={() => setQuery("")}
              title={t("studio.clear")}
              aria-label={t("studio.clear")}
            >
              <Icon icon="hugeicons:cancel-circle" />
            </button>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className={s.list}>
        {sessions.length === 0 && (
          <p className={s.empty}>{t("studio.noConversations")}</p>
        )}
        {sessions.length > 0 && !hasAnyMatch && (
          <p className={s.empty}>{t("studio.noSearchResults")}</p>
        )}
        {pinned.length > 0 && (
          <div className={s.group}>
            <div className={s.groupHeading}>
              <Icon icon="hugeicons:pin" className={s.groupHeadingIcon} />
              {t("studio.groupPinned")}
            </div>
            {pinned.map(renderSession)}
          </div>
        )}
        {BUCKET_ORDER.map((bucket) => {
          const items = grouped[bucket]
          if (items.length === 0) return null
          return (
            <div key={bucket} className={s.group}>
              <div className={s.groupHeading}>{t(BUCKET_I18N[bucket])}</div>
              {items.map(renderSession)}
            </div>
          )
        })}
      </div>

      {/* Footer: mode toggle + quota */}
      <div className={s.footer}>
        <button
          type="button"
          className={s.modeToggle}
          onClick={handleToggleProgressMode}
          title={progressMode === "expert" ? t("studio.expertModeDesc") : t("studio.simpleModeDesc")}
        >
          <span className={clsx(s.switch, progressMode === "expert" && s.switchActive)}>
            <span className={clsx(s.switchThumb, progressMode === "expert" && s.switchThumbActive)} />
          </span>
          <span className={s.modeLabels}>
            <span className={s.modeName}>
              {progressMode === "expert" ? t("studio.expertMode") : t("studio.simpleMode")}
            </span>
            <span className={s.modeDesc}>
              {progressMode === "expert" ? t("studio.expertModeDesc") : t("studio.simpleModeDesc")}
            </span>
          </span>
        </button>

        {quota && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
