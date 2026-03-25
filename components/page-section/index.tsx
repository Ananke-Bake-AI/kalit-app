import clsx from "clsx"
import type { ReactNode } from "react"
import s from "./page-section.module.scss"

interface PageSectionProps {
  children: ReactNode
  className?: string
}

export function PageSection({ children, className }: PageSectionProps) {
  return <section className={clsx(s.root, className)}>{children}</section>
}
