"use client"

import gsap from "gsap"
import ScrollTrigger from "gsap/ScrollTrigger"
import { useLenis } from "lenis/react"
import { useEffect, useLayoutEffect } from "react"
import { usePathname } from "next/navigation"

export function ScrollTriggerConfig() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    ScrollTrigger.clearScrollMemory("manual")
  }, [])

  const lenis = useLenis(ScrollTrigger.update)

  useEffect(() => ScrollTrigger.refresh(), [lenis])

  // Refresh ScrollTrigger on route changes
  useEffect(() => {
    // Small delay to let new page components mount and register their animations
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh()
    }, 100)
    return () => clearTimeout(timeout)
  }, [pathname])

  return null
}
