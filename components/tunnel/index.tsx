"use client"

import { useGSAP } from "@gsap/react"
import clsx from "clsx"
import gsap from "gsap"
import { useCallback, useMemo, useRef } from "react"
import s from "./tunnel.module.scss"

interface LightPath {
  id: number
  d: string
  duration?: number
  delay?: number
  ease?: string
}

const LIGHT_PATHS: LightPath[] = [
  {
    id: 1,
    d: "M532 5C563.333 61.6667 626 293 626 765",
    duration: 3,
    delay: 0,
    ease: "power2.inOut"
  },
  {
    id: 2,
    d: "M424 3C491.333 59 626 289.8 626 765",
    duration: 5,
    delay: 0.5,
    ease: "power1.inOut"
  },
  {
    id: 3,
    d: "M318 3C420.667 59.6667 626 291.4 626 765",
    duration: 4,
    delay: 1,
    ease: "none"
  },
  {
    id: 4,
    d: "M212 3C342 59.6667 626 291.4 626 765",
    duration: 3,
    delay: 1.5,
    ease: "cubic"
  },
  {
    id: 5,
    d: "M106 3C264 59.6667 626 291.4 626 765",
    duration: 3,
    delay: 0,
    ease: "none"
  },
  {
    id: 6,
    d: "M1 1c208.333 56.667 625 288.8 625 764",
    duration: 2,
    delay: 2,
    ease: "none"
  }
]

interface TunnelProps {
  className?: string
}

export const Tunnel = ({ className }: TunnelProps) => {
  return (
    <div className={clsx(s.tunnel, className)}>
      <svg viewBox="0 0 1252 765" className={s.lines} aria-hidden="true">
        <use href="#lines" />
      </svg>
    </div>
  )
}

export const TunnelDefs = () => {
  const gradientRefs = useRef<(SVGLinearGradientElement | null)[]>([])
  const animationRef = useRef<gsap.core.Timeline | null>(null)

  const animateGradients = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.kill()
    }

    const timeline = gsap.timeline({
      repeat: -1
    })

    gradientRefs.current.forEach((gradient, index) => {
      if (!gradient) return

      const path = LIGHT_PATHS[index]

      const subTimeline = gsap.timeline({
        repeat: -1,
        repeatDelay: path.delay || 0
      })

      subTimeline.to(gradient, {
        attr: {
          x1: "90%",
          y1: "90%",
          x2: "130%",
          y2: "130%"
        },
        duration: path.duration || 3,
        ease: path.ease || "power2.inOut"
      })

      timeline.add(subTimeline, path.delay || 0)
    })

    animationRef.current = timeline
  }, [])

  useGSAP(() => {
    animateGradients()
    return () => {
      if (animationRef.current) {
        animationRef.current.kill()
      }
    }
  }, [animateGradients])

  const gradientElements = useMemo(
    () =>
      LIGHT_PATHS.map((path, index) => (
        <linearGradient
          key={path.id}
          ref={(el: SVGLinearGradientElement | null) => {
            if (el) {
              gradientRefs.current[index] = el
            }
          }}
          id={`light-gradient-${path.id}`}
          x1="0"
          y1="0"
          x2="5%"
          y2="5%"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="var(--light)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--light)" />
          <stop offset="1" stopColor="var(--light)" stopOpacity="0" />
        </linearGradient>
      )),
    []
  )

  const basePathElements = useMemo(
    () => LIGHT_PATHS.map((path) => <path key={path.id} d={path.d} />),
    []
  )

  return (
    <defs>
      <g id="lines">
        <path className={s.path} d="M626 0C626 0 626 382.5 626 765" />
        <use href="#lines-path" />
        <g transform="scale(-1, 1)">
          <use
            href="#lines-path"
            style={{
              transform: "scale(1, 1) translate(-100%, 0%)",
              transformOrigin: "center"
            }}
          />
        </g>
      </g>
      <g id="lines-path">
        <g className={s.path}>{basePathElements}</g>
        {LIGHT_PATHS.map((path) => (
          <g
            key={path.id}
            stroke={`url(#light-gradient-${path.id})`}
            className={s.light}
          >
            <path d={path.d} />
          </g>
        ))}
      </g>
      {gradientElements}
    </defs>
  )
}
