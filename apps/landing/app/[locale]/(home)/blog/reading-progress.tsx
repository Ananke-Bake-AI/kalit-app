"use client"

import { useEffect, useState } from "react"
import s from "./blog.module.scss"

export function ReadingProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const scroll = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      const next = max > 0 ? Math.min(100, (scroll / max) * 100) : 0
      setPct(next)
      raf = 0
    }
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(tick)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    tick()
    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return <div className={s.progress} style={{ width: `${pct}%` }} aria-hidden />
}
