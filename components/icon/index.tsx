"use client"

// https://icones.js.org/

import { Icon as Iconify, IconProps as IconifyProps } from "@iconify/react"
import clsx from "clsx"
import s from "./icon.module.scss"

interface IconProps extends Omit<IconifyProps, "icon"> {
  icon: string
}

export const Icon = ({ icon, ...props }: IconProps) => (
  <Iconify
    {...props}
    className={clsx(s.icon, props.className)}
    icon={icon}
    data-icon={icon}
  />
)
