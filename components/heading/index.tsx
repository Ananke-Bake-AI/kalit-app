import clsx from "clsx"
import { forwardRef } from "react"
import { RevealText } from "../reveal-text"
import { Subtitle } from "../subtitle"
import s from "./heading.module.scss"

interface HeadingProps {
  subtitle?: string
  className?: string
  children: React.ReactNode
}

export const Heading = forwardRef<HTMLDivElement, HeadingProps>(({ subtitle, className, children }, ref) => {
  return (
    <div ref={ref} className={clsx(s.heading, className)}>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
      <RevealText tag="h2">{children}</RevealText>
    </div>
  )
})
