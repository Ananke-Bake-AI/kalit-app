import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "frederick.marinho@gmail.com,nico.style931@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const admin = await isAdmin(session.user.email)
  if (!admin) redirect("/dashboard")

  return session
}
