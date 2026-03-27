"use client"

import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useRef } from "react"
import s from "./svg.module.scss"

interface AnimatedLineProps {
  d: string
  viewBox: string
  className?: string
  stroke?: string
  strokeWidth?: number
}

export const AnimatedLine = ({ d, viewBox, className, stroke = "currentColor", strokeWidth }: AnimatedLineProps) => {
  const pathRef = useRef<SVGPathElement | null>(null)

  useGSAP(() => {
    gsap.fromTo(
      pathRef.current,
      { "--dash-offset": 2 },
      {
        "--dash-offset": 0,
        duration: 4,
        ease: "power1.inOut",
        delay: 0.4,
        scrollTrigger: {
          trigger: pathRef.current,
          start: "top bottom",
          once: true
        }
      }
    )
  }, [])

  return (
    <svg viewBox={viewBox} className={clsx(className, s.animatedLine)}>
      <path ref={pathRef} d={d} stroke={stroke} pathLength={1} data-path />
    </svg>
  )
}
