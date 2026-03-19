"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { verifyEmail } from "@/server/actions/auth"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
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
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("Invalid verification link.")
      return
    }

    verifyEmail(token).then((result) => {
      if (result.error) {
        setStatus("error")
        setMessage(result.error)
      } else {
        setStatus("success")
      }
    })
  }, [token])

  return (
    <section className={s.page}>
      <Container>
        <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <div className={s.card} style={{ textAlign: "center", padding: "2rem" }}>
            {status === "loading" && (
              <>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                  Verifying...
                </h1>
                <p style={{ color: "var(--text-secondary)" }}>Please wait while we verify your email.</p>
              </>
            )}
            {status === "success" && (
              <>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                  Email verified
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Your email has been verified. You can now use all features of Kalit.
                </p>
                <Button href="/dashboard">Go to dashboard</Button>
              </>
            )}
            {status === "error" && (
              <>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                  Verification failed
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  {message}
                </p>
                <Button href="/login">Back to sign in</Button>
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
