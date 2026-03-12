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
  secondary?: boolean
  circle?: boolean
}

export const Button = ({
  children,
  icon,
  iconPosition = "right",
  href,
  className,
  onClick,
  disabled = false,
  secondary = false,
  circle = false,
  ...props
}: ButtonProps) => {
  const Content = (
    <>
      {icon && iconPosition == "left" && <Icon icon={icon} className={s.icon} />}
      {children && <span>{children}</span>}
      {icon && iconPosition == "right" && <Icon icon={icon} className={s.icon} />}
      {circle && (
        <svg viewBox="0 0 59 59" className={s.circleSvg}>
          <circle cx="29.3669" cy="29.3669" r="25.3669" stroke="url(#button-stroke)" />
        </svg>
      )}
    </>
  )

  const classNames = clsx(s.btn, className, circle && s.circle, secondary && s.secondary)

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

Button.displayName = "Button"
