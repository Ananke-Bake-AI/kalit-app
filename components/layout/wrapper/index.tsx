"use client"

import { GSAP } from "../gsap"
import { Header } from "../header"
import { Lenis } from "../lenis"
import { RealViewport } from "../real-viewport"
import { Toast } from "../toast"
import s from "./wrapper.module.scss"

interface WrapperProps {
  children: React.ReactNode
}

export const Wrapper = ({ children }: WrapperProps) => {
  return (
    <>
      <GSAP scrollTrigger />
      <Lenis root options={{}} />
      <Header />
      <main className={s.main}>{children}</main>
      <Toast />
      <RealViewport />
    </>
  )
}
