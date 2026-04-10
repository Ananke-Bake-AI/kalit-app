"use client"

import { Button } from "@/components/button"
import { useTranslation } from "@/stores/i18n"
import s from "./footer.module.scss"

export const Newsletter = () => {
  const t = useTranslation()

  return (
    <div className={s.newsletter}>
      <div className={s.left}>
        <h2>{t("footer.earlyAccess")}</h2>
        <p>{t("footer.earlyAccessDesc")}</p>
      </div>
      <form className={s.form} action="/login" method="GET">
        <input type="email" name="email" placeholder={t("footer.emailPlaceholder")} />
        <Button type="submit">{t("footer.joinWaitlist")}</Button>
      </form>
    </div>
  )
}
