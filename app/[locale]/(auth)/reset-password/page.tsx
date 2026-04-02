"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { TextField } from "@/components/text-field"
import { resetPassword } from "@/server/actions/password"
import clsx from "clsx"
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
          <div className={s.narrow}>
            <div className={clsx(s.card, s.cardCentered)}>
              <h1 className={s.stateTitle}>Invalid link</h1>
              <p className={s.stateTextSpaced}>This password reset link is invalid or has expired.</p>
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

    toast.success("Password updated")
    setDone(true)
  }

  if (done) {
    return (
      <section className={s.page}>
        <Container>
          <div className={s.narrow}>
            <div className={clsx(s.card, s.cardCentered)}>
              <h1 className={s.stateTitle}>Password updated</h1>
              <p className={s.stateTextSpaced}>
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
        <div className={s.narrow}>
          <div className={s.card}>
            <div className={s.header}>
              <h1>Set a new password</h1>
              <p>Enter your new password below.</p>
            </div>

            <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
              <TextField
                id="password"
                label="New password"
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />

              <TextField
                id="confirmPassword"
                label="Confirm password"
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />

              <div className={s.submit}>
                <Button type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </div>

              <p className={s.footer}>
                <Link href="/login">Back to sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </Container>
    </section>
  )
}
