"use client"

import clsx from "clsx"
import { useEffect, useId, useRef } from "react"
import s from "./color4bg.module.scss"

const BASE_PATH = "/assets/js/color4bg.js-main/build/jsm"

const MODULES: Record<string, { path: string; exportName: string }> = {
  "aesthetic-fluid": {
    path: `${BASE_PATH}/AestheticFluidBg.module.js`,
    exportName: "AestheticFluidBg"
  },
  "blur-gradient": {
    path: `${BASE_PATH}/BlurGradientBg.module.js`,
    exportName: "BlurGradientBg"
  }
}

export type Color4BgStyle = keyof typeof MODULES

interface Color4BgProps {
  style: Color4BgStyle
  colors?: string[]
  seed?: number
  loop?: boolean
  className?: string
  noise?: number
}

export const Color4Bg = ({ style, colors = [], seed = 1000, loop = false, className, noise }: Color4BgProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const id = useId()
  const containerId = `color4bg-${id}`

  useEffect(() => {
    const el = containerRef.current
    const config = MODULES[style]
    if (!el || !config || el.id !== containerId) return

    let instance: { destroy: () => void; update?: (option: string, val: number | string) => void } | null = null

    import(/* webpackIgnore: true */ config.path)
      .then((mod) => {
        const BgClass = mod[config.exportName as keyof typeof mod]
        if (typeof BgClass !== "function") return
        instance = new (BgClass as new (params: { dom: string; colors: string[]; seed: number; loop: boolean }) => {
          destroy: () => void
          update?: (option: string, val: number | string) => void
        })({
          dom: containerId,
          colors,
          seed,
          loop
        })
        if (noise !== undefined && instance.update) {
          instance.update("noise", noise)
        }
      })
      .catch((err) => {
        console.error("Color4Bg: failed to load", style, err)
      })

    return () => {
      if (instance && typeof instance.destroy === "function") {
        try {
          instance.destroy()
        } catch (e) {
          console.error("Color4Bg: cleanup error", e)
        }
      }
    }
  }, [style, containerId, colors, seed, loop, noise])

  return <div id={containerId} ref={containerRef} className={clsx(s.root, className)} />
}
