'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

import { Line } from './line'
import s from './svg.module.scss'

interface AnimatedLightsLineProps {
  d: string
  viewBox: string
  className?: string
  stroke?: string
  strokeWidth?: number
  lightsStroke?: string
  lightsWidth?: number
  lightsCount?: number
  duration?: number
}

export function AnimatedLightsLine({
  d,
  viewBox,
  className,
  stroke = 'currentColor',
  strokeWidth = 1,
  lightsStroke,
  lightsWidth,
  lightsCount = 4,
  duration = 4
}: AnimatedLightsLineProps) {
  const pathRef = useRef<SVGPathElement | null>(null)
  const [length, setLength] = useState(0)

  useEffect(() => {
    if (!pathRef.current) return

    const totalLength = pathRef.current.getTotalLength()
    setLength(totalLength)
  }, [d])

  const hasLength = length > 0

  const dashLength = hasLength ? Math.max(length / (lightsCount * 8), 4) : 0
  const totalDash = dashLength * lightsCount
  const gapLength = hasLength ? Math.max((length - totalDash) / lightsCount, dashLength) : 0

  return (
    <Line viewBox={viewBox} className={className}>
      <path d={d} stroke={stroke} fill="none" strokeWidth={strokeWidth} />

      <path
        ref={pathRef}
        d={d}
        className={clsx(s.lightsPath)}
        stroke={lightsStroke ?? stroke}
        fill="none"
        strokeWidth={lightsWidth ?? strokeWidth * 1.4}
        strokeLinecap="round"
        style={{
          strokeDasharray: `${dashLength} ${gapLength}`,
          strokeDashoffset: 0,
          '--lights-duration': `${duration}s`
        }}
      />
    </Line>
  )
}

