import clsx from "clsx"
import type { ReactNode } from "react"
import s from "./badge.module.scss"

interface BadgeProps {
  children: ReactNode
  variant?: "success" | "popular" | "white" | "warning"
  className?: string
}

export function Badge({ children, variant, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        s.root,
        variant === "success" && s.success,
        variant === "popular" && s.popular,
        variant === "white" && s.white,
        variant === "warning" && s.warning,
        className
      )}
    >
      {children}
    </span>
  )
}
