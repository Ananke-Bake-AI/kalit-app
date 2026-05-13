"use client"

import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { Logo } from "@/components/logo"
import { SUITES } from "@/lib/suites"
import { useAppStore } from "@/stores/app"
import { useTranslation } from "@/stores/i18n"
import clsx from "clsx"
import { useState, type MouseEvent } from "react"
import s from "./nav.module.scss"

const NAV_SUITE_IDS = new Set(["flow", "pentest", "search"])
const navSuites = SUITES.filter((suite) => NAV_SUITE_IDS.has(suite.id))

interface ResourceLink {
  href: string
  title: string
  desc: string
  icon: string
}

const RESOURCE_LINKS: ResourceLink[] = [
  // Real semantic icons for each Resources item — generic notebook /
  // rocket / list / arrows didn't convey what the entry actually
  // links to.
  //   Blog          → open book (reading long-form posts)
  //   Changelog     → tag (release/version tags)
  //   Compare       → balance scale (side-by-side comparison)
  //   Alternatives  → exchange arrows (switching tools)
  //   Customers     → building (companies / teams shipping with Kalit)
  { href: "/blog", title: "Blog", desc: "Build notes and deep dives.", icon: "hugeicons:book-open-01" },
  { href: "/changelog", title: "Changelog", desc: "What we ship, when.", icon: "hugeicons:tag-01" },
  { href: "/compare", title: "Compare", desc: "Kalit vs other AI builders.", icon: "hugeicons:scales-01" },
  { href: "/alternatives", title: "Alternatives", desc: "Switching from another tool?", icon: "hugeicons:exchange-01" },
  { href: "/customers", title: "Customers", desc: "Teams shipping with Kalit.", icon: "hugeicons:building-06" }
]

export const Nav = () => {
  const { nav, subOpen, setSubOpen, setNav } = useAppStore()
  const [resOpen, setResOpen] = useState(false)
  const t = useTranslation()

  const handleNavClick = (e: MouseEvent<HTMLElement>) => {
    const el = e.target as HTMLElement
    if (el.closest("a[href]")) {
      setNav(false)
      setSubOpen(false)
      setResOpen(false)
    }
  }

  return (
    <nav className={clsx(s.nav, nav && s.open)} onClick={handleNavClick}>
      <ul>
        <li className={s.subnav}>
          <span
            className={clsx(s.link, s.sublink)}
            onMouseEnter={() => setSubOpen(true)}
            onMouseLeave={() => setSubOpen(false)}
          >
            {t("nav.suites")} <Icon icon="hugeicons:arrow-down-01" className={s.arrow} />
          </span>
          <ul
            className={clsx(s.sub, subOpen && s.subOpen)}
            onMouseEnter={() => setSubOpen(true)}
            onMouseLeave={() => setSubOpen(false)}
            onClick={() => setSubOpen(false)}
          >
            {navSuites.map(({ id, title, color }) => (
              <li key={id} style={{ "--color": color } as React.CSSProperties}>
                <Link href={`/${id}`}>
                  <div className={s.logo}>
                    <Logo id={id} />
                  </div>
                  <span className={s.content}>
                    <strong>
                      {title}
                      {id === "search" ? <span className={s.badge}>{t("suites.searchFree")}</span> : null}
                    </strong>
                    <p>{t(`suites.${id}Small`)}</p>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>

        <li>
          <Link href="/pricing" className={s.link}>
            Pricing
          </Link>
        </li>

        <li className={clsx(s.subnav, s.subnavText)}>
          <span
            className={clsx(s.link, s.sublink)}
            onMouseEnter={() => setResOpen(true)}
            onMouseLeave={() => setResOpen(false)}
          >
            Resources <Icon icon="hugeicons:arrow-down-01" className={s.arrow} />
          </span>
          <ul
            className={clsx(s.sub, s.subText, resOpen && s.subOpen)}
            onMouseEnter={() => setResOpen(true)}
            onMouseLeave={() => setResOpen(false)}
            onClick={() => setResOpen(false)}
          >
            {RESOURCE_LINKS.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>
                  <span className={s.resIcon}>
                    <Icon icon={r.icon} />
                  </span>
                  <span className={s.content}>
                    <strong>{r.title}</strong>
                    <p>{r.desc}</p>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>

        <li>
          <Link href="/#how-it-works" className={s.link}>
            {t("nav.howItWorks")}
          </Link>
        </li>
        <li>
          <Link href="/#try-now" className={s.link}>
            {t("nav.tryNow")}
          </Link>
        </li>
        <li>
          <Link href="/#why-kalit" className={s.link}>
            {t("nav.whyKalit")}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
