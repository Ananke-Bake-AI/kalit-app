import { useCallback, useEffect, useMemo, useState } from "react"
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
import { AuthProvider, useAuth } from "./auth/auth-context"
import { SignInScreen } from "./auth/sign-in-screen"

const DEFAULT_LOCALE: Locale = "en"

function StudioDesktop() {
  const { user, signOut } = useAuth()
  const setActiveSessionId = useStudioStore((s) => s.setActiveSessionId)

  const handleSessionSelect = useCallback(
    (id: string) => setActiveSessionId(id),
    [setActiveSessionId],
  )
  const handleNewChat = useCallback(() => {
    setActiveSessionId(null)
  }, [setActiveSessionId])

  const handlePromptSelect = useCallback((prompt: string) => {
    console.log("[desktop] prompt selected:", prompt)
  }, [])

  const handleSend = useCallback((message: string) => {
    console.log("[desktop] send:", message)
  }, [])

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

  return (
    <StudioHostProvider value={hostValue}>
      <StudioThemeProvider initial={false} storageKey="studio-theme-dark">
        <StudioFocusProvider initial={false} storageKey="studio-focus-mode">
          <div className={styles.root}>
            <ChatLayout
              sidebar={
                <div className={styles.sidebarWrap}>
                  <SessionSidebar
                    onSessionSelect={handleSessionSelect}
                    onNewChat={handleNewChat}
                  />
                  <button
                    type="button"
                    className={styles.signOut}
                    onClick={signOut}
                  >
                    Sign out
                  </button>
                </div>
              }
            >
              <div className={styles.main}>
                <WelcomeScreen onPromptSelect={handlePromptSelect} />
                <div className={styles.inputDock}>
                  <ChatInput onSend={handleSend} />
                </div>
              </div>
            </ChatLayout>
          </div>
        </StudioFocusProvider>
      </StudioThemeProvider>
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
  return <StudioDesktop />
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
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </I18nProvider>
  )
}
