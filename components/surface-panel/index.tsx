import clsx from "clsx"
import type { ReactNode } from "react"
import s from "./surface-panel.module.scss"

interface SurfacePanelProps {
  title?: string
  subtitle?: string
  headerAside?: ReactNode
  children: ReactNode
  className?: string
  spaced?: boolean
  danger?: boolean
}

export function SurfacePanel({ title, subtitle, headerAside, children, className, spaced, danger }: SurfacePanelProps) {
  const hasHeader = Boolean(title || subtitle || headerAside)

  return (
    <div className={clsx(s.root, spaced && s.spaced, danger && s.danger, className)}>
      {hasHeader ? (
        <div className={s.header}>
          <div>
            {title ? <h2 className={clsx(s.title, danger && s.titleDanger)}>{title}</h2> : null}
            {subtitle ? <p className={s.subtitle}>{subtitle}</p> : null}
          </div>
          {headerAside}
        </div>
      ) : null}
      {children}
    </div>
  )
}
