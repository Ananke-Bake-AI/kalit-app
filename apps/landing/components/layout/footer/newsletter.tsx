"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { useTranslation } from "@/stores/i18n"
import { useSession } from "next-auth/react"
import s from "./footer.module.scss"

export const Newsletter = () => {
  const t = useTranslation()
  const { status } = useSession()

  // The "Get started / Create your account" CTA only makes sense for
  // anonymous visitors. Once the user is signed in, the block becomes
  // noise (they're already a member). We render nothing during the auth
  // check loading flicker too — better a briefly-missing block than a
  // "create account" pitch flashed at an authenticated user.
  if (status === "authenticated" || status === "loading") return null

  // Rendered as its own band directly ABOVE the footer (see Wrapper) —
  // self-contained section + Container so it aligns with page content.
  return (
    <section className={s.getStarted}>
      <Container>
        <div className={s.newsletter}>
          <div className={s.left}>
            <h2>{t("footer.getStarted")}</h2>
            <p>{t("footer.getStartedDesc")}</p>
          </div>
          <Button href="/register" className={s.cta}>
            {t("footer.createAccount")}
          </Button>
        </div>
      </Container>
    </section>
  )
}
