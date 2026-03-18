"use client"

import { Button } from "@/components/app/button"
import { Card } from "@/components/app/card"
import { Input } from "@/components/app/input"
import { register } from "@/server/actions/auth"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

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

    // Auto sign-in after registration
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
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground font-heading">Create your account</h2>

        <Input
          id="name"
          label="Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-fg">or continue with</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => handleOAuth("google")}>
            Google
          </Button>
          <Button type="button" variant="secondary" className="flex-1" onClick={() => handleOAuth("github")}>
            GitHub
          </Button>
        </div>

        <p className="text-center text-sm text-muted-fg">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  )
}
