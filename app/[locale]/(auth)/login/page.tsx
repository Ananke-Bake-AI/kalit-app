"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Logo } from "@/components/logo"
import { TextField } from "@/components/text-field"
import { SUITES } from "@/lib/suites"
import { useTranslation } from "@/stores/i18n"
import clsx from "clsx"
import { Link } from "@/components/link"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import type { CSSProperties } from "react"
import { Suspense, useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

function getSafeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard"
  }
  return raw
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"))
  const t = useTranslation()
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
      toast.error(t("auth.invalidCredentials"))
      return
    }

    toast.success(t("auth.signedIn"))
    window.location.assign(callbackUrl)
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
              <h1>{t("auth.signInTitle")}</h1>
              <p>{t("auth.signInDesc")}</p>
            </div>

            <div className={s.highlights}>
              {SUITES.map((suite) => (
                <div
                  key={suite.id}
                  className={s.highlight}
                  style={{ "--suite-color": suite.color } as CSSProperties}
                >
                  <div className={s.highlightTitle}>
                    <span className={s.highlightIcon}>
                      <Logo id={suite.id} />
                    </span>
                    <span>Kalit {suite.title}</span>
                  </div>
                  <p className={s.highlightText}>{t(`suites.${suite.id}Small`)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.header}>
              <h1>{t("auth.signIn")}</h1>
              <p>{t("auth.signInSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
              <TextField
                id="email"
                label={t("auth.email")}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <TextField
                id="password"
                label={t("auth.password")}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <p className={clsx(s.footer, s.footerInline)}>
                <Link href="/forgot-password">{t("auth.forgotPassword")}</Link>
              </p>

              <div className={s.submit}>
                <Button type="submit" disabled={loading}>
                  {loading ? t("common.loading") : t("auth.continue")}
                </Button>
              </div>

              <div className={s.divider}>
                <span>{t("auth.orContinueWith")}</span>
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
                {t("auth.noAccount")} <Link href="/register">{t("auth.createOne")}</Link>
              </p>
            </form>
          </div>
        </div>
      </Container>
    </section>
  )
}
