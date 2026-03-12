"use client"

import { useEffect, useRef } from "react"

const setViewportCssVars = () => {
  const el = document.documentElement
  el.style.setProperty("--vw", `${window.innerWidth * 0.01}px`)
  el.style.setProperty("--dvh", `${window.innerHeight * 0.01}px`)
  el.style.setProperty("--svh", `${el.clientHeight * 0.01}px`)
  el.style.setProperty("--lvh", "1vh")
}

export const RealViewport = () => {
  const resizeTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const el = document.documentElement

    const handleResize = () => {
      if (!el.classList.contains("is-resizing")) {
        el.classList.add("is-resizing")
      }

      setViewportCssVars()

      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current)
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        el.classList.remove("is-resizing")
      }, 200)
    }

    setViewportCssVars()
    window.addEventListener("resize", handleResize, { passive: true })

    return () => {
      window.removeEventListener("resize", handleResize)
      if (resizeTimeoutRef.current !== null) {
        window.clearTimeout(resizeTimeoutRef.current)
      }
      el.classList.remove("is-resizing")
    }
  }, [])

  return null
}
