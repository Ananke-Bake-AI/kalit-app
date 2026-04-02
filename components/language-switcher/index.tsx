"use client"

import { LOCALE_CONFIG, LOCALES, localePath, stripLocalePrefix, type Locale } from "@/lib/i18n"
import { COOKIE_NAME } from "@/lib/i18n"
import { useI18n } from "@/stores/i18n"
import { useClickOutside } from "@reactuses/core"
import clsx from "clsx"
import { usePathname, useRouter } from "next/navigation"
import { useRef, useState } from "react"
import s from "./language-switcher.module.scss"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useClickOutside(ref, () => setOpen(false))

  const current = LOCALE_CONFIG[locale]

  const handleSwitch = (loc: Locale) => {
    // Set cookie for preference memory (used by middleware for root "/" redirect)
    document.cookie = `${COOKIE_NAME}=${loc};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    setOpen(false)
    // Navigate to the new locale URL
    const barePath = stripLocalePrefix(pathname)
    router.push(localePath(barePath, loc))
  }

  return (
    <div ref={ref} className={clsx(s.root, className)}>
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen(!open)}
        aria-label="Change language"
      >
        <span className={s.flag}>{current.flag}</span>
        <span className={s.label}>{current.label}</span>
      </button>

      {open && (
        <div className={s.dropdown}>
          {LOCALES.map((loc) => {
            const config = LOCALE_CONFIG[loc]
            return (
              <button
                key={loc}
                type="button"
                className={clsx(s.option, locale === loc && s.optionActive)}
                onClick={() => handleSwitch(loc)}
              >
                <span className={s.optionFlag}>{config.flag}</span>
                <span className={s.optionName}>{config.name}</span>
                <span className={s.optionLabel}>{config.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
