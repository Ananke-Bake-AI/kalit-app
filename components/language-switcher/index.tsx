"use client"

import { LOCALE_CONFIG, LOCALES, type Locale } from "@/lib/i18n"
import { useI18n } from "@/stores/i18n"
import { useClickOutside } from "@reactuses/core"
import clsx from "clsx"
import { useRef, useState } from "react"
import s from "./language-switcher.module.scss"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setOpen(false))

  const current = LOCALE_CONFIG[locale]

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
                onClick={() => {
                  setLocale(loc)
                  setOpen(false)
                }}
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
