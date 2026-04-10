"use server"

import { prisma } from "@/lib/prisma"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe"

export async function unsubscribeByToken(email: string, token: string) {
  if (!email || !token) {
    return { error: "Missing email or token" }
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return { error: "Invalid or expired unsubscribe link" }
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) {
    return { error: "No account found for this email" }
  }

  if (user.emailUnsubscribed) {
    return { already: true }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailUnsubscribed: true },
  })

  return { success: true }
}

export async function resubscribeByToken(email: string, token: string) {
  if (!email || !token) {
    return { error: "Missing email or token" }
  }

  if (!verifyUnsubscribeToken(email, token)) {
    return { error: "Invalid link" }
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) {
    return { error: "No account found for this email" }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailUnsubscribed: false },
  })

  return { success: true }
}
