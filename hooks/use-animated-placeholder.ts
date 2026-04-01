import gsap from "gsap"
import { type RefObject, useCallback, useEffect, useRef } from "react"

export interface UseAnimatedPlaceholderOptions {
  phrases: readonly string[]
  focusedPlaceholder: string
  typeCharDelay?: number
  eraseCharDelay?: number
  holdDuration?: number
  repeatDelay?: number
}

export interface UseAnimatedPlaceholderResult {
  timelineRef: RefObject<gsap.core.Timeline | null>
  handleFocus: () => void
  handleBlur: () => void
}

export function useAnimatedPlaceholder(
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  {
    phrases,
    focusedPlaceholder,
    typeCharDelay = 0.04,
    eraseCharDelay = 0.02,
    holdDuration = 1,
    repeatDelay = 1
  }: UseAnimatedPlaceholderOptions
): UseAnimatedPlaceholderResult {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const isFocusedRef = useRef(false)
  const phrasesKey = phrases.join("\0")

  useEffect(() => {
    const el = inputRef.current
    if (!el) return

    // Kill any existing timeline first
    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
    }

    // Don't start animation if input is focused
    if (isFocusedRef.current) return

    const tl = gsap.timeline({ repeat: -1, repeatDelay })

    phrases.forEach((phrase) => {
      const chars = phrase.split("")

      tl.call(() => {
        if (inputRef.current) inputRef.current.placeholder = "|"
      })

      chars.forEach((_, index) => {
        tl.call(
          () => {
            if (!inputRef.current) return
            inputRef.current.placeholder = `${phrase.slice(0, index + 1)}|`
          },
          [],
          `+=${typeCharDelay}`
        )
      })

      tl.to({}, { duration: holdDuration })

      chars.forEach((_, index) => {
        tl.call(
          () => {
            if (!inputRef.current) return
            const remaining = phrase.length - index - 1
            const text = phrase.slice(0, remaining)
            inputRef.current.placeholder = text ? `${text}|` : "|"
          },
          [],
          `+=${eraseCharDelay}`
        )
      })
    })

    timelineRef.current = tl

    return () => {
      tl.kill()
      timelineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrasesKey, typeCharDelay, eraseCharDelay, holdDuration, repeatDelay])

  const handleFocus = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    isFocusedRef.current = true
    timelineRef.current?.pause()
    el.placeholder = focusedPlaceholder
  }, [focusedPlaceholder, inputRef])

  const handleBlur = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    isFocusedRef.current = false
    if (!el.value.trim() && timelineRef.current) {
      timelineRef.current.play()
    }
  }, [inputRef])

  return { timelineRef, handleFocus, handleBlur }
}
