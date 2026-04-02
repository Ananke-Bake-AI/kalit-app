import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { prisma } from "@/lib/prisma"
import clsx from "clsx"
import s from "../auth.module.scss"
import v from "./verify.module.scss"
import { SessionRefresh } from "./session-refresh"
import { DashboardRedirect } from "./dashboard-redirect"

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams
  let status: "success" | "error" = "error"
  let message = "Invalid verification link."

  if (token) {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      message = "Invalid or expired verification link."
    } else if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { identifier_token: { identifier: verificationToken.identifier, token } },
      })
      message = "Verification link has expired. Please request a new one."
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
                <h1 className={v.title}>Email verified</h1>
                <p className={v.text}>
                  Your email has been successfully verified.<br />
                  You now have full access to all Kalit features.
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
            ) : (
              <div className={v.result}>
                <div className={v.iconError}>
                  <Icon icon="hugeicons:cancel-circle" />
                </div>
                <h1 className={v.title}>Verification failed</h1>
                <p className={v.text}>{message}</p>
                <Button href="/login" variant="secondary">Back to sign in</Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
