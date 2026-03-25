"use client"

import type { CSSProperties, ReactNode } from "react"

import { resolveAppGradientPrimary, resolveAppGradientPrimaryRadial } from "@/lib/suites"
import { useAppStore } from "@/stores/app"

export function AppThemeScope({ children }: { children: ReactNode }) {
  const { page } = useAppStore()
  const style = {
    "--gradient-primary": resolveAppGradientPrimary(page),
    "--gradient-primary-radial": resolveAppGradientPrimaryRadial(page)
  } as CSSProperties

  return (
    <div style={style} data-page-id={page}>
      {children}
    </div>
  )
}
