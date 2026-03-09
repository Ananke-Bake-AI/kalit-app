"use client"

import { useEffect } from "react"

const setViewportCssVars = () => {
  const el = document.documentElement
  el.style.setProperty("--vw", `${window.innerWidth * 0.01}px`)
  el.style.setProperty("--dvh", `${window.innerHeight * 0.01}px`)
  el.style.setProperty("--svh", `${el.clientHeight * 0.01}px`)
  el.style.setProperty("--lvh", "1vh")
}

export const RealViewport = () => {
  useEffect(() => {
    setViewportCssVars()

    window.addEventListener("resize", setViewportCssVars, { passive: true })

    return () => {
      window.removeEventListener("resize", setViewportCssVars)
    }
  }, [])

  return null
}
