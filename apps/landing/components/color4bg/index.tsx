"use client"

import clsx from "clsx"
import {
  AestheticFluidBg,
  BlurGradientBg
} from "color4bg"
import { useEffect, useMemo, useRef } from "react"
import s from "./color4bg.module.scss"

const DEFAULT_BG_COLORS: string[] = ["#91E500", "#8200DF", "#12BCFF", "#91E500", "#2F44FF", "#8200DF", "#91E500"]

// Client-only counter for container DOM ids (see the note in the effect).
let nextInstanceId = 1

const BgClassByStyle = {
  "aesthetic-fluid": AestheticFluidBg,
  "blur-gradient": BlurGradientBg
} as const

export type Color4BgStyle = keyof typeof BgClassByStyle

interface Color4BgInstance {
  destroy: () => void
  resize?: () => void
  update?: (option: string, val: number | string) => void
}

interface Color4BgProps {
  style: Color4BgStyle
  colors?: string[]
  seed?: number
  loop?: boolean
  className?: string
  noise?: number
}

export const Color4Bg = ({ style, colors, seed = 1000, loop = true, className, noise = 0 }: Color4BgProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const paletteKey = useMemo(() => JSON.stringify(colors ?? null), [colors])

  useEffect(() => {
    const el = containerRef.current
    const BgClass = BgClassByStyle[style]
    if (!el || !BgClass) return

    // The lib looks the container up by DOM id. Assign it here, client-only:
    // rendering a useId-based id into the SSR html desynced during hydration
    // on some pages and killed every instance with a getComputedStyle crash.
    if (!el.id) el.id = `color4bg-${nextInstanceId++}`
    const containerId = el.id

    let instance: Color4BgInstance | null = null
    let resizeObserver: ResizeObserver | null = null
    let cancelled = false
    const resolvedColors = colors?.length ? colors : DEFAULT_BG_COLORS

    // This background is purely decorative WebGL. Defer its (expensive)
    // instantiation until the browser is idle so it stays off the critical
    // loading path — it was adding main-thread work (and a getComputedStyle
    // crash) during the LCP/TBT window.
    const init = () => {
      if (cancelled) return
      const node = containerRef.current
      if (!node) return

      try {
        instance = new (BgClass as new (params: {
          dom: string
          colors: string[]
          seed: number
          loop: boolean
        }) => Color4BgInstance)({
          dom: containerId,
          colors: resolvedColors,
          seed,
          loop
        })
      } catch (err) {
        console.error("Color4Bg: failed to create instance", style, err)
        return
      }

      if (instance.update) {
        instance.update("noise", noise)
      }

      if (typeof ResizeObserver === "undefined") return

      const runResize = () => {
        if (cancelled || !instance?.resize) return
        instance.resize()
      }
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(runResize)
      })
      resizeObserver.observe(node)
      requestAnimationFrame(runResize)
    }

    const ric: (cb: () => void) => number =
      typeof window.requestIdleCallback === "function"
        ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
        : (cb) => window.setTimeout(cb, 200)
    const cic: (id: number) => void =
      typeof window.cancelIdleCallback === "function"
        ? (id) => window.cancelIdleCallback(id)
        : (id) => window.clearTimeout(id)
    const idleId = ric(init)

    return () => {
      cancelled = true
      cic(idleId)
      resizeObserver?.disconnect()
      resizeObserver = null
      if (instance && typeof instance.destroy === "function") {
        try {
          instance.destroy()
        } catch (e) {
          console.error("Color4Bg: cleanup error", e)
        }
      }
    }
  }, [style, colors, paletteKey, seed, loop, noise])

  return <div ref={containerRef} className={clsx(s.root, className)} />
}
