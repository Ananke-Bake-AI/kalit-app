"use client"

import { type Tag } from "@/types/Tag"

import clsx from "clsx"
import { usePathname } from "next/navigation"
import { forwardRef } from "react"
import { Paragraph } from "../paragraph"
import { RevealText } from "../reveal-text"
import { Subtitle } from "../subtitle"
import s from "./heading.module.scss"

interface HeadingProps {
  tag?: Tag
  subtitle?: string
  className?: string
  children: React.ReactNode
  paragraph?: string | React.ReactNode
}

export const Heading = forwardRef<HTMLDivElement, HeadingProps>(
  ({ subtitle, className, children, paragraph, tag = "h2" }, ref) => {
    const pathname = usePathname()

    return (
      <div ref={ref} className={clsx(s.heading, className)}>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
        <RevealText key={pathname} tag={tag}>
          {children}
        </RevealText>
        {paragraph && <Paragraph className={s.paragraph}>{paragraph}</Paragraph>}
      </div>
    )
  }
)

Heading.displayName = "Heading"
