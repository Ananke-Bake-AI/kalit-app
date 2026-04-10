"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isValidLocale } from "@/lib/i18n"

export async function updatePreferredLanguage(language: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Not authenticated" }
  }

  if (!isValidLocale(language)) {
    return { error: "Invalid language" }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredLanguage: language },
  })

  return { success: true }
}
