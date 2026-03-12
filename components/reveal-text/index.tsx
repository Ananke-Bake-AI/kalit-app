"use client"

import { easings } from "@/components/layout/gsap/easings"
import { Tag } from "@/types/Tag"
import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { useRef } from "react"
import s from "./reveal-text.module.scss"

// Enregistrer le plugin SplitText
if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText)
}

interface RevealTextProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string | React.ReactNode
  className?: string
  tag?: Tag
  animate?: boolean
  start?: string
  onComplete?: () => void
}

export const RevealText = ({
  children,
  className,
  tag = "div",
  animate = true,
  start = "50% bottom",
  onComplete,
  ...props
}: RevealTextProps) => {
  const Element = tag
  const elementRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!elementRef.current) return

      const svg = elementRef.current?.querySelectorAll("[data-icon-svg]")
      const split = SplitText.create(elementRef.current, {
        type: "words",
        wordsClass: s.word,
        reduceWhiteSpace: true
      })

      if (!split.words || split.words.length === 0) return

      const wordSpans: HTMLSpanElement[] = []
      split.words.forEach((word) => {
        const textContent = word.textContent || ""
        const span = document.createElement("span")
        span.textContent = textContent
        word.textContent = ""
        word.appendChild(span)
        wordSpans.push(span)
      })

      const tl = gsap.timeline({
        defaults: { ease: easings.smoothOut },
        scrollTrigger: {
          trigger: elementRef.current,
          start
        }
      })

      if (animate) {
        tl.from(wordSpans, {
          y: "110%",
          stagger: 0.1,
          duration: 0.9,
          ease: "back.out(1.2)",
          onComplete: () => {
            onComplete?.()
          }
        })

        if (svg && svg.length > 0) {
          tl.to(
            svg,
            {
              scale: 1,
              ease: "back.out(1.2)",
              duration: 1,
              stagger: 0.2,
              delay: 0.5
            },
            "<"
          )
        }
      }

      // Cleanup function pour réinitialiser SplitText
      return () => {
        if (split) {
          split.revert()
        }
      }
    },
    { scope: elementRef, dependencies: [animate, start, onComplete] }
  )

  return (
    <Element ref={elementRef} className={clsx(s.reveal, className)} {...props}>
      {children}
    </Element>
  )
}
