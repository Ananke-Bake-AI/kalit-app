"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { magnetEvent } from "@/lib/magnet/events"
import {
  useActiveIsStreaming,
  useActiveMessages,
  useActiveMessagesLoading,
  useStudioChat,
  useStudioStore,
} from "@kalit/studio-ui"
import { useI18n } from "@/stores/i18n"
import { useAppStore } from "@/stores/app"
import { Icon } from "@/components/icon"
import { ChatLayout } from "@/components/studio/chat-layout"
import { SessionSidebar } from "@/components/studio/session-sidebar"
import { ChatInput } from "@/components/studio/chat-input"
import { WelcomeScreen } from "@/components/studio/welcome-screen"
import { MessageList } from "@/components/studio/message-list"
import { FileExplorer } from "@/components/studio/file-explorer"
import { FilePreviewModal } from "@/components/studio/file-preview-modal"
import { BugReportModal } from "@/components/studio/bug-report-modal"
import { RoutingDebugPanel } from "@/components/studio/routing-debug"
import { DebugConsole } from "@/components/studio/debug-console"
import { ModelSelector } from "@/components/studio/model-selector"
import { SessionUsageBadge } from "@/components/studio/session-usage-badge"
import { useStudioFocus } from "@/app/[locale]/(studio)/studio-focus-context"
import { useTheme } from "@/components/app/theme-context"
import type { SuiteId } from "@/lib/suites"
import s from "./studio.module.scss"

export function StudioClient() {
  const searchParams = useSearchParams()
  const { locale, t } = useI18n()
  const setPage = useAppStore((st) => st.setPage)
  const { focusMode, toggleFocus } = useStudioFocus()
  const { darkMode, toggleTheme } = useTheme()

  const { update: updateAuthSession } = useSession()
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    setSidebarOpen,
    previewFile,
    setPreviewFile,
    rightPanelOpen,
    setRightPanelOpen,
  } = useStudioStore()
  // Active-session selectors. Use the bound hooks from studio-ui so
  // the empty fallback is a stable sentinel — an inline `?? []` here
  // would allocate a fresh array on every render, Zustand would see
  // a new reference each time and re-render forever (caught by the
  // page error boundary as "Something went wrong").
  const messages = useActiveMessages()
  const isStreaming = useActiveIsStreaming()
  const messagesLoading = useActiveMessagesLoading()

  // Bug report modal state. Lives in the studio client because the
  // modal needs to read the active session + recent messages from the
  // store and submit via a server action.
  const [bugReportOpen, setBugReportOpen] = useState(false)

  const handleSuiteChange = useCallback(
    (suite: SuiteId | "default") => setPage(suite),
    [setPage],
  )

  const handleSessionActivated = useCallback(
    (sessionId: string, opts: { clearPrompt?: boolean; clearSuite?: boolean }) => {
      const url = new URL(window.location.href)
      if (sessionId) {
        url.searchParams.set("session", sessionId)
      } else {
        url.searchParams.delete("session")
      }
      if (opts.clearPrompt) url.searchParams.delete("prompt")
      if (opts.clearSuite) url.searchParams.delete("suite")
      window.history.replaceState(null, "", url.toString())
    },
    [],
  )

  const getInitialParam = useCallback(
    (key: "session" | "prompt" | "suite" | "researchId") => searchParams.get(key),
    [searchParams],
  )

  const {
    ready,
    connectionError,
    chatPrefill,
    setChatPrefill,
    notifyMode,
    handleSend,
    handleStop,
    handleSessionSelect,
    handleNewChat,
    handleWelcomePrompt,
    handleCycleNotify,
    ensureSession,
    fetchMessages,
  } = useStudioChat({
    locale,
    t,
    onSuiteChange: handleSuiteChange,
    onSessionActivated: handleSessionActivated,
    getInitialParam,
    enableResearchAutoSend: true,
    enableAdminConsole: true,
  })

  // ── Magnet claim → pre-seeded build handoff ────────────
  //
  // Arriving at /studio?magnet=<id> means a lead-magnet visitor just signed
  // up to watch Kalit rebuild their page. We: (1) reopen if the build already
  // started, else (2) claim it server-side (provisions a default org + trial
  // so the build can run without the /setup wall), refresh the auth session so
  // the new orgId lands in the JWT, create a studio session, record it, and
  // auto-send the rebuild prompt. The build then streams like any other.
  const magnetFiredRef = useRef(false)
  const magnetSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || magnetFiredRef.current) return
    const magnetId = searchParams.get("magnet")
    if (!magnetId) return
    magnetFiredRef.current = true
    ;(async () => {
      try {
        // Reopen an existing build (e.g. on refresh) instead of rebuilding.
        const stateRes = await fetch(`/api/magnet/${magnetId}`)
        if (stateRes.ok) {
          const st = await stateRes.json()
          if (st?.studioSessionId) {
            magnetSessionRef.current = st.studioSessionId
            setActiveSessionId(st.studioSessionId)
            return
          }
        }

        const res = await fetch(`/api/magnet/${magnetId}/claim`, { method: "POST" })
        if (!res.ok) return
        const data = await res.json()
        magnetEvent("claim_started", { magnetId })

        // New org just provisioned → refresh the JWT so the broker token
        // carries orgId before we create the session.
        if (data.provisioned) {
          try { await updateAuthSession() } catch { /* non-fatal */ }
        }

        const sid = await ensureSession()
        if (!sid) return
        magnetSessionRef.current = sid
        await fetch(`/api/magnet/${magnetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studioSessionId: sid }),
        }).catch(() => {})

        if (data.prompt) {
          magnetEvent("build_started", { magnetId })
          await handleSend(data.prompt)
        }
      } catch {
        /* silent — magnet handoff is best-effort */
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, searchParams])

  // Fire build_completed (activation north-star) once, when the magnet build
  // session finishes its first stream.
  const buildCompletedRef = useRef(false)
  const wasStreamingRef = useRef(false)
  useEffect(() => {
    const sid = magnetSessionRef.current
    if (!sid || buildCompletedRef.current) return
    if (activeSessionId !== sid) return
    if (isStreaming) {
      wasStreamingRef.current = true
    } else if (wasStreamingRef.current) {
      buildCompletedRef.current = true
      magnetEvent("build_completed", { magnetId: searchParams.get("magnet") })
    }
  }, [isStreaming, activeSessionId, searchParams])

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen(!useStudioStore.getState().sidebarOpen)
  }, [setSidebarOpen])

  const handleRightPanelToggle = useCallback(() => {
    setRightPanelOpen(!rightPanelOpen)
  }, [rightPanelOpen, setRightPanelOpen])

  const [previewImages, setPreviewImages] = useState<{ url: string; name: string }[]>([])
  const handlePreviewFile = useCallback(
    (file: { url: string; name: string }, images?: { url: string; name: string }[]) => {
      setPreviewFile(file)
      setPreviewImages(images || [])
    },
    [setPreviewFile],
  )

  // Suite URL param → local routing. The hook reads the initial value; we
  // keep listening on subsequent param changes here so back/forward works.
  useEffect(() => {
    const suite = searchParams.get("suite") as SuiteId | null
    if (suite) setPage(suite)
  }, [searchParams, setPage])

  if (connectionError) {
    return (
      <div className={s.shell}>
        <div className={s.center}>
          <h2>{t("studio.studio")}</h2>
          <p className={s.error}>{connectionError}</p>
          <p className={s.hint}>{t("studio.brokerHint")}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={s.shell}>
        <div className={s.center}>
          <div className={s.loader} />
          <p>{t("studio.loadingStudio")}</p>
        </div>
      </div>
    )
  }

  // showWelcome must NOT trigger while messagesLoading is true — otherwise
  // every session switch flashes the welcome screen during the
  // clearMessages → fetchMessages roundtrip (messages briefly = [], so
  // showWelcome=true, so we render the welcome between two real chats).
  // Loader has priority over welcome whenever we're mid-load.
  const showWelcome = !activeSessionId || (!messagesLoading && messages.length === 0 && !isStreaming)

  return (
    <ChatLayout
      sidebar={<SessionSidebar onSessionSelect={handleSessionSelect} onNewChat={handleNewChat} />}
      rightPanel={
        activeSessionId ? (
          <FileExplorer sessionId={activeSessionId} onPreviewFile={handlePreviewFile} />
        ) : undefined
      }
    >
      <div className={s.topBar}>
        <div className={s.topLeft}>
          <button className={s.menuBtn} onClick={handleMenuToggle} title={t("studio.newChat")}>
            <span /><span /><span />
          </button>
          <span className={s.brand}>{t("studio.title")}</span>
        </div>
        {activeSessionId && (
          <span className={s.topTitle}>
            {sessions.find((sess) => sess.id === activeSessionId)?.title || t("studio.newConversation")}
          </span>
        )}
        <div className={s.topRight}>
          <SessionUsageBadge sessionId={activeSessionId} />
          <ModelSelector />
          <button
            className={s.panelToggle}
            onClick={handleCycleNotify}
            title={
              notifyMode === "off"
                ? t("studio.notifyOff")
                : notifyMode === "title"
                  ? t("studio.notifyTitle")
                  : t("studio.notifyTitleSound")
            }
            aria-label={t("studio.notifyToggle")}
          >
            <Icon
              icon={
                notifyMode === "off"
                  ? "hugeicons:notification-off-02"
                  : notifyMode === "title"
                    ? "hugeicons:notification-02"
                    : "hugeicons:volume-high-01"
              }
            />
          </button>
          <button
            className={s.panelToggle}
            onClick={toggleTheme}
            title={darkMode ? t("studio.lightMode") : t("studio.darkMode")}
          >
            <Icon icon={darkMode ? "hugeicons:sun-03" : "hugeicons:moon-02"} />
          </button>
          <button
            className={s.panelToggle}
            onClick={toggleFocus}
            title={focusMode ? t("studio.exitFocus") : t("studio.focusMode")}
          >
            <Icon icon={focusMode ? "hugeicons:minimize-02" : "hugeicons:maximize-02"} />
          </button>
          <button
            className={s.panelToggle}
            onClick={() => setBugReportOpen(true)}
            title={t("studio.bugReportTitle")}
            aria-label={t("studio.bugReportTitle")}
          >
            <Icon icon="hugeicons:bug-01" />
          </button>
          {activeSessionId && (
            <button
              className={s.panelToggle}
              onClick={handleRightPanelToggle}
              title={rightPanelOpen ? t("studio.hideFiles") : t("studio.showFiles")}
            >
              <Icon icon={rightPanelOpen ? "hugeicons:sidebar-right" : "hugeicons:source-code"} />
            </button>
          )}
        </div>
      </div>

      <div className={s.content}>
        {showWelcome ? (
          <WelcomeScreen
            onPromptSelect={handleWelcomePrompt}
            activeSuite={searchParams.get("suite") as SuiteId | null}
            onEnsureSession={ensureSession}
          />
        ) : (
          <div className={s.messageArea}>
            {messagesLoading ? (
              <div className={s.center}>
                <div className={s.loader} />
              </div>
            ) : (
              <MessageList
                onStop={handleStop}
                onPreviewFile={handlePreviewFile}
                onRefreshMessages={() => activeSessionId && fetchMessages(activeSessionId)}
                onChoiceSubmit={(text) => handleSend(text)}
                onChoiceFreeform={(question) => {
                  // Prefill an attributable answer (`<question>: `) so a custom
                  // reply stays tied to the question it answers — several QCMs
                  // can be stacked in one bubble. ChatInput fills, focuses and
                  // lands the cursor at the end when prefill changes.
                  if (question) {
                    setChatPrefill({ text: `${question}: `, nonce: Date.now() })
                    return
                  }
                  // Fallback (no question — legacy single QCM): just focus.
                  const textarea = document.querySelector<HTMLTextAreaElement>(
                    "textarea[aria-label], textarea[placeholder]",
                  )
                  textarea?.focus()
                }}
              />
            )}
          </div>
        )}
      </div>

      <ChatInput onSend={handleSend} prefill={chatPrefill} onEnsureSession={ensureSession} />

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          name={previewFile.name}
          items={previewImages}
          onClose={() => { setPreviewFile(null); setPreviewImages([]) }}
        />
      )}

      <BugReportModal
        open={bugReportOpen}
        onClose={() => setBugReportOpen(false)}
      />

      <RoutingDebugPanel />
      <DebugConsole />
    </ChatLayout>
  )
}
