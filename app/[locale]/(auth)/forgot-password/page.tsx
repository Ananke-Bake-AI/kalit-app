"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { TextField } from "@/components/text-field"
import { requestPasswordReset } from "@/server/actions/password"
import clsx from "clsx"
import { useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await requestPasswordReset(email)

    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Check your email")
    setSent(true)
  }

  return (
    <section className={s.page}>
      <Container>
        <div className={s.narrow}>
          <div className={s.card}>
            {sent ? (
              <div className={s.stateStack}>
                <h1 className={s.stateTitle}>Check your email</h1>
                <p className={s.stateTextSpaced}>
                  If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and
                  spam folder.
                </p>
                <Button href="/login">Back to sign in</Button>
              </div>
            ) : (
              <>
                <div className={s.header}>
                  <h1>Forgot your password?</h1>
                  <p>Enter your email and we&apos;ll send you a link to reset it.</p>
                </div>

                <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
                  <TextField
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />

                  <div className={s.submit}>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Sending..." : "Send reset link"}
                    </Button>
                  </div>

                  <p className={s.footer}>
                    Remember your password? <Link href="/login">Sign in</Link>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}
