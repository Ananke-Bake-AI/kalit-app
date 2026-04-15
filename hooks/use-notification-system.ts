"use client"

import { useCallback, useEffect, useRef } from "react"

// LocalStorage keys — same pattern as PROGRESS_MODE_KEY in studio-client.
const TITLE_KEY = "kalit_studio_notify_title"
const SOUND_KEY = "kalit_studio_notify_sound"

// Title flash prefix. Short and glyph-based so it reads at a glance even on a
// narrow tab strip.
const TITLE_PREFIX = "● "

export interface NotificationPrefs {
  titleEnabled: boolean
  soundEnabled: boolean
}

export function readNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") {
    return { titleEnabled: true, soundEnabled: false }
  }
  try {
    const t = window.localStorage.getItem(TITLE_KEY)
    const s = window.localStorage.getItem(SOUND_KEY)
    return {
      titleEnabled: t === null ? true : t === "1",
      soundEnabled: s === "1",
    }
  } catch {
    return { titleEnabled: true, soundEnabled: false }
  }
}

export function writeNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(TITLE_KEY, prefs.titleEnabled ? "1" : "0")
    window.localStorage.setItem(SOUND_KEY, prefs.soundEnabled ? "1" : "0")
  } catch {
    // silent
  }
}

// useNotificationSystem wires up page-title flashing + an optional WebAudio
// chime for broker events. Returns a single `notify()` callback that the
// caller fires on every "something the user cares about" event — the hook
// itself decides whether to actually show anything based on visibility and
// user prefs.
//
// Design choices:
//   - Only fires while `document.visibilityState !== "visible"` so users
//     actively watching the tab don't get nagged.
//   - Title is restored on the next focus/visibility event, then never
//     re-flashed for the same batch until another notify() fires while
//     hidden.
//   - Sound is off by default — on-by-default feels aggressive in chat UIs.
export function useNotificationSystem(prefsRef: React.MutableRefObject<NotificationPrefs>) {
  const originalTitleRef = useRef<string | null>(null)
  const flashingRef = useRef(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Capture the "clean" title once so flashing can restore it cleanly even if
  // the app mutates document.title later for route changes.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (originalTitleRef.current === null) {
      const current = document.title
      originalTitleRef.current = current.startsWith(TITLE_PREFIX)
        ? current.slice(TITLE_PREFIX.length)
        : current
    }
  }, [])

  const restoreTitle = useCallback(() => {
    if (!flashingRef.current) return
    flashingRef.current = false
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current
    }
  }, [])

  // Restore when the user returns to the tab.
  useEffect(() => {
    if (typeof document === "undefined") return
    const onVis = () => {
      if (document.visibilityState === "visible") restoreTitle()
    }
    const onFocus = () => restoreTitle()
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("focus", onFocus)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("focus", onFocus)
    }
  }, [restoreTitle])

  // Short synthesized chime — two tones, ~220ms total. No asset, no network.
  const playChime = useCallback(() => {
    if (typeof window === "undefined") return
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor()
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") ctx.resume().catch(() => {})

      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      gain.connect(ctx.destination)

      const a = ctx.createOscillator()
      a.type = "sine"
      a.frequency.setValueAtTime(880, now)
      a.connect(gain)
      a.start(now)
      a.stop(now + 0.22)

      const b = ctx.createOscillator()
      b.type = "sine"
      b.frequency.setValueAtTime(1320, now + 0.08)
      b.connect(gain)
      b.start(now + 0.08)
      b.stop(now + 0.22)
    } catch {
      // silent — WebAudio is best-effort
    }
  }, [])

  const notify = useCallback(() => {
    if (typeof document === "undefined") return
    // Only fire when the user isn't already watching the tab.
    if (document.visibilityState === "visible" && document.hasFocus()) return

    const prefs = prefsRef.current

    if (prefs.titleEnabled && !flashingRef.current) {
      flashingRef.current = true
      if (originalTitleRef.current === null) {
        originalTitleRef.current = document.title
      }
      document.title = TITLE_PREFIX + (originalTitleRef.current || "Kalit Studio")
    }

    if (prefs.soundEnabled) playChime()
  }, [playChime, prefsRef])

  return { notify }
}
