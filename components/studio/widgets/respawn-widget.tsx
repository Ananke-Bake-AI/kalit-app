"use client"

import { useState, useEffect, useRef } from "react"
import { useI18n } from "@/stores/i18n"
import { Icon } from "@/components/icon"
import s from "./widgets.module.scss"

interface RespawnWidgetProps {
  widgetId: string
  delaySec?: number
  messageCreatedAt?: string
  onCompleted?: () => void
}

export function RespawnWidget({ delaySec = 20, messageCreatedAt, onCompleted }: RespawnWidgetProps) {
  const { t } = useI18n()
  const getInitialRemaining = () => {
    if (!messageCreatedAt) return delaySec
    const elapsed = Math.floor((Date.now() - new Date(messageCreatedAt).getTime()) / 1000)
    return Math.max(0, delaySec - elapsed)
  }

  const [remaining, setRemaining] = useState(getInitialRemaining)
  const completedRef = useRef(false)
  const alreadyExpired = getInitialRemaining() <= 0

  useEffect(() => {
    if (alreadyExpired || remaining <= 0) {
      if (!completedRef.current) {
        completedRef.current = true
        onCompleted?.()
      }
      return
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining, alreadyExpired, onCompleted])

  if (alreadyExpired || remaining <= 0) return null

  const progress = Math.max(0, Math.min(100, ((delaySec - remaining) / delaySec) * 100))

  return (
    <div className={s.cardInfo}>
      <div className={s.header}>
        <span className={s.dotInfo}>
          <Icon icon="hugeicons:refresh" className={s.spin} />
        </span>
        <span className={`${s.statusLabel} ${s.textInfo}`}>
          {t("studio.agentReturns").replace("{seconds}", String(remaining))}
        </span>
      </div>
      <div className={s.respawnTrack}>
        <div className={s.respawnFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
