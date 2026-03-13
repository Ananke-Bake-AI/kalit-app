import clsx from "clsx"
import { forwardRef } from "react"
import { Paragraph } from "../paragraph"
import { RevealText } from "../reveal-text"
import { Subtitle } from "../subtitle"
import s from "./heading.module.scss"

interface HeadingProps {
  subtitle?: string
  className?: string
  children: React.ReactNode
  paragraph?: string
}

export const Heading = forwardRef<HTMLDivElement, HeadingProps>(({ subtitle, className, children, paragraph }, ref) => {
  return (
    <div ref={ref} className={clsx(s.heading, className)}>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
      <RevealText tag="h2">{children}</RevealText>
      {paragraph && <Paragraph className={s.paragraph}>{paragraph}</Paragraph>}
    </div>
  )
})
