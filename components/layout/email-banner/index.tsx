"use client"

import { Icon } from "@/components/icon"
import { Link } from "@/components/link"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { useState } from "react"
import s from "./email-banner.module.scss"

interface EmailBannerProps {
  initialSession?: Session | null
}

export const EmailBanner = ({ initialSession = null }: EmailBannerProps) => {
  const { data: session, status } = useSession()
  const [dismissed, setDismissed] = useState(false)

  const resolved = status === "loading" ? initialSession : session

  if (dismissed) return null
  if (!resolved?.user) return null
  if (resolved.user.emailVerified) return null

  return (
    <div className={s.banner}>
      <div className={s.content}>
        <Icon icon="hugeicons:mail-send-02" />
        <span className={s.text}>
          Please verify your email address to access all features.{" "}
          <Link href="/settings/profile" className={s.link}>Verify now</Link>
        </span>
      </div>
      <button className={s.close} onClick={() => setDismissed(true)} aria-label="Dismiss">
        <Icon icon="hugeicons:cancel-01" />
      </button>
    </div>
  )
}
