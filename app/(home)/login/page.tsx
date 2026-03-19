"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Logo } from "@/components/logo"
import { SUITES } from "@/lib/suites"
import clsx from "clsx"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

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
    <section className={s.page}>
      <Container>
        <div className={s.shell}>
          <div className={s.showcase}>
            <div className={s.showcaseHeader}>
              <span className={s.kicker}>Kalit</span>
              <h1>Sign in to your workspace.</h1>
              <p>Pick up where you left off across product, launch, growth, and security.</p>
            </div>

            <div className={s.highlights}>
              {SUITES.map((suite) => (
                <div key={suite.id} className={s.highlight}>
                  <div className={s.highlightTitle}>
                    <span className={s.highlightIcon} style={{ color: suite.color }}>
                      <Logo id={suite.id} />
                    </span>
                    <span>Kalit {suite.title}</span>
                  </div>
                  <p className={s.highlightText}>{suite.smallDescription}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.header}>
              <h1>Sign in</h1>
              <p>Use your email or continue with Google or GitHub.</p>
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

              <p className={s.footer} style={{ marginTop: 0, textAlign: "right" }}>
                <Link href="/forgot-password">Forgot password?</Link>
              </p>

              <div className={s.submit}>
                <Button type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Continue"}
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
                Don&apos;t have an account? <Link href="/register">Create one</Link>
              </p>
            </form>
          </div>
        </div>
      </Container>
    </section>
  )
}
