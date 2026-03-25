"use client"

import clsx from "clsx"
import { forwardRef } from "react"
import { usePathname } from "next/navigation"
import { Paragraph } from "../paragraph"
import { RevealText } from "../reveal-text"
import { Subtitle } from "../subtitle"
import s from "./heading.module.scss"

interface HeadingProps {
  subtitle?: string
  className?: string
  children: React.ReactNode
  paragraph?: string | React.ReactNode
}

export const Heading = forwardRef<HTMLDivElement, HeadingProps>(({ subtitle, className, children, paragraph }, ref) => {
  const pathname = usePathname()

  return (
    <div ref={ref} className={clsx(s.heading, className)}>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
      <RevealText key={pathname} tag="h2">
        {children}
      </RevealText>
      {paragraph && <Paragraph className={s.paragraph}>{paragraph}</Paragraph>}
    </div>
  )
})

Heading.displayName = "Heading"
