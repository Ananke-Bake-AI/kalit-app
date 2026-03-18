"use client"

import { Button } from "@/components/button"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"
import clsx from "clsx"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      toast.error("Invalid email or password")
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  const handleOAuth = async (provider: string) => {
    await signIn(provider, { callbackUrl })
  }

  return (
    <div className={s.card}>
      <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
        <h2 className={s.title}>Sign in to your account</h2>

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

        <div className={s.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className={s.submit}>
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>

        <div className={s.divider}>
          <span>or continue with</span>
        </div>

        <div className={s.oauth}>
          <Button type="button" variant="secondary" onClick={() => handleOAuth("google")}>
            Google
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleOAuth("github")}>
            GitHub
          </Button>
        </div>

        <p className={s.footer}>
          Don&apos;t have an account?{" "}
          <Link href="/register">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
