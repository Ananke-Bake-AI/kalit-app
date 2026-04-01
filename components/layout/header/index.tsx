"use client"

import { Avatar } from "@/components/avatar"
import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Link } from "@/components/link"
import { Logotype } from "@/components/logotype"
import { SUITES, type AppPageState, type SuiteId } from "@/lib/suites"
import { useAppStore } from "@/stores/app"
import { useTranslation } from "@/stores/i18n"
import { useClickOutside, useElementSize } from "@reactuses/core"
import clsx from "clsx"
import type { Session } from "next-auth"
import { signOut, useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { Nav } from "../nav"
import s from "./header.module.scss"

const SUITE_LABEL_EXIT_MS = 620

interface HeaderProps {
  initialSession?: Session | null
}

export const Header = ({ initialSession = null }: HeaderProps) => {
  const { nav, setNav, page } = useAppStore()
  const { data: session, status } = useSession()
  const t = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const labelRefs = useRef<Partial<Record<SuiteId, HTMLSpanElement | null>>>({})
  const prevPageRef = useRef<AppPageState>(page)
  const [exitingId, setExitingId] = useState<SuiteId | null>(null)
  const resolvedSession = status === "loading" ? initialSession : session

  const [measuredLabelWidth] = useElementSize(() => (page !== "default" ? (labelRefs.current[page] ?? null) : null))
  const suitesWidth = page === "default" ? 0 : measuredLabelWidth

  useEffect(() => {
    const prev = prevPageRef.current
    if (prev === page) return
    if (prev !== "default") setExitingId(prev)
    prevPageRef.current = page
    const t = window.setTimeout(() => setExitingId(null), SUITE_LABEL_EXIT_MS)
    return () => clearTimeout(t)
  }, [page])

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)
  useClickOutside(headerRef, () => setNav(false), nav)

  return (
    <header ref={headerRef} className={clsx(s.header, nav && s.open)}>
      <div className={s.content}>
        <Link href="/" className={s.logo} data-logo-active={page}>
          <Logotype all={true} />
          <span className={s.suites} style={{ "--suites-width": suitesWidth + "px" } as React.CSSProperties}>
            {SUITES.map((suite) => {
              const isActive = page !== "default" && suite.id === page
              const isExiting = exitingId === suite.id
              return (
                <span
                  key={suite.id}
                  ref={(el) => {
                    labelRefs.current[suite.id] = el
                  }}
                  style={{ color: suite.color } as React.CSSProperties}
                  className={clsx(s.suiteLabel, isActive && s.active, isExiting && s.exiting)}
                >
                  {suite.title}
                </span>
              )
            })}
          </span>
        </Link>
        <Nav />
        <LanguageSwitcher className={s.langSwitcher} />

        {resolvedSession?.user ? (
          <div className={s.userMenu} ref={menuRef}>
            <button
              className={s.userBtn}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="User menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Avatar
                className={s.avatar}
                name={resolvedSession.user.name || resolvedSession.user.email || "Account"}
              />
              <span className={s.userMeta}>
                <span className={s.userName}>{resolvedSession.user.name || "Account"}</span>
              </span>
              <span className={s.userActions} aria-hidden="true">
                <span className={clsx(s.userChevron, menuOpen && s.userChevronOpen)}>
                  <Icon icon="hugeicons:arrow-down-01" />
                </span>
              </span>
            </button>
            {menuOpen && (
              <div className={s.dropdown} role="menu">
                <div className={s.dropdownHeader}>
                  <Avatar
                    className={s.dropdownAvatar}
                    name={resolvedSession.user.name || resolvedSession.user.email || "Account"}
                  />
                  <div className={s.dropdownIdentity}>
                    <span className={s.dropdownName}>{resolvedSession.user.name || "Account"}</span>
                    <span>{resolvedSession.user.email}</span>
                  </div>
                </div>
                <div className={s.dropdownGroup}>
                  <Link href="/dashboard" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <span className={s.dropdownIcon}>
                      <Icon icon="hugeicons:dashboard-square-01" />
                    </span>
                    <span className={s.dropdownLabel}>{t("nav.dashboard")}</span>
                  </Link>
                  <Link href="/settings/profile" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <span className={s.dropdownIcon}>
                      <Icon icon="hugeicons:user-circle" />
                    </span>
                    <span className={s.dropdownLabel}>{t("nav.profile")}</span>
                  </Link>
                  <Link href="/settings/billing" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <span className={s.dropdownIcon}>
                      <Icon icon="hugeicons:credit-card" />
                    </span>
                    <span className={s.dropdownLabel}>{t("nav.billing")}</span>
                  </Link>
                  {resolvedSession.user.email && (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "frederick.marinho@gmail.com,nico.style931@gmail.com").split(",").map(e => e.trim().toLowerCase()).includes(resolvedSession.user.email.toLowerCase()) && (
                    <Link href="/admin" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                      <span className={s.dropdownIcon}>
                        <Icon icon="hugeicons:shield-01" />
                      </span>
                      <span className={s.dropdownLabel}>{t("nav.admin")}</span>
                    </Link>
                  )}
                </div>
                <button className={s.dropdownItem} onClick={() => signOut({ callbackUrl: "/" })}>
                  <span className={s.dropdownIcon}>
                    <Icon icon="hugeicons:logout-01" />
                  </span>
                  <span className={s.dropdownLabel}>{t("nav.signOut")}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button className={s.btn} circle href="/register">
            {t("nav.getEarlyAccess")}
          </Button>
        )}

        <button className={s.bnav} onClick={() => setNav(!nav)} aria-label="Navigation">
          <svg viewBox="0 0 100 100">
            <path className={s.l1} d="M0,42h62c13,0,6,26-4,16L35,35" />
            <path className={s.l2} d="M0,50h70" />
            <path className={s.l3} d="M0,58h62c13,0,6-26-4-16L35,65" />
          </svg>
        </button>
        <div className={s.bg} />
      </div>
    </header>
  )
}
