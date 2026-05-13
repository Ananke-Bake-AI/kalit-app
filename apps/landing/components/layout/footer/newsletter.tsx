"use client"

import { Button } from "@/components/button"
import { useTranslation } from "@/stores/i18n"
import { useSession } from "next-auth/react"
import s from "./footer.module.scss"

export const Newsletter = () => {
  const t = useTranslation()
  const { status } = useSession()

  // The "Get started / Create your account" footer CTA only makes
  // sense for anonymous visitors. Once the user is signed in, the
  // block becomes noise (they're already a member). We render
  // nothing during the auth check loading flicker too — better a
  // briefly-missing block than a "create account" pitch flashed at
  // an authenticated user.
  if (status === "authenticated" || status === "loading") return null

  return (
    <div className={s.newsletter}>
      <div className={s.left}>
        <h2>{t("footer.getStarted")}</h2>
        <p>{t("footer.getStartedDesc")}</p>
      </div>
      <Button href="/register" className={s.cta}>
        {t("footer.createAccount")}
      </Button>
    </div>
  )
}
