"use client"

import { Button } from "@/components/button"
import { register } from "@/server/actions/auth"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import s from "../auth.module.scss"
import clsx from "clsx"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

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
      redirect: false,
    })

    setLoading(false)

    if (signInResult?.error) {
      toast.error("Account created. Please sign in.")
      router.push("/login")
      return
    }

    router.push("/setup")
    router.refresh()
  }

  const handleOAuth = async (provider: string) => {
    await signIn(provider, { callbackUrl: "/setup" })
  }

  return (
    <div className={s.card}>
      <form onSubmit={handleSubmit} className={clsx(s.form, loading && s.loading)}>
        <h2 className={s.title}>Create your account</h2>

        <div className={s.field}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

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
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div className={s.submit}>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
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
          Already have an account?{" "}
          <Link href="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
