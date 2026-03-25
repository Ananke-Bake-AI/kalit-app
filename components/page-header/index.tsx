import clsx from "clsx"
import type { ReactNode } from "react"
import s from "./page-header.module.scss"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  align?: "center" | "left"
  className?: string
}

export function PageHeader({ title, description, align = "center", className }: PageHeaderProps) {
  return (
    <div className={clsx(s.root, align === "left" && s.alignLeft, className)}>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </div>
  )
}
