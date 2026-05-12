import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { auth } from "@/lib/auth"
import { getServerTranslation, localeHref } from "@/lib/i18n-server"
import { prisma } from "@/lib/prisma"
import clsx from "clsx"
import { redirect } from "next/navigation"
import s from "../auth.module.scss"
import v from "./verify.module.scss"
import { DashboardRedirect } from "./dashboard-redirect"
import { ResendButton } from "./resend-button"
import { SessionRefresh } from "./session-refresh"

interface Props {
  searchParams: Promise<{ token?: string }>
}

type Status = "success" | "error" | "pending"

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams
  const { t } = await getServerTranslation()

  let status: Status = "pending"
  let message = ""

  if (token) {
    // Token in URL → user clicked their email link. Try to verify.
    status = "error"
    message = t("auth.verifyInvalidLink")

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      message = t("auth.verifyExpiredLink")
    } else if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: verificationToken.identifier, token } },
      })
      message = t("auth.verifyExpiredLink")
    } else {
      await prisma.user.update({
        where: { email: verificationToken.identifier },
        data: { emailVerified: new Date() },
      })
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: verificationToken.identifier, token } },
      })
      status = "success"
    }
  } else {
    // No token — this is the gate page reached because middleware
    // redirected an unverified user trying to reach Studio/dashboard.
    // Show a friendly "please check your email" interstitial with a
    // resend CTA. Authenticated + already-verified users shouldn't
    // even hit this branch (middleware bypasses them), but if they
    // do, route them to the dashboard.
    const session = await auth()
    if (!session?.user?.id) {
      redirect(await localeHref("/login"))
    }
    if (session?.user?.emailVerified) {
      redirect(await localeHref("/dashboard"))
    }
    status = "pending"
  }

  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={clsx(s.card, s.cardCentered)}>
            {status === "success" ? (
              <div className={v.result}>
                <SessionRefresh />
                <div className={v.iconSuccess}>
                  <Icon icon="hugeicons:checkmark-circle-03" />
                </div>
                <h1 className={v.title}>{t("auth.verifySuccessTitle")}</h1>
                <p className={v.text}>
                  {t("auth.verifySuccessBody1")}<br />
                  {t("auth.verifySuccessBody2")}
                </p>
                <div className={v.features}>
                  <div className={v.feature}>
                    <Icon icon="hugeicons:code" />
                    <span>Project</span>
                  </div>
                  <div className={v.feature}>
                    <Icon icon="hugeicons:global" />
                    <span>Flow</span>
                  </div>
                  <div className={v.feature}>
                    <Icon icon="hugeicons:megaphone-01" />
                    <span>Marketing</span>
                  </div>
                  <div className={v.feature}>
                    <Icon icon="hugeicons:shield-01" />
                    <span>Pentest</span>
                  </div>
                </div>
                <DashboardRedirect />
              </div>
            ) : status === "pending" ? (
              <div className={v.result}>
                <div className={v.iconPending}>
                  <Icon icon="hugeicons:mail-send-02" />
                </div>
                <h1 className={v.title}>{t("auth.verifyPendingTitle")}</h1>
                <p className={v.text}>
                  {t("auth.verifyPendingBody")}
                </p>
                <ResendButton />
                <p className={v.subtle}>
                  {t("auth.verifyPendingHint")}
                </p>
              </div>
            ) : (
              <div className={v.result}>
                <div className={v.iconError}>
                  <Icon icon="hugeicons:cancel-circle" />
                </div>
                <h1 className={v.title}>{t("auth.verifyFailedTitle")}</h1>
                <p className={v.text}>{message}</p>
                <Button href="/login" variant="secondary">{t("auth.backToSignIn")}</Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
