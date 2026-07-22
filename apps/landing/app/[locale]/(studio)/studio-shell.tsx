"use client"

import type { Session } from "next-auth"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import NextTopLoader from "nextjs-toploader"
import { StudioHostProvider } from "@kalit/studio-ui"
import { Header } from "@/components/layout/header"
import { RealViewport } from "@/components/layout/real-viewport"
import { SyncAppPageFromRoute } from "@/components/layout/sync-app-page-from-route"
import { EmailBanner } from "@/components/layout/email-banner"
import { TrialBanner } from "@/components/layout/trial-banner"
import { DiscordFAB } from "@/components/layout/discord-fab"
import { BillingSummaryProvider } from "@/lib/use-billing-summary"
import "@/lib/broker-direct"
import { StudioFocusProvider, useStudioFocus } from "./studio-focus-context"
import s from "./studio-shell.module.scss"

interface StudioShellProps {
  children: ReactNode
  session?: Session | null
}

const FOCUS_STORAGE_KEY = "studio-focus-mode"

function StudioShellInner({ children, session }: { children: ReactNode; session: Session | null }) {
  const { focusMode } = useStudioFocus()
  const pathname = usePathname() || ""

  const isProjectRoute = /\/studio\/project\//.test(pathname)
  const hideSiteChrome = focusMode || isProjectRoute

  // Same gate as Wrapper — keep the upgrade pill / trial banner off
  // until the user verifies their email. Middleware already blocks
  // /studio entirely for unverified users so this is mostly defense
  // in depth, but cheap.
  const emailVerified = !!session?.user?.emailVerified

  return (
    <div className={s.root} data-focus={hideSiteChrome || undefined}>
      <SyncAppPageFromRoute />
      {/* Studio is a single locked viewport with no footer — long chats
          scroll inside the message list, not the page. A focus-mode toggle
          lets the user hide the global Kalit header for a true full-screen
          studio experience. Project routes are always chrome-free because
          the editor renders its own fullscreen shell. */}
      {!hideSiteChrome && (
        <div className={s.chrome}>
          <Header initialSession={session} />
          <EmailBanner initialSession={session} />
          {emailVerified ? <TrialBanner /> : null}
        </div>
      )}
      <main className={s.main}>{children}</main>
      {/* Discord CTA stays mounted even in focus mode — it sits in the
          bottom-right and respects user-dismiss, so it never crowds the
          chat surface. */}
      <DiscordFAB />
      <RealViewport />
      <NextTopLoader height={2} showSpinner={false} zIndex={9999999} />
    </div>
  )
}

export const StudioShell = ({ children, session = null }: StudioShellProps) => {
  // The studio ALWAYS opens fullscreen (app-like, no marketing chrome,
  // Kimi-style). No localStorage read here on purpose: honoring a persisted
  // opt-out made stale values yank the site header back right after the
  // fullscreen first paint. The in-studio toggle still works, it just only
  // lasts for the current visit.
  const initialFocus = true
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Wrap the entire studio in BillingSummaryProvider so the Header
  // credit badge + TrialBanner can pull the summary via hook instead
  // of receiving it as a SSR-resolved prop. Skipping the fetch when
  // there's no orgId (mid-setup users) keeps `/api/billing/summary`
  // from returning 401 on every nav.
  const billingEnabled = !!(session?.user as { orgId?: string } | undefined)?.orgId

  return (
    <StudioHostProvider value={hostValue}>
      <BillingSummaryProvider enabled={billingEnabled}>
        <StudioFocusProvider initial={initialFocus} storageKey={FOCUS_STORAGE_KEY}>
          <StudioShellInner session={session}>{children}</StudioShellInner>
        </StudioFocusProvider>
      </BillingSummaryProvider>
    </StudioHostProvider>
  )
}
