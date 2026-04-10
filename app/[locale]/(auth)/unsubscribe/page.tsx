"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Icon } from "@/components/icon"
import { resubscribeByToken, unsubscribeByToken } from "@/server/actions/unsubscribe"
import clsx from "clsx"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  )
}

type Status = "loading" | "done" | "already" | "resubscribed" | "error"

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const token = searchParams.get("token")
  const [status, setStatus] = useState<Status>("loading")
  const [resubLoading, setResubLoading] = useState(false)

  useEffect(() => {
    if (!email || !token) {
      setStatus("error")
      return
    }

    unsubscribeByToken(email, token).then((res) => {
      if ("error" in res) {
        setStatus("error")
        toast.error(res.error)
      } else if (res.already) {
        setStatus("already")
      } else {
        setStatus("done")
      }
    })
  }, [email, token])

  const handleResubscribe = async () => {
    if (!email || !token) return
    setResubLoading(true)
    const res = await resubscribeByToken(email, token)
    setResubLoading(false)

    if ("error" in res) {
      toast.error(res.error)
    } else {
      setStatus("resubscribed")
      toast.success("You've been re-subscribed")
    }
  }

  if (status === "loading") {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.narrow}>
            <div className={clsx(s.card, s.cardCentered)}>
              <h1 className={s.stateTitle}>Processing...</h1>
              <p className={s.stateText}>Updating your email preferences.</p>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  if (status === "error") {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.narrow}>
            <div className={clsx(s.card, s.cardCentered)}>
              <h1 className={s.stateTitle}>Invalid link</h1>
              <p className={s.stateTextSpaced}>
                This unsubscribe link is invalid. If you keep receiving unwanted emails, please contact us at support@kalit.ai.
              </p>
              <Button href="/">Go to homepage</Button>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  if (status === "resubscribed") {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.narrow}>
            <div className={clsx(s.card, s.cardCentered)}>
              <h1 className={s.stateTitle}>Welcome back!</h1>
              <p className={s.stateTextSpaced}>
                You&apos;ve been re-subscribed to Kalit emails. We&apos;re glad to have you back.
              </p>
              <Button href="/">Go to homepage</Button>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  // "done" or "already"
  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={clsx(s.card, s.cardCentered)}>
            <h1 className={s.stateTitle}>
              {status === "already" ? "Already unsubscribed" : "Unsubscribed"}
            </h1>
            <p className={s.stateTextSpaced}>
              {status === "already"
                ? "You were already unsubscribed from Kalit marketing emails."
                : "You've been unsubscribed from Kalit marketing emails. You'll still receive transactional emails like password resets and account notifications."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={handleResubscribe} disabled={resubLoading}>
                <Icon icon="hugeicons:mail-add-02" />
                {resubLoading ? "Resubscribing..." : "Re-subscribe"}
              </Button>
              <Button href="/">Go to homepage</Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
