"use client"

import { localePath, stripLocalePrefix } from "@/lib/i18n"
import { useI18n } from "@/stores/i18n"
import clsx from "clsx"
import NextLink, { LinkProps as NextLinkProps } from "next/link"
import { usePathname } from "next/navigation"
import type { CSSProperties } from "react"
import { forwardRef, MouseEvent } from "react"

interface LinkProps extends Omit<NextLinkProps, "href"> {
  href: string
  title?: string
  className?: string
  style?: CSSProperties
  children: React.ReactNode
  onClick?: (event: MouseEvent<HTMLAnchorElement | HTMLDivElement>) => void
  isActive?: boolean
  activeClassName?: string
}

export const Link = forwardRef<HTMLAnchorElement | HTMLDivElement, LinkProps>(
  (
    {
      href,
      title,
      className,
      style,
      onClick,
      children,
      isActive,
      activeClassName,
      ...props
    },
    ref
  ) => {
    const pathname = usePathname()
    const { locale } = useI18n()
    const isExternal = href.startsWith("http")
    const isAnchor = href.startsWith("#") || href.startsWith(`${pathname}#`)
    const barePath = stripLocalePrefix(pathname)
    const isCurrentPath = !isExternal && !isAnchor && barePath === href
    const isCurrentActive = isActive !== undefined ? isActive : isCurrentPath

    // Auto-prepend locale for internal links
    const resolvedHref = !isExternal && !isAnchor ? localePath(href, locale) : href

    const attr = isExternal
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {}

    const handleClick = (e: MouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
      if (isAnchor) {
        e.preventDefault()
        const targetId = href.includes("#") ? href.split("#")[1] : ""
        if (targetId) {
          const targetElement = document.getElementById(targetId)
          if (targetElement) {
            const elementPosition = targetElement.offsetTop - 100
            window.scrollTo({
              top: elementPosition,
              behavior: "smooth"
            })
          }
        }
      }
      onClick?.(e)
    }

    if (isAnchor) {
      return (
        <div
          onClick={handleClick}
          title={title}
          className={className}
          style={style}
          data-pointer
        >
          {children}
        </div>
      )
    }

    return (
      <NextLink
        ref={ref as React.Ref<HTMLAnchorElement>}
        onClick={handleClick}
        href={resolvedHref}
        title={title}
        className={clsx(className, isCurrentActive && activeClassName)}
        style={style}
        {...props}
        {...attr}
      >
        {children}
      </NextLink>
    )
  }
)

Link.displayName = "Link"
