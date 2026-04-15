"use client"

import type { Session } from "next-auth"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import NextTopLoader from "nextjs-toploader"
import { Header } from "@/components/layout/header"
import { RealViewport } from "@/components/layout/real-viewport"
import { SyncAppPageFromRoute } from "@/components/layout/sync-app-page-from-route"
import { Toast } from "@/components/layout/toast"
import { EmailBanner } from "@/components/layout/email-banner"
import { StudioFocusProvider, useStudioFocus } from "./studio-focus-context"
import { StudioThemeProvider, useStudioTheme } from "./studio-theme-context"
import s from "./studio-shell.module.scss"

interface StudioShellProps {
  children: ReactNode
  session?: Session | null
}

const FOCUS_STORAGE_KEY = "studio-focus-mode"
const THEME_STORAGE_KEY = "studio-dark-mode"

function StudioShellInner({ children, session }: { children: ReactNode; session: Session | null }) {
  const { focusMode } = useStudioFocus()
  const { darkMode } = useStudioTheme()
  const pathname = usePathname() || ""

  const isProjectRoute = /\/studio\/project\//.test(pathname)
  const hideSiteChrome = focusMode || isProjectRoute

  return (
    <div className={`${s.root}${darkMode ? " studio-dark" : ""}`} data-focus={hideSiteChrome || undefined}>
      <SyncAppPageFromRoute />
      {/* Studio is a single locked viewport with no footer — long chats
          scroll inside the message list, not the page. A focus-mode toggle
          lets the user hide the global Kalit header for a true full-screen
          studio experience. Project routes are always chrome-free because
          the editor renders its own fullscreen shell. */}
      {!hideSiteChrome && (
        <>
          <Header initialSession={session} />
          <EmailBanner initialSession={session} />
        </>
      )}
      <main className={s.main}>{children}</main>
      <Toast />
      <RealViewport />
      <NextTopLoader height={2} showSpinner={false} zIndex={9999999} />
    </div>
  )
}

export const StudioShell = ({ children, session = null }: StudioShellProps) => {
  const [initialFocus, setInitialFocus] = useState<boolean>(false)
  const [initialDark, setInitialDark] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setInitialFocus(window.localStorage.getItem(FOCUS_STORAGE_KEY) === "1")
    setInitialDark(window.localStorage.getItem(THEME_STORAGE_KEY) === "1")
  }, [])

  return (
    <StudioFocusProvider initial={initialFocus} storageKey={FOCUS_STORAGE_KEY}>
      <StudioThemeProvider initial={initialDark} storageKey={THEME_STORAGE_KEY}>
        <StudioShellInner session={session}>{children}</StudioShellInner>
      </StudioThemeProvider>
    </StudioFocusProvider>
  )
}
