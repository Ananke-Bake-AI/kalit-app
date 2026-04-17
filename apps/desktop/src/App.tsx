import { useCallback, useEffect, useState } from "react"
import { I18nProvider, loadMessages, type Locale, type Messages } from "@kalit/i18n"
import {
  ChatInput,
  ChatLayout,
  SessionSidebar,
  StudioFocusProvider,
  StudioHostProvider,
  StudioThemeProvider,
  WelcomeScreen,
  useStudioStore,
} from "@kalit/studio-ui"

import styles from "./App.module.scss"

const DEFAULT_LOCALE: Locale = "en"

const HOST_VALUE = {
  user: {
    id: "desktop-dev",
    email: "desktop@kalit.ai",
    name: "Desktop User",
    isAdmin: false,
  },
  navigate: (_path: string) => {
    /* no-op until we wire a router */
  },
  getSearchParam: (_key: string) => null,
}

function StudioDesktop() {
  const setActiveSessionId = useStudioStore((s) => s.setActiveSessionId)

  const handleSessionSelect = useCallback(
    (id: string) => setActiveSessionId(id),
    [setActiveSessionId],
  )
  const handleNewChat = useCallback(() => {
    setActiveSessionId(null)
  }, [setActiveSessionId])

  const handlePromptSelect = useCallback((prompt: string) => {
    // Placeholder — real streaming orchestration lives in the landing app's
    // StudioClient. Desktop will grow its own version (or we lift it into the
    // shared package) in a follow-up.
    console.log("[desktop] prompt selected:", prompt)
  }, [])

  const handleSend = useCallback((message: string) => {
    console.log("[desktop] send:", message)
  }, [])

  return (
    <div className={styles.root}>
      <ChatLayout sidebar={<SessionSidebar onSessionSelect={handleSessionSelect} onNewChat={handleNewChat} />}>
        <div className={styles.main}>
          <WelcomeScreen onPromptSelect={handlePromptSelect} />
          <div className={styles.inputDock}>
            <ChatInput onSend={handleSend} />
          </div>
        </div>
      </ChatLayout>
    </div>
  )
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
      <StudioHostProvider value={HOST_VALUE}>
        <StudioThemeProvider initial={false} storageKey="studio-theme-dark">
          <StudioFocusProvider initial={false} storageKey="studio-focus-mode">
            <StudioDesktop />
          </StudioFocusProvider>
        </StudioThemeProvider>
      </StudioHostProvider>
    </I18nProvider>
  )
}
