import { auth } from "@/lib/auth"
import { localeHref } from "@/lib/i18n-server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { isAdmin: true },
  })

  return user?.isAdmin === true
}

export async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) redirect(await localeHref("/login"))

  const admin = await isAdmin(session.user.email)
  if (!admin) redirect(await localeHref("/dashboard"))

  return session
}
