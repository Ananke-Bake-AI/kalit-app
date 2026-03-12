"use client"

import { easings } from "@/components/layout/gsap/easings"
import { useGSAP } from "@gsap/react"
import { useElementBounding } from "@reactuses/core"
import clsx from "clsx"
import gsap from "gsap"
import { forwardRef, useRef } from "react"
import s from "./subtitle.module.scss"

interface SubtitleProps {
  children: React.ReactNode
  className?: string
}

export const Subtitle = forwardRef<HTMLDivElement, SubtitleProps>(({ children, className }, ref) => {
  const containerRef = useRef<HTMLSpanElement>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  const { width } = useElementBounding(spanRef)

  useGSAP(() => {
    gsap.to(containerRef.current, {
      width,
      ease: easings.quartOut,
      duration: 1.2,
      scrollTrigger: {
        trigger: containerRef.current
      }
    })
  }, [width])

  return (
    <div className={clsx(s.subtitle, className)} ref={ref}>
      <span ref={containerRef}>
        <span ref={spanRef}>{children}</span>
      </span>
    </div>
  )
})

Subtitle.displayName = "Subtitle"
