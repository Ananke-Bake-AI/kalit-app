"use client"

import type { Session } from "next-auth"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import NextTopLoader from "nextjs-toploader"
import { StudioHostProvider } from "@kalit/studio-ui"
import { Header } from "@/components/layout/header"
import { RealViewport } from "@/components/layout/real-viewport"
import { SyncAppPageFromRoute } from "@/components/layout/sync-app-page-from-route"
import { Toast } from "@/components/layout/toast"
import { EmailBanner } from "@/components/layout/email-banner"
import { TrialBanner } from "@/components/layout/trial-banner"
import { DiscordFAB } from "@/components/layout/discord-fab"
import type { BillingSummary } from "@/lib/billing-summary"
import "@/lib/broker-direct"
import { StudioFocusProvider, useStudioFocus } from "./studio-focus-context"
import s from "./studio-shell.module.scss"

interface StudioShellProps {
  children: ReactNode
  session?: Session | null
  billingSummary?: BillingSummary | null
}

const FOCUS_STORAGE_KEY = "studio-focus-mode"

function StudioShellInner({ children, session, billingSummary }: { children: ReactNode; session: Session | null; billingSummary: BillingSummary | null }) {
  const { focusMode } = useStudioFocus()
  const pathname = usePathname() || ""

  const isProjectRoute = /\/studio\/project\//.test(pathname)
  const hideSiteChrome = focusMode || isProjectRoute

  // Same gate as Wrapper — keep the upgrade pill / trial banner off
  // until the user verifies their email. Middleware already blocks
  // /studio entirely for unverified users so this is mostly defense
  // in depth, but cheap.
  const emailVerified = !!session?.user?.emailVerified
  const billingForHeader = emailVerified ? billingSummary : null

  return (
    <div className={s.root} data-focus={hideSiteChrome || undefined}>
      <SyncAppPageFromRoute />
      {/* Studio is a single locked viewport with no footer — long chats
          scroll inside the message list, not the page. A focus-mode toggle
          lets the user hide the global Kalit header for a true full-screen
          studio experience. Project routes are always chrome-free because
          the editor renders its own fullscreen shell. */}
      {!hideSiteChrome && (
        <>
          <Header initialSession={session} billingSummary={billingForHeader} />
          <EmailBanner initialSession={session} />
          {emailVerified ? <TrialBanner summary={billingSummary} /> : null}
        </>
      )}
      <main className={s.main}>{children}</main>
      <Toast />
      {/* Discord CTA stays mounted even in focus mode — it sits in the
          bottom-right and respects user-dismiss, so it never crowds the
          chat surface. */}
      <DiscordFAB />
      <RealViewport />
      <NextTopLoader height={2} showSpinner={false} zIndex={9999999} />
    </div>
  )
}

export const StudioShell = ({ children, session = null, billingSummary = null }: StudioShellProps) => {
  const [initialFocus, setInitialFocus] = useState<boolean>(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === "undefined") return
    setInitialFocus(window.localStorage.getItem(FOCUS_STORAGE_KEY) === "1")
  }, [])

  const hostValue = useMemo(
    () => ({
      user: session?.user
        ? {
            id: (session.user as { id?: string }).id,
            email: session.user.email ?? undefined,
            name: session.user.name ?? undefined,
            image: session.user.image ?? undefined,
            isAdmin: (session.user as { isAdmin?: boolean }).isAdmin === true,
          }
        : null,
      navigate: (path: string) => router.push(path),
      getSearchParam: (key: string) => searchParams?.get(key) ?? null,
    }),
    [session, router, searchParams]
  )

  return (
    <StudioHostProvider value={hostValue}>
      <StudioFocusProvider initial={initialFocus} storageKey={FOCUS_STORAGE_KEY}>
        <StudioShellInner session={session} billingSummary={billingSummary}>{children}</StudioShellInner>
      </StudioFocusProvider>
    </StudioHostProvider>
  )
}
