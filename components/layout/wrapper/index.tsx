"use client"

import type { ReactNode } from "react"

import { useReveal } from "@/hooks/useReveal"
import { GSAP } from "../gsap"
import { Header } from "../header"
import { Lenis } from "../lenis"
import { RealViewport } from "../real-viewport"
import { Toast } from "../toast"
import { Defs } from "./defs"
import s from "./wrapper.module.scss"

interface WrapperProps {
  children: ReactNode
}

export const Wrapper = ({ children }: WrapperProps) => {
  useReveal()

  return (
    <>
      <GSAP scrollTrigger />
      <Lenis root options={{}} />
      <Header />
      <main className={s.main}>{children}</main>
      <Toast />
      <RealViewport />
      <Defs />
    </>
  )
}
