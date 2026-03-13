import clsx from "clsx"
import { forwardRef } from "react"
import s from "./paragraph.module.scss"

interface ParagraphProps {
  children: React.ReactNode
  className?: string
}

export const Paragraph = forwardRef<HTMLDivElement, ParagraphProps>(({ children, className }, ref) => {
  return (
    <div className={clsx(s.paragraph, className)} ref={ref} data-paragraph data-reveal>
      {children}
    </div>
  )
})

Paragraph.displayName = "Paragraph"
