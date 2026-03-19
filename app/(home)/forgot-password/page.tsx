"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { requestPasswordReset } from "@/server/actions/password"
import clsx from "clsx"
import Link from "next/link"
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

    setSent(true)
  }

  return (
    <section className={s.page}>
      <Container>
        <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <div className={s.card}>
            {sent ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                  Check your email
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
                  If an account exists for <strong>{email}</strong>, we sent a password reset link. Check your inbox and spam folder.
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
                  <div className={s.field}>
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

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
