"use client"

import type { Session } from "next-auth"
import type { ReactNode } from "react"

import { Color4Bg } from "@/components/color4bg"
import { useReveal } from "@/hooks/useReveal"
import NextTopLoader from "nextjs-toploader"
import { Footer } from "../footer"
import { GSAP } from "../gsap"
import { Header } from "../header"
import { RealViewport } from "../real-viewport"
import { SyncAppPageFromRoute } from "../sync-app-page-from-route"
import { Toast } from "../toast"
import { Defs } from "./defs"
import s from "./wrapper.module.scss"

interface WrapperProps {
  children: ReactNode
  session?: Session | null
  color4bg?: boolean
}

export const Wrapper = ({ children, session = null, color4bg = true }: WrapperProps) => {
  useReveal()

  return (
    <>
      <SyncAppPageFromRoute />
      <GSAP scrollTrigger />
      {/* <Lenis root options={{}} /> */}
      <Header initialSession={session} />
      <main className={s.main}>{children}</main>
      {color4bg ? <Color4Bg style="blur-gradient" className={s.color4bg} /> : null}
      <Footer />
      <Toast />
      <RealViewport />
      <Defs />
      <NextTopLoader height={2} showSpinner={false} zIndex={9999999} />
    </>
  )
}
