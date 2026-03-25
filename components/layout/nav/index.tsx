"use client"

import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { SUITES } from "@/lib/suites"
import { useAppStore } from "@/stores/app"
import { Icon } from "@iconify/react"
import clsx from "clsx"
import s from "./nav.module.scss"

export const Nav = () => {
  const { nav, subOpen, setSubOpen } = useAppStore()

  return (
    <nav className={clsx(s.nav, nav && s.open)}>
      <ul>
        <li className={s.subnav}>
          <span
            className={clsx(s.link, s.sublink)}
            onMouseEnter={() => setSubOpen(true)}
            onMouseLeave={() => setSubOpen(false)}
          >
            Suites <Icon icon="hugeicons:arrow-down-01" className={s.arrow} />
          </span>
          <ul
            className={clsx(s.sub, subOpen && s.subOpen)}
            onMouseEnter={() => setSubOpen(true)}
            onMouseLeave={() => setSubOpen(false)}
            onClick={() => setSubOpen(false)}
          >
            {SUITES.map(({ id, title, color, smallDescription }) => (
              <li key={id} style={{ "--color": color } as React.CSSProperties}>
                <Link href={`/${id}`}>
                  <div className={s.logo}>
                    <Logo id={id} />
                  </div>
                  <span className={s.content}>
                    <strong>{title}</strong>
                    <p>{smallDescription}</p>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <Link href="/" className={s.link}>
            How it works
          </Link>
        </li>
        <li>
          <Link href="/" className={s.link}>
            Try now
          </Link>
        </li>
        <li>
          <Link href="/" className={s.link}>
            Why Kalit?
          </Link>
        </li>
      </ul>
    </nav>
  )
}
