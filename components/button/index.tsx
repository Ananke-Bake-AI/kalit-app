"use client"

import clsx from "clsx"
import { ReactNode } from "react"
import { Icon } from "../icon"
import { Link } from "../link"
import s from "./button.module.scss"

export interface ButtonProps {
  children?: ReactNode
  icon?: string
  iconPosition?: "left" | "right"
  href?: string
  className?: string
  disabled?: boolean
  onClick?: () => void
}

export const Button = ({
  children,
  icon,
  iconPosition = "right",
  href,
  className,
  onClick,
  disabled = false,
  ...props
}: ButtonProps) => {
  const Content = (
    <>
      {icon && iconPosition == "left" && <Icon icon={icon} className={s.icon} />}
      {children && <span>{children}</span>}
      {icon && iconPosition == "right" && <Icon icon={icon} className={s.icon} />}
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="30" viewBox="0 0 34 30" fill="none">
        <path d="M4.5 30C4.5 15.9167 15.9167 4.5 30 4.5H34" stroke="url(#paint0_linear_126_2555)" stroke-width="9" />
        <defs>
          <linearGradient id="paint0_linear_126_2555" x1="34" y1="2.5" x2="4.5" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0" className={s.stop1} />
            <stop offset="0.33" className={s.stop2} />
            <stop offset="0.66" className={s.stop3} />
            <stop offset="1" className={s.stop4} />
          </linearGradient>
        </defs>
      </svg>
    </>
  )

  const classNames = clsx(s.btn, className)

  const attrs = {
    className: classNames,
    onClick,
    disabled
  }

  if (href) {
    return (
      <Link {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} {...attrs} href={href}>
        {Content}
      </Link>
    )
  } else {
    return (
      <button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)} {...attrs}>
        {Content}
      </button>
    )
  }
}
