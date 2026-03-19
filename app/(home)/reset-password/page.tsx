"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { resetPassword } from "@/server/actions/password"
import clsx from "clsx"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  if (!token) {
    return (
      <section className={s.page}>
        <Container>
          <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
            <div className={s.card} style={{ textAlign: "center", padding: "2rem" }}>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                Invalid link
              </h1>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                This password reset link is invalid or has expired.
              </p>
              <Button href="/forgot-password">Request a new link</Button>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    const result = await resetPassword(token, password)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <section className={s.page}>
        <Container>
          <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
            <div className={s.card} style={{ textAlign: "center", padding: "2rem" }}>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", marginBottom: "0.75rem" }}>
                Password updated
              </h1>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Button href="/login">Sign in</Button>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section className={s.page}>
      <Container>
        <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <div className={s.card}>
            <div className={s.header}>
              <h1>Set a new password</h1>
              <p>Enter your new password below.</p>
            </div>

            <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
              <div className={s.field}>
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className={s.field}>
                <label htmlFor="confirmPassword">Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className={s.submit}>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Container>
    </section>
  )
}
