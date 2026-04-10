"use client"

import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Link } from "@/components/link"
import { TextField } from "@/components/text-field"
import { localePath } from "@/lib/i18n"
import { register } from "@/server/actions/auth"
import { useI18n } from "@/stores/i18n"
import clsx from "clsx"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"

export default function RegisterPage() {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const audiences = [
    { title: t("auth.audienceFounders"), text: t("auth.audienceFoundersDesc") },
    { title: t("auth.audienceTeams"), text: t("auth.audienceTeamsDesc") },
    { title: t("auth.audienceDevs"), text: t("auth.audienceDevsDesc") }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await register({ name, email, password })

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false
    })

    setLoading(false)

    if (signInResult?.error) {
      toast.error(t("auth.accountCreated"))
      router.push(localePath("/login", locale))
      return
    }

    toast.success(t("auth.welcomeSetup"))
    window.location.assign(localePath("/setup", locale))
  }

  const handleOAuth = async (provider: string) => {
    await signIn(provider, { callbackUrl: "/setup" })
  }

  return (
    <section className={s.page} aria-label={t("auth.registerCardTitle")}>
      <Container>
        <div className={s.shell}>
          <div className={s.showcase}>
            <div className={s.showcaseHeader}>
              <span className={s.kicker}>{t("auth.registerKicker")}</span>
              <h1>{t("auth.registerTitle")}</h1>
              <p>{t("auth.registerSubtitle")}</p>
            </div>

            <div className={s.highlights}>
              {audiences.map((item) => (
                <div key={item.title} className={s.highlight}>
                  <div className={s.highlightTitle}>
                    <span>{item.title}</span>
                  </div>
                  <p className={s.highlightText}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div className={s.header}>
              <h1>{t("auth.registerCardTitle")}</h1>
              <p>{t("auth.registerCardDesc")}</p>
            </div>

            <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
              <TextField
                id="name"
                label={t("auth.name")}
                type="text"
                placeholder={t("auth.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />

              <TextField
                id="email"
                label={t("auth.email")}
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <TextField
                id="password"
                label={t("auth.password")}
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />

              <div className={s.submit}>
                <Button type="submit" disabled={loading}>
                  {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
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
                <Button type="button" variant="secondary" onClick={() => handleOAuth("discord")}>
                  Discord
                </Button>
              </div>

              <p className={s.footer}>
                {t("auth.alreadyHaveAccount")} <Link href="/login">{t("auth.signInLink")}</Link>
              </p>
            </form>
          </div>
        </div>
      </Container>
    </section>
  )
}
