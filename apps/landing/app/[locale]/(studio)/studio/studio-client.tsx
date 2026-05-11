"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useStudioChat, useStudioStore } from "@kalit/studio-ui"
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

  const {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    messagesLoading,
    setSidebarOpen,
    previewFile,
    setPreviewFile,
    rightPanelOpen,
    setRightPanelOpen,
  } = useStudioStore()

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
