"use client"

import type { Session } from "next-auth"
import type { ReactNode } from "react"

import { useReveal } from "@/hooks/useReveal"
import { GSAP } from "../gsap"
import { Header } from "../header"
import { Lenis } from "../lenis"
import { RealViewport } from "../real-viewport"
import { Toast } from "../toast"
import { Defs } from "./defs"
import s from "./wrapper.module.scss"
import { Footer } from "../footer"

interface WrapperProps {
  children: ReactNode
  session?: Session | null
}

export const Wrapper = ({ children, session = null }: WrapperProps) => {
  useReveal()

  return (
    <>
      <GSAP scrollTrigger />
      <Lenis root options={{}} />
      <Header initialSession={session} />
      <main className={s.main}>{children}</main>
      <Footer />
      <Toast />
      <RealViewport />
      <Defs />
    </>
  )
}
