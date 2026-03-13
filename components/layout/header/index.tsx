"use client"

import { Button } from "@/components/button"
import { Logo } from "@/components/logo"
import { useAppStore } from "@/stores/app"
import clsx from "clsx"
import Link from "next/link"
import { Nav } from "../nav"
import s from "./header.module.scss"

export const Header = () => {
  const { nav, setNav } = useAppStore()

  return (
    <header className={clsx(s.header, nav && s.open)}>
      <div className={s.content}>
        <Link href="/" className={s.logo}>
          <Logo id="kalit" />
          <span>kalit</span>
        </Link>
        <Nav />
        <Button className={s.btn} circle>
          Start my project
        </Button>
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
