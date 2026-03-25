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
  circle?: boolean
  type?: "submit" | "button" | "reset"
  variant?: "primary" | "secondary" | "tertiary"
}

export const Button = ({
  children,
  icon,
  iconPosition = "right",
  href,
  className,
  onClick,
  disabled = false,
  circle = false,
  type,
  variant = "primary",
  ...props
}: ButtonProps) => {
  const Content = (
    <>
      {icon && iconPosition == "left" && <Icon icon={icon} className={s.icon} />}
      {children && <span>{children}</span>}
      {icon && iconPosition == "right" && <Icon icon={icon} className={s.icon} />}
    </>
  )

  const classNames = clsx(s.btn, className, circle && s.circle, variant && s[variant])

  const attrs = {
    className: classNames,
    onClick,
    disabled,
    type
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
