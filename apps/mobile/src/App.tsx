import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import { I18nProvider, loadMessages, type Locale, type Messages } from "@kalit/i18n"
import {
  ChatInput,
  ChatLayout,
  FileExplorer,
  FilePreviewModal,
  MessageList,
  SessionSidebar,
  StudioFocusProvider,
  StudioHostProvider,
  StudioThemeProvider,
  WelcomeScreen,
  useStudioChat,
  useStudioStore,
  useStudioTheme,
} from "@kalit/studio-ui"

import styles from "./App.module.scss"
import { AuthProvider, useAuth } from "./auth/auth-context"
import { SignInScreen } from "./auth/sign-in-screen"

const DEFAULT_LOCALE: Locale = "en"
const THEME_STORAGE_KEY = "studio-theme-dark"

function readInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function ThemeSync() {
  const { darkMode } = useStudioTheme()
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
  }, [darkMode])
  return null
}

function MobileMenu({ onSignOut }: { onSignOut: () => void }) {
  const { darkMode, toggleTheme } = useStudioTheme()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  return (
    <div className={styles.menuWrap} ref={menuRef}>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
      >
        <Icon icon="hugeicons:menu-01" />
      </button>
      {open && (
        <div className={styles.menuSheet}>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => { toggleTheme(); setOpen(false) }}
          >
            <Icon icon={darkMode ? "hugeicons:sun-03" : "hugeicons:moon-02"} />
            <span>{darkMode ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => { setOpen(false); onSignOut() }}
          >
            <Icon icon="hugeicons:logout-03" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  )
}

function RightDrawer({
  sessionId,
  onPreviewFile,
}: {
  sessionId: string | null
  onPreviewFile: (file: { url: string; name: string }, images?: { url: string; name: string }[]) => void
}) {
  return (
    <div className={styles.sidebarWrap}>
      <FileExplorer sessionId={sessionId} onPreviewFile={onPreviewFile} />
    </div>
  )
}

// Minimal translator for the subset of keys the chat hook reads at runtime.
const mobileT = (key: string): string => {
  const table: Record<string, string> = {
    "studio.brokerError": "Broker unavailable (status {status})",
    "studio.connectionError": "Couldn't reach the Kalit broker.",
    "studio.streamError": "Stream interrupted.",
  }
  return table[key] ?? key
}

function StudioMobile() {
  const { user, signOut } = useAuth()

  const {
    activeSessionId,
    messages,
    messagesLoading,
    isStreaming,
    sidebarOpen,
    rightPanelOpen,
    previewFile,
    setSidebarOpen,
    setRightPanelOpen,
    setPreviewFile,
  } = useStudioStore()

  const [previewImages, setPreviewImages] = useState<{ url: string; name: string }[]>([])
  const handlePreviewFile = useCallback(
    (file: { url: string; name: string }, images?: { url: string; name: string }[]) => {
      setPreviewFile(file)
      setPreviewImages(images || [])
    },
    [setPreviewFile],
  )

  // Right panel is an overlay drawer on mobile — start closed, open via
  // right-edge swipe or the files button in the top bar.
  useEffect(() => {
    setRightPanelOpen(false)
  }, [setRightPanelOpen])

  // Edge-swipe gesture: drag from the right edge toward the left to open the
  // right drawer (sessions + settings). Mirrors iOS' system behavior so users
  // don't have to reach for the top-right kebab.
  useEffect(() => {
    let startX = 0
    let startY = 0
    let tracking = false
    const EDGE = 24 // px from right edge where swipe is eligible
    const THRESHOLD = 40 // px leftward delta to commit

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      const fromRightEdge = window.innerWidth - t.clientX <= EDGE
      if (!fromRightEdge) return
      startX = t.clientX
      startY = t.clientY
      tracking = true
    }
    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      const t = e.touches[0]
      if (!t) return
      const dx = startX - t.clientX
      const dy = Math.abs(t.clientY - startY)
      if (dx > THRESHOLD && dy < dx) {
        tracking = false
        setRightPanelOpen(true)
      }
    }
    const onEnd = () => { tracking = false }
    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onEnd)
    window.addEventListener("touchcancel", onEnd)
    return () => {
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
  }, [setRightPanelOpen])

  const {
    ready,
    connectionError,
    chatPrefill,
    handleSend,
    handleStop,
    handleSessionSelect: baseSessionSelect,
    handleNewChat: baseNewChat,
    handleWelcomePrompt,
    ensureSession,
    fetchMessages,
  } = useStudioChat({
    locale: DEFAULT_LOCALE,
    t: mobileT,
  })

  // Close both drawers on session/new-chat taps (mobile UX — the gesture can
  // come from either the left hamburger or the right-edge swipe).
  const handleSessionSelect = useCallback(
    (id: string) => {
      baseSessionSelect(id)
      setSidebarOpen(false)
      setRightPanelOpen(false)
    },
    [baseSessionSelect, setSidebarOpen, setRightPanelOpen],
  )
  const handleNewChat = useCallback(async () => {
    await baseNewChat()
    setSidebarOpen(false)
    setRightPanelOpen(false)
  }, [baseNewChat, setSidebarOpen, setRightPanelOpen])

  const hostValue = useMemo(
    () => ({
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            isAdmin: user.isAdmin === true,
          }
        : null,
      navigate: (_path: string) => {},
      getSearchParam: (_key: string) => null,
    }),
    [user],
  )

  const showWelcome = !activeSessionId || (messages.length === 0 && !isStreaming)

  return (
    <StudioHostProvider value={hostValue}>
      <ChatLayout
        sidebar={
          <div className={styles.sidebarWrap}>
            <SessionSidebar
              onSessionSelect={handleSessionSelect}
              onNewChat={handleNewChat}
            />
          </div>
        }
        rightPanel={
          activeSessionId ? (
            <RightDrawer sessionId={activeSessionId} onPreviewFile={handlePreviewFile} />
          ) : undefined
        }
      >
        <div className={styles.main}>
          <header className={styles.topBar}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Sessions"
            >
              <Icon icon="hugeicons:menu-02" />
            </button>
            <div className={styles.brand}>
              <img src="/logo.png" alt="Kalit" className={styles.brandLogo} />
              <span className={styles.brandName}>Kalit Studio</span>
            </div>
            {activeSessionId && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                aria-label="Files"
              >
                <Icon icon={rightPanelOpen ? "hugeicons:sidebar-right" : "hugeicons:source-code"} />
              </button>
            )}
            <MobileMenu onSignOut={signOut} />
          </header>

          {connectionError ? (
            <div className={styles.boot}>{connectionError}</div>
          ) : !ready ? (
            <div className={styles.boot}>Loading Kalit Studio…</div>
          ) : showWelcome ? (
            <WelcomeScreen onPromptSelect={handleWelcomePrompt} />
          ) : (
            <div className={styles.messageArea}>
              {messagesLoading ? (
                <div className={styles.boot}>Loading messages…</div>
              ) : (
                <MessageList
                  onStop={handleStop}
                  onRefreshMessages={() =>
                    activeSessionId && fetchMessages(activeSessionId)
                  }
                />
              )}
            </div>
          )}

          <div className={styles.inputDock}>
            <ChatInput
              onSend={handleSend}
              prefill={chatPrefill}
              onEnsureSession={ensureSession}
            />
          </div>
        </div>
      </ChatLayout>

      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          name={previewFile.name}
          items={previewImages}
          onClose={() => { setPreviewFile(null); setPreviewImages([]) }}
        />
      )}
    </StudioHostProvider>
  )
}

function AuthGate() {
  const { status } = useAuth()
  if (status === "loading") {
    return <div className={styles.boot}>Loading Kalit Studio…</div>
  }
  if (status === "signed-out") {
    return <SignInScreen />
  }
  return <StudioMobile />
}

export function App() {
  const [messages, setMessages] = useState<Messages | null>(null)

  useEffect(() => {
    loadMessages(DEFAULT_LOCALE).then(setMessages)
  }, [])

  if (!messages) {
    return <div className={styles.boot}>Loading Kalit Studio…</div>
  }

  return (
    <I18nProvider initialLocale={DEFAULT_LOCALE} initialMessages={messages}>
      <StudioThemeProvider initial={readInitialDarkMode()} storageKey={THEME_STORAGE_KEY}>
        <ThemeSync />
        <StudioFocusProvider initial={false} storageKey="studio-focus-mode">
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </StudioFocusProvider>
      </StudioThemeProvider>
    </I18nProvider>
  )
}
