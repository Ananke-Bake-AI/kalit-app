"use client"

// https://icones.js.org/

import { Icon as Iconify, IconProps as IconifyProps } from "@iconify/react"
import clsx from "clsx"
import { Logo } from "../logo"
import s from "./icon.module.scss"

interface IconProps extends Omit<IconifyProps, "icon"> {
  icon: string
}

export const Icon = ({ icon, ...props }: IconProps) => {
  if (icon === "kalit") {
    return <Logo id="kalit" className={clsx(s.icon, props.className)} data-icon={icon} />
  }

  return <Iconify {...props} className={clsx(s.icon, props.className)} icon={icon} data-icon={icon} />
}
