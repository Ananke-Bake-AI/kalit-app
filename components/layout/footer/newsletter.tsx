"use client"

import { Button } from "@/components/button"
import { useTranslation } from "@/stores/i18n"
import s from "./footer.module.scss"

export const Newsletter = () => {
  const t = useTranslation()

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
