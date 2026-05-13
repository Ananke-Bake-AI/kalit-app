"use client"

import { Icon } from "@/components/icon"
import { useTranslation } from "@/stores/i18n"
import { useEffect, useState } from "react"
import s from "./discord-fab.module.scss"

const DISCORD_URL = "https://discord.gg/FssPgq5hQK"
const STORAGE_KEY = "kalit-discord-fab-dismissed-at"
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000  // re-show after a week

/**
 * Floating "Join Discord" pill in the bottom-right corner. Visible on
 * every page (public + authenticated, except Studio focus mode where
 * the chrome is intentionally hidden). Functions as the always-reachable
 * channel into community support — the alternative was burying the link
 * in the footer where most users never scroll down to find it.
 *
 * Dismissible: clicking the close-X stores a timestamp in
 * localStorage; the FAB stays hidden for a week then re-appears, so
 * one dismissal doesn't permanently kill the touchpoint.
 */
export function DiscordFAB() {
  const t = useTranslation()
  const [visible, setVisible] = useState(false)

  // Mount-time visibility check — defer to client because we read
  // localStorage. Avoids SSR mismatches on first paint.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        setVisible(true)
        return
      }
      const dismissedAt = Number(raw)
      if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_TTL_MS) {
        return
      }
      setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch { /* localStorage blocked — fail silent, banner just stays */ }
    setVisible(false)
  }

  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noreferrer noopener"
      className={s.fab}
      aria-label={t("common.joinDiscord")}
    >
      <span className={s.icon}>
        <Icon icon="hugeicons:discord" />
      </span>
      <span className={s.label}>{t("common.joinDiscord")}</span>
      <button
        type="button"
        className={s.dismiss}
        onClick={handleDismiss}
        aria-label={t("common.dismiss")}
      >
        <Icon icon="hugeicons:cancel-01" />
      </button>
    </a>
  )
}
