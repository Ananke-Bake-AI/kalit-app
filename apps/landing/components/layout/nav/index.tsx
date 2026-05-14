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
  // Pick icons that are (a) semantic, (b) verified to exist in the
  // hugeicons set — `scales-01` was invalid which rendered Compare as
  // an empty circle on the live site.
  //   Blog          → pen-tool-03  (writing long-form posts)
  //   Changelog     → new-releases (we ship things)
  //   Compare       → git-compare  (side-by-side comparison)
  //   Alternatives  → arrow-left-right (switching tools)
  { href: "/blog", title: "Blog", desc: "Build notes and deep dives.", icon: "hugeicons:pen-tool-03" },
  { href: "/changelog", title: "Changelog", desc: "What we ship, when.", icon: "hugeicons:new-releases" },
  { href: "/compare", title: "Compare", desc: "Kalit vs other AI builders.", icon: "hugeicons:git-compare" },
  { href: "/alternatives", title: "Alternatives", desc: "Switching from another tool?", icon: "hugeicons:arrow-left-right" }
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
