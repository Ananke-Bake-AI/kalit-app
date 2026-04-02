"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { verifyEmail } from "@/server/actions/auth"
import clsx from "clsx"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { update } = useSession()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Invalid verification link.")
      toast.error("Invalid verification link")
      return
    }

    verifyEmail(token).then(async (result) => {
      if (result.error) {
        setStatus("error")
        setMessage(result.error)
        toast.error(result.error)
      } else {
        setStatus("success")
        toast.success("Email verified")
        // Refresh the session so the banner disappears
        await update({})
      }
    })
  }, [token, update])

  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={clsx(s.card, s.cardCentered)}>
            {status === "loading" && (
              <>
                <h1 className={s.stateTitle}>Verifying...</h1>
                <p className={s.stateText}>Please wait while we verify your email.</p>
              </>
            )}
            {status === "success" && (
              <>
                <h1 className={s.stateTitle}>Email verified</h1>
                <p className={s.stateTextSpaced}>
                  Your email has been verified. You can now use all features of Kalit.
                </p>
                <Button href="/dashboard">Go to dashboard</Button>
              </>
            )}
            {status === "error" && (
              <>
                <h1 className={s.stateTitle}>Verification failed</h1>
                <p className={s.stateTextSpaced}>{message}</p>
                <Button href="/login">Back to sign in</Button>
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
