"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"

interface StudioThemeContextValue {
  darkMode: boolean
  toggleTheme: () => void
}

const StudioThemeContext = createContext<StudioThemeContextValue | null>(null)

interface ProviderProps {
  children: ReactNode
  initial: boolean
  storageKey: string
}

export function StudioThemeProvider({ children, initial, storageKey }: ProviderProps) {
  const [darkMode, setDarkMode] = useState<boolean>(initial)

  useEffect(() => {
    setDarkMode(initial)
  }, [initial])

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, next ? "1" : "0")
      }
      return next
    })
  }, [storageKey])

  return (
    <StudioThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </StudioThemeContext.Provider>
  )
}

export function useStudioTheme(): StudioThemeContextValue {
  const ctx = useContext(StudioThemeContext)
  if (!ctx) {
    return { darkMode: false, toggleTheme: () => {} }
  }
  return ctx
}
