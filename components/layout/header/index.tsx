"use client"

import { Button } from "@/components/button"
import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { Logotype } from "@/components/logotype"
import { useAppStore } from "@/stores/app"
import type { Session } from "next-auth"
import { useSession, signOut } from "next-auth/react"
import clsx from "clsx"
import { useState, useRef, useEffect } from "react"
import { Nav } from "../nav"
import s from "./header.module.scss"

interface HeaderProps {
  initialSession?: Session | null
}

export const Header = ({ initialSession = null }: HeaderProps) => {
  const { nav, setNav } = useAppStore()
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const resolvedSession = status === "loading" ? initialSession : session

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className={clsx(s.header, nav && s.open)}>
      <div className={s.content}>
        <Link href="/" className={s.logo}>
          <Logotype />
        </Link>
        <Nav />

        {resolvedSession?.user ? (
          <div className={s.userMenu} ref={menuRef}>
            <button
              className={s.userBtn}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="User menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className={s.avatar}>
                {resolvedSession.user.name?.charAt(0)?.toUpperCase() ||
                  resolvedSession.user.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </span>
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
                  <span className={s.dropdownAvatar}>
                    {resolvedSession.user.name?.charAt(0)?.toUpperCase() ||
                      resolvedSession.user.email?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </span>
                  <div className={s.dropdownIdentity}>
                    <span className={s.dropdownName}>{resolvedSession.user.name || "Account"}</span>
                    <span>{resolvedSession.user.email}</span>
                  </div>
                </div>
                <div className={s.dropdownGroup}>
                  <Link href="/dashboard" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <span className={s.dropdownIcon}><Icon icon="hugeicons:dashboard-square-01" /></span>
                    <span className={s.dropdownLabel}>Dashboard</span>
                  </Link>
                  <Link href="/settings/profile" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <span className={s.dropdownIcon}><Icon icon="hugeicons:user-circle" /></span>
                    <span className={s.dropdownLabel}>Profile</span>
                  </Link>
                  <Link href="/settings/billing" className={s.dropdownItem} onClick={() => setMenuOpen(false)}>
                    <span className={s.dropdownIcon}><Icon icon="hugeicons:credit-card" /></span>
                    <span className={s.dropdownLabel}>Billing</span>
                  </Link>
                </div>
                <button
                  className={s.dropdownItem}
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <span className={s.dropdownIcon}><Icon icon="hugeicons:logout-01" /></span>
                  <span className={s.dropdownLabel}>Sign out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button className={s.btn} circle href="/register">
            Get early access
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
