"use client"

import gsap from "gsap"
import ScrollTrigger from "gsap/ScrollTrigger"
import { useLenis } from "lenis/react"
import { useEffect, useLayoutEffect } from "react"

export function ScrollTriggerConfig() {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.clearScrollMemory("manual")
    // ScrollTrigger.defaults({
    //   markers: env.NEXT_PUBLIC_NODE_ENV === "development"
    // })
  }, [])

  const lenis = useLenis(ScrollTrigger.update)

  useEffect(() => ScrollTrigger.refresh(), [lenis])

  return null
}
