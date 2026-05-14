"use client"

import type { Session } from "next-auth"
import type { ReactNode } from "react"

import { Color4Bg } from "@/components/color4bg"
import { useReveal } from "@/hooks/useReveal"
import { BillingSummaryProvider } from "@/lib/use-billing-summary"
import NextTopLoader from "nextjs-toploader"
import { DiscordFAB } from "../discord-fab"
import { EmailBanner } from "../email-banner"
import { Footer } from "../footer"
import { GSAP } from "../gsap"
import { Header } from "../header"
import { RealViewport } from "../real-viewport"
import { SyncAppPageFromRoute } from "../sync-app-page-from-route"
import { Toast } from "../toast"
import { TrialBanner } from "../trial-banner"
import { Defs } from "./defs"
import s from "./wrapper.module.scss"

interface WrapperProps {
  children: ReactNode
  session?: Session | null
  color4bg?: boolean
}

export const Wrapper = ({ children, session = null, color4bg = true }: WrapperProps) => {
  useReveal()

  // Conversion UIs (header pill, trial countdown banner) only fire once
  // the user's email is verified — otherwise we'd be pushing pricing
  // CTAs to accounts we can't yet contact, which both clutters the
  // post-signup experience and double-stacks with the EmailBanner.
  const emailVerified = !!session?.user?.emailVerified

  // Billing summary now flows through BillingSummaryProvider — the
  // dashboard/home/suites/admin/auth layouts no longer block SSR on a
  // Neon round-trip for the credit badge. Skip the fetch entirely for
  // anon visitors / users mid-setup with no orgId so /api/billing/
  // summary doesn't return 401 on every public page load.
  const orgId = (session?.user as { orgId?: string } | undefined)?.orgId
  const billingEnabled = !!orgId

  return (
    <BillingSummaryProvider enabled={billingEnabled}>
      <SyncAppPageFromRoute />
      <GSAP scrollTrigger />
      {/* <Lenis root options={{}} /> */}
      <EmailBanner initialSession={session} />
      {emailVerified ? <TrialBanner /> : null}
      <Header initialSession={session} />
      <main className={s.main}>{children}</main>
      {color4bg ? <Color4Bg style="blur-gradient" className={s.color4bg} /> : null}
      <Footer />
      <Toast />
      <DiscordFAB />
      <RealViewport />
      <Defs />
      <NextTopLoader height={2} showSpinner={false} zIndex={9999999} />
    </BillingSummaryProvider>
  )
}
